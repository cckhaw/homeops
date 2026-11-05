import 'server-only';
import { randomUUID } from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { loginTokens, profiles, type Profile } from '@/db/schema';
import { newToken } from '@/lib/household';
import { createHash } from 'crypto';

export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
export const normalizeEmail = (e: string) => e.trim().toLowerCase();
export const isEmail = (e: string) => /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/.test(e) && e.length <= 254;

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export async function findProfileByEmail(email: string): Promise<Profile | null> {
  const [p] = await db.select().from(profiles).where(eq(profiles.email, normalizeEmail(email)));
  return p ?? null;
}

/** Creates a one-time link token (stored hashed). Returns the raw token for the e-mail link. */
export async function issueToken(email: string, purpose: 'register' | 'reset', ttlMinutes: number, payload?: string | null): Promise<string> {
  const token = newToken(32);
  await db.insert(loginTokens).values({
    email: normalizeEmail(email),
    purpose,
    payload: payload ?? null,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
  });
  return token;
}

/** Looks a token up without consuming it. */
export async function peekToken(token: string) {
  if (!token) return null;
  const [row] = await db
    .select()
    .from(loginTokens)
    .where(and(eq(loginTokens.tokenHash, hashToken(token)), gt(loginTokens.expiresAt, new Date())));
  return row ?? null;
}

export async function burnToken(id: string) {
  await db.delete(loginTokens).where(eq(loginTokens.id, id));
}

/**
 * Creates (or finds) a profile whose e-mail ownership is already proven (clicked an e-mailed link, or Google).
 * Promotes to admin only for ADMIN_EMAILS — which is safe precisely because the e-mail is verified.
 */
export async function createVerifiedProfile(input: { email: string; name?: string | null; image?: string | null; passwordHash?: string | null }): Promise<Profile> {
  const email = normalizeEmail(input.email);
  const admin = adminEmails().includes(email);
  const existing = await findProfileByEmail(email);
  if (existing) {
    const patch: Partial<Profile> = {};
    if (!existing.emailVerifiedAt) {
      patch.emailVerifiedAt = new Date();
      // Anything set while the address was unverified (e.g. a password) was not set by the owner: discard it.
      patch.passwordHash = input.passwordHash ?? null;
      patch.totpEnabled = false;
      patch.totpSecret = null;
      patch.recoveryCodes = null;
      patch.sessionVersion = existing.sessionVersion + 1;
    }
    if (!existing.fullName && input.name) patch.fullName = input.name;
    if (!existing.avatarUrl && input.image) patch.avatarUrl = input.image;
    if (admin && !existing.isAdmin) patch.isAdmin = true;
    if (!Object.keys(patch).length) return existing;
    const [p] = await db.update(profiles).set(patch).where(eq(profiles.id, existing.id)).returning();
    return p;
  }
  const [p] = await db
    .insert(profiles)
    .values({
      id: randomUUID(),
      email,
      fullName: input.name ?? null,
      avatarUrl: input.image ?? null,
      passwordHash: input.passwordHash ?? null,
      emailVerifiedAt: new Date(),
      isAdmin: admin,
    })
    .returning();
  return p;
}

/** Sets a new password, signs out every existing session and clears lockouts. */
export async function setPassword(userId: string, passwordHash: string, opts?: { verifyEmail?: boolean }) {
  const [cur] = await db.select().from(profiles).where(eq(profiles.id, userId));
  if (!cur) return;
  await db
    .update(profiles)
    .set({
      passwordHash,
      sessionVersion: cur.sessionVersion + 1,
      failedAttempts: 0,
      lockedUntil: null,
      ...(opts?.verifyEmail && !cur.emailVerifiedAt ? { emailVerifiedAt: new Date() } : {}),
      ...(opts?.verifyEmail && adminEmails().includes(cur.email) ? { isAdmin: true } : {}),
    })
    .where(eq(profiles.id, userId));
}
