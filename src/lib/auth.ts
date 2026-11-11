import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import CredentialsProvider from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles, type Profile } from '@/db/schema';
import { createVerifiedProfile, findProfileByEmail, isEmail, normalizeEmail } from '@/lib/accounts';
import { emailConfigured } from '@/lib/email';
import { ensureMembership, resolveHomes } from '@/lib/household';
import { decryptSecret, hashCode, verifyPassword, verifyTotp } from '@/lib/security';
import { clientIpFrom } from '@/lib/rate-limit-core';
import { appleClientSecretFromEnv, appleConfigured } from '@/lib/apple';
import { peekRateLimit, rateLimit } from '@/lib/rate-limit';
import { turnstileEnabled, verifyTurnstile } from '@/lib/turnstile';
import { MAX_ACTIVE_SANDBOXES, activeSandboxes, createDemoSandbox, getDemoConfig, isDemoLogin } from '@/lib/demo';

export const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const appleEnabled = appleConfigured();

// Apple returns to us with a cross-site POST (response_mode=form_post), so NextAuth's short-lived login cookies must be
// allowed on cross-site requests (SameSite=None; Secure). Only needed — and only possible — over HTTPS.
const crossSite = { httpOnly: true, sameSite: 'none' as const, path: '/', secure: true };
const appleCookies =
  appleEnabled && (process.env.NEXTAUTH_URL ?? '').startsWith('https://')
    ? {
        pkceCodeVerifier: { name: '__Secure-next-auth.pkce.code_verifier', options: crossSite },
        state: { name: '__Secure-next-auth.state', options: crossSite },
        nonce: { name: '__Secure-next-auth.nonce', options: crossSite },
      }
    : undefined;

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

/** Google sign-in: the e-mail is verified by Google. */
export async function upsertProfile(input: { email: string; name?: string | null; image?: string | null }) {
  const profile = await createVerifiedProfile(input);
  if (profile.suspendedAt) return profile;
  await db.update(profiles).set({ lastLoginAt: new Date() }).where(eq(profiles.id, profile.id));
  await ensureMembership(profile.id, profile.fullName);
  return profile;
}

