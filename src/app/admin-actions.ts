'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { errorLog, profiles } from '@/db/schema';
import { issueToken } from '@/lib/accounts';
import { eraseAccount } from '@/lib/account-erase';
import { audit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { siteBaseUrl } from '@/lib/donate';
import { emailConfigured, emailLayout, sendEmail } from '@/lib/email';

export type AdminState = { error?: string; ok?: string } | undefined;

async function target(admin: { id: string }, userId: string, opts: { allowSelf?: boolean } = {}) {
  const [u] = await db.select().from(profiles).where(eq(profiles.id, userId));
  if (!u) return { error: 'That user no longer exists.' as const };
  if (u.id === admin.id && !opts.allowSelf) return { error: 'You cannot do that to your own account here.' as const };
  return { user: u };
}

const done = (userId: string, ok: string): AdminState => {
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/admin/users');
  revalidatePath('/admin/audit');
  return { ok };
};

/** Clears failed-attempt counters and any temporary lockout. */
export async function adminUnlockUser(userId: string): Promise<AdminState> {
  const admin = await requireAdmin();
  const t = await target(admin, userId, { allowSelf: true });
  if ('error' in t) return t;
  await db.update(profiles).set({ failedAttempts: 0, lockedUntil: null }).where(eq(profiles.id, userId));
  await audit(admin, 'user.unlock', `Unlocked ${t.user.email}`);
  return done(userId, 'Account unlocked.');
}

/** Ends every session of the user (they must sign in again). */
export async function adminSignOutUser(userId: string): Promise<AdminState> {
  const admin = await requireAdmin();
  const t = await target(admin, userId, { allowSelf: true });
  if ('error' in t) return t;
  await db.update(profiles).set({ sessionVersion: t.user.sessionVersion + 1 }).where(eq(profiles.id, userId));
  await audit(admin, 'user.signout', `Signed ${t.user.email} out everywhere`);
  return done(userId, 'All sessions ended.');
}

/** Sends the user a password-reset e-mail (the admin never sees or sets the password). */
export async function adminSendReset(userId: string): Promise<AdminState> {
  const admin = await requireAdmin();
  if (!emailConfigured()) return { error: 'E-mail is not configured on this site.' };
  const t = await target(admin, userId, { allowSelf: true });
  if ('error' in t) return t;
  const token = await issueToken(t.user.email, 'reset', 60);
  const ok = await sendEmail(
    t.user.email,
    'Reset your HomeOps password',
    emailLayout('Reset your password', '<p>A HomeOps administrator sent you a link to choose a new password. It works once and expires in 1 hour.</p>', {
      label: 'Choose a new password',
      url: `${siteBaseUrl('http://localhost:3000')}/reset-password?token=${encodeURIComponent(token)}`,
    }),
  );
  if (!ok) return { error: 'The e-mail could not be sent.' };
  await audit(admin, 'user.reset_sent', `Sent a password-reset e-mail to ${t.user.email}`);
  return done(userId, `Reset e-mail sent to ${t.user.email}.`);
}

/** Suspends (blocks sign-in and ends sessions) or reinstates an account. */
export async function adminSetSuspended(userId: string, suspend: boolean): Promise<AdminState> {
  const admin = await requireAdmin();
  const t = await target(admin, userId);
  if ('error' in t) return t;
  if (suspend && t.user.isAdmin) return { error: 'Remove their admin role before suspending them.' };
  await db
    .update(profiles)
    .set(suspend ? { suspendedAt: new Date(), sessionVersion: t.user.sessionVersion + 1 } : { suspendedAt: null })
    .where(eq(profiles.id, userId));
  await audit(admin, suspend ? 'user.suspend' : 'user.unsuspend', `${suspend ? 'Suspended' : 'Reinstated'} ${t.user.email}`);
  return done(userId, suspend ? 'Account suspended.' : 'Account reinstated.');
}

/** Permanently deletes an account. Requires typing the user's e-mail; admins must be demoted first. */
export async function adminDeleteUser(userId: string, _: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const t = await target(admin, userId);
  if ('error' in t) return t;
  if (t.user.isAdmin) return { error: 'Remove their admin role before deleting the account.' };
  if (String(fd.get('confirm') ?? '').trim().toLowerCase() !== t.user.email) return { error: 'Type the user’s e-mail address to confirm.' };
  await audit(admin, 'user.delete', `Deleted account ${t.user.email}`);
  await eraseAccount(t.user);
  revalidatePath('/admin/users');
  revalidatePath('/admin/audit');
  // The user's page no longer exists: go back to the list with a confirmation.
  redirect(`/admin/users?deleted=${encodeURIComponent(t.user.email)}`);
}

// ------------------------------------------------------------------ Error log

export async function resolveError(id: string) {
  await requireAdmin();
  await db.update(errorLog).set({ resolvedAt: new Date() }).where(eq(errorLog.id, id));
  revalidatePath('/admin/errors');
  revalidatePath('/admin');
}

export async function reopenError(id: string) {
  await requireAdmin();
  await db.update(errorLog).set({ resolvedAt: null }).where(eq(errorLog.id, id));
  revalidatePath('/admin/errors');
  revalidatePath('/admin');
}

export async function clearResolvedErrors() {
  const admin = await requireAdmin();
  await db.delete(errorLog).where(and(isNotNull(errorLog.resolvedAt)));
  await audit(admin, 'errors.clear', 'Cleared resolved errors from the log');
  revalidatePath('/admin/errors');
}
