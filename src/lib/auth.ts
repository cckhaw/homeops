import 'server-only';
import { cache } from 'react';
import { createHash, randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { loginTokens, profiles, type Profile } from '@/db/schema';
import { ensureMembership } from '@/lib/household';

export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Creates or updates the profile for a verified e-mail, and makes sure it has a household. */
export async function upsertProfile(input: { email: string; name?: string | null; image?: string | null }) {
  const email = input.email.trim().toLowerCase();
  const shouldBeAdmin = adminEmails().includes(email);
  const [existing] = await db.select().from(profiles).where(eq(profiles.email, email));
  let profile: Profile;
  if (existing) {
    const patch: Partial<Profile> = {};
    if (!existing.fullName && input.name) patch.fullName = input.name;
    if (!existing.avatarUrl && input.image) patch.avatarUrl = input.image;
    if (shouldBeAdmin && !existing.isAdmin) patch.isAdmin = true;
    if (Object.keys(patch).length) {
      [profile] = await db.update(profiles).set(patch).where(eq(profiles.id, existing.id)).returning();
    } else {
      profile = existing;
    }
  } else {
    [profile] = await db
      .insert(profiles)
      .values({
        id: randomUUID(),
        email,
        fullName: input.name ?? null,
        avatarUrl: input.image ?? null,
        isAdmin: shouldBeAdmin,
      })
      .returning();
  }
  await ensureMembership(profile.id, profile.fullName);
  return profile;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      id: 'magic-link',
      name: 'Magic link',
      credentials: { token: { label: 'Token', type: 'text' } },
      async authorize(credentials) {
        const token = credentials?.token;
        if (!token) return null;
        const hash = hashToken(token);
        const [row] = await db
          .select()
          .from(loginTokens)
          .where(and(eq(loginTokens.tokenHash, hash), gt(loginTokens.expiresAt, new Date())));
        if (!row) return null;
        await db.delete(loginTokens).where(eq(loginTokens.id, row.id)); // single use
        const profile = await upsertProfile({ email: row.email });
        return { id: profile.id, email: profile.email, name: profile.fullName };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        if (!user.email) return false;
        await upsertProfile({ email: user.email, name: user.name, image: user.image });
      }
      return true;
    },
    async jwt({ token }) {
      return token;
    },
  },
};

/** The signed-in profile (fresh from the database), or null. */
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.email, email));
  return profile ?? null;
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

/** Signed-in user plus their active household and role. */
export const requireHousehold = cache(async () => {
  const user = await requireUser();
  const m = await ensureMembership(user.id, user.fullName);
  return { user, household: m.household, role: m.role ?? 'member' };
});