export async function registerFailure(p: Profile) {
  const failed = p.failedAttempts + 1;
  await db
    .update(profiles)
    .set(failed >= MAX_FAILED ? { failedAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : { failedAttempts: failed })
    .where(eq(profiles.id, p.id));
}

/**
 * Password (+ optional 2FA code) sign-in. Throws Errors whose message is a stable code the login form understands:
 * INVALID, LOCKED, RATE_LIMITED, CAPTCHA_REQUIRED, EMAIL_NOT_VERIFIED, TWO_FACTOR_REQUIRED, INVALID_CODE.
 */
async function authorizeCredentials(credentials: Record<'email' | 'password' | 'code' | 'captcha', string> | undefined, reqHeaders: Record<string, string | string[] | undefined> = {}) {
  const email = normalizeEmail(credentials?.email ?? '');
  const password = credentials?.password ?? '';
  const code = (credentials?.code ?? '').trim();
  if (!isEmail(email) || !password) throw new Error('INVALID');

  // Per-address throttle on top of the per-account lockout (which only protects accounts that exist).
  const ip = clientIpFrom(reqHeaders);
  if (!(await rateLimit('login-ip', ip, 40, 600)).ok) throw new Error('RATE_LIMITED');

  // The demo: the admin-configured e-mail and password open a private sandbox with sample data (never a real account).
  const demoCfg = await getDemoConfig();
  if (demoCfg.enabled && email === demoCfg.email && !(await findProfileByEmail(email))) {
    if (!(await isDemoLogin(email, password))) {
      await rateLimit('login-fail-ip', ip, 1_000_000, 900);
      throw new Error('INVALID');
    }
    if (!(await rateLimit('demo-create', ip, 8, 3600)).ok) throw new Error('RATE_LIMITED');
    if ((await activeSandboxes()) >= MAX_ACTIVE_SANDBOXES) throw new Error('DEMO_BUSY');
    return createDemoSandbox(demoCfg.hours);
  }

  const profile = await findProfileByEmail(email);
  if (profile?.lockedUntil && profile.lockedUntil > new Date()) {
    await verifyPassword(password, null); // keep timing similar
    throw new Error('LOCKED');
  }
  // After repeated failures (for this account or from this address) require a CAPTCHA before spending CPU on hashing.
  if (turnstileEnabled() && ((profile?.failedAttempts ?? 0) >= 3 || (await peekRateLimit('login-fail-ip', ip, 900)) >= 6)) {
    if (!(await verifyTurnstile(credentials?.captcha, ip))) throw new Error('CAPTCHA_REQUIRED');
  }
  const ok = await verifyPassword(password, profile?.passwordHash);
  if (!profile || !ok) {
    await rateLimit('login-fail-ip', ip, 1_000_000, 900); // just counts failures
    if (profile) await registerFailure(profile);
    throw new Error('INVALID');
  }
  // Correct password from here on.
  if (profile.suspendedAt) throw new Error('SUSPENDED');
  if (emailConfigured() && !profile.emailVerifiedAt) throw new Error('EMAIL_NOT_VERIFIED');

  if (profile.totpEnabled && profile.totpSecret) {
    if (!code) throw new Error('TWO_FACTOR_REQUIRED');
    const step = verifyTotp(decryptSecret(profile.totpSecret), code, profile.totpLastStep);
    if (step !== null) {
      await db.update(profiles).set({ totpLastStep: step }).where(eq(profiles.id, profile.id));
    } else {
      // Not a valid authenticator code: maybe a single-use recovery code.
      const hashes: string[] = profile.recoveryCodes ? JSON.parse(profile.recoveryCodes) : [];
      const h = hashCode(code);
      if (!hashes.includes(h)) {
        await registerFailure(profile);
        throw new Error('INVALID_CODE');
      }
      await db.update(profiles).set({ recoveryCodes: JSON.stringify(hashes.filter((x) => x !== h)) }).where(eq(profiles.id, profile.id));
    }
  }
  await db.update(profiles).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(profiles.id, profile.id));
  await ensureMembership(profile.id, profile.fullName);
  return { id: profile.id, email: profile.email, name: profile.fullName };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login', error: '/login' },
  cookies: appleCookies,
  providers: [
    // Google is optional: only registered when credentials are configured.
    ...(googleEnabled
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })]
      : []),
    // Sign in with Apple is optional too: only registered when all four Apple values are configured.
    ...(appleEnabled ? [AppleProvider({ clientId: process.env.APPLE_ID!, clientSecret: appleClientSecretFromEnv() })] : []),
    CredentialsProvider({
      id: 'credentials',
      name: 'E-mail and password',
      credentials: { email: { type: 'email' }, password: { type: 'password' }, code: { type: 'text' }, captcha: { type: 'text' } },
      authorize: (c, req) => authorizeCredentials(c as Record<'email' | 'password' | 'code' | 'captcha', string> | undefined, req?.headers as Record<string, string | string[] | undefined>),
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'apple') {
        // Both providers verify the address. Apple sends email_verified as true or the string "true".
        const verified = (profile as { email_verified?: boolean | string } | undefined)?.email_verified;
        if (!user.email || verified === false || verified === 'false') return false;
        const p = await upsertProfile({ email: user.email, name: user.name, image: user.image });
        if (p.suspendedAt) return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        // On sign-in remember the session version so password changes can revoke old sessions.
        const p = await findProfileByEmail(user.email);
        token.sv = p?.sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      session.sv = token.sv;
      return session;
    },
  },
};

/** The signed-in profile (fresh from the database), or null. */
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.email, email));
  // A password change/reset bumps sessionVersion, which signs out every older session.
  if (!profile || profile.suspendedAt || session?.sv !== profile.sessionVersion) return null;
  if (profile.isDemo && profile.demoExpiresAt && profile.demoExpiresAt < new Date()) return null; // a finished demo is signed out
  return profile;
});

export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin(): Promise<Profile> {
  const user = await requireUser();
  if (!user.isAdmin) redirect('/dashboard');
  return user;
}

/** Signed-in user plus their active home, role, and all homes they belong to. */
export const requireHousehold = cache(async () => {
  const user = await requireUser();
  const { all, active } = await resolveHomes(user.id, user.fullName);
  return { user, household: active.household, role: active.role ?? 'member', homes: all.map((m) => ({ id: m.household.id, name: m.household.name, role: m.role ?? 'member', icon: m.household.icon })) };
});
