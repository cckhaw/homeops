import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles, type Profile } from '@/db/schema';
import { createVerifiedProfile, findProfileByEmail, isEmail, normalizeEmail } from '@/lib/accounts';
import { emailConfigured } from '@/lib/email';
import { ensureMembership, resolveHomes } from '@/lib/household';
import { decryptSecret, hashCode, verifyPassword, verifyTotp } from '@/lib/security';

export const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

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
 * INVALID, LOCKED, EMAIL_NOT_VERIFIED, TWO_FACTOR_REQUIRED, INVALID_CODE.
 */
async function authorizeCredentials(credentials: Record<'email' | 'password' | 'code', string> | undefined) {
  const email = normalizeEmail(credentials?.email ?? '');
  const password = credentials?.password ?? '';
  const code = (credentials?.code ?? '').trim();
  if (!isEmail(email) || !password) throw new Error('INVALID');

  const profile = await findProfileByEmail(email);
  if (profile?.lockedUntil && profile.lockedUntil > new Date()) {
    await verifyPassword(password, null); // keep timing similar
    throw new Error('LOCKED');
  }
  const ok = await verifyPassword(password, profile?.passwordHash);
  if (!profile || !ok) {
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
  providers: [
    // Google is optional: only registered when credentials are configured.
    ...(googleEnabled
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })]
      : []),
    CredentialsProvider({
      id: 'credentials',
      name: 'E-mail and password',
      credentials: { email: { type: 'email' }, password: { type: 'password' }, code: { type: 'text' } },
      authorize: (c) => authorizeCredentials(c as Record<'email' | 'password' | 'code', string> | undefined),
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
        if (!user.email || verified === false) return false;
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
