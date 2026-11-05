'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, gt } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db } from '@/db';
import { households, loginTokens, profiles } from '@/db/schema';
import {
  burnToken, createVerifiedProfile, findProfileByEmail, isEmail, issueToken, normalizeEmail, peekToken, setPassword,
} from '@/lib/accounts';
import { registerFailure, requireHousehold, requireUser } from '@/lib/auth';
import { emailConfigured, emailLayout, sendEmail } from '@/lib/email';
import { siteBaseUrl } from '@/lib/donate';
import { sendReminderDigests } from '@/lib/reminders';
import { pushConfigured } from '@/lib/push';
import { whatsappConfigured } from '@/lib/whatsapp';
import { passportCookieName, passportCookieValue } from '@/lib/passport';
import {
  decryptSecret, encryptSecret, generateRecoveryCodes, generateTotpSecret, hashCode, hashPassword, passwordPolicyError,
  totpUri, verifyPassword, verifyTotp,
} from '@/lib/security';
import { randomUUID } from 'crypto';
import { HOME_COOKIE, ensureMembership, newToken } from '@/lib/household';
import { audit } from '@/lib/audit';
import { enforce, enforceIp, getClientIp } from '@/lib/rate-limit';
import { CAPTCHA_FAILED, verifyTurnstile } from '@/lib/turnstile';
import { eraseAccount } from '@/lib/account-erase';

export type FormState = { error?: string; ok?: string } | undefined;
const str = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? '').slice(0, max);
const base = () => siteBaseUrl('http://localhost:3000');
const canManage = (role: string) => role === 'owner' || role === 'admin';

// ------------------------------------------------------------------ Registration

/**
 * With e-mail configured: sends a "finish creating your account" link (the account is only created, with its
 * password, when the owner of the address clicks it). Without e-mail: creates the account directly.
 */
export async function registerAccount(_: FormState, fd: FormData): Promise<FormState & { signIn?: boolean }> {
  const email = normalizeEmail(str(fd, 'email', 254));
  const name = str(fd, 'name', 120).trim() || null;
  if (!isEmail(email)) return { error: 'Enter a valid e-mail address.' };
  const ip = await getClientIp();
  const limited = (await enforce('register-ip', ip, 10, 3600)) ?? (await enforce('register-email', email, 3, 3600));
  if (limited) return { error: limited };
  if (!(await verifyTurnstile(fd.get('cf-turnstile-response'), ip))) return { error: CAPTCHA_FAILED };

  if (!emailConfigured()) {
    const password = str(fd, 'password', 200);
    if (password !== str(fd, 'confirm', 200)) return { error: 'The passwords do not match.' };
    const policy = passwordPolicyError(password, email);
    if (policy) return { error: policy };
    if (await findProfileByEmail(email)) return { error: 'An account with this e-mail already exists. Try signing in.' };
    await db.insert(profiles).values({ id: randomUUID(), email, fullName: name, passwordHash: await hashPassword(password), emailVerifiedAt: null });
    return { ok: 'Account created.', signIn: true };
  }

  const generic = { ok: 'If that address can be registered, we have sent an e-mail with the next step. Check your inbox.' };
  const recent = await db
    .select({ id: loginTokens.id })
    .from(loginTokens)
    .where(and(eq(loginTokens.email, email), gt(loginTokens.createdAt, new Date(Date.now() - 3_600_000))));
  if (recent.length >= 5) return generic;

  const existing = await findProfileByEmail(email);
  if (existing?.passwordHash && existing.emailVerifiedAt) {
    await sendEmail(
      email,
      'You already have a HomeOps account',
      emailLayout('You already have an account', `<p>Someone tried to register this e-mail address. If it was you, just sign in — or reset your password if you forgot it.</p>`, { label: 'Sign in', url: `${base()}/login` }),
    );
    return generic;
  }
  // New address, or an existing account that has no password yet: prove ownership, then set a password.
  const token = await issueToken(email, existing ? 'reset' : 'register', 60, name);
  await sendEmail(
    email,
    'Finish creating your HomeOps account',
    emailLayout('Welcome to HomeOps', `<p>Confirm your e-mail and choose a password (at least 12 characters). This link works once and expires in 1 hour.</p>`, { label: 'Set my password', url: `${base()}/reset-password?token=${encodeURIComponent(token)}` }),
  );
  return generic;
}

// ------------------------------------------------------------------ Forgot / reset password

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(str(fd, 'email', 254));
  if (!isEmail(email)) return { error: 'Enter a valid e-mail address.' };
  if (!emailConfigured()) return { error: 'Password reset e-mail is not set up on this site yet. Please contact the site owner.' };
  const ip = await getClientIp();
  const limited = (await enforce('reset-ip', ip, 10, 3600)) ?? (await enforce('reset-email', email, 3, 3600));
  if (limited) return { error: limited };
  if (!(await verifyTurnstile(fd.get('cf-turnstile-response'), ip))) return { error: CAPTCHA_FAILED };

  const generic = { ok: 'If an account exists for that address, we have sent a reset link. It expires in 1 hour.' };
  const recent = await db
    .select({ id: loginTokens.id })
    .from(loginTokens)
    .where(and(eq(loginTokens.email, email), gt(loginTokens.createdAt, new Date(Date.now() - 3_600_000))));
  if (recent.length >= 5) return generic;
  if (await findProfileByEmail(email)) {
    const token = await issueToken(email, 'reset', 60);
    await sendEmail(
      email,
      'Reset your HomeOps password',
      emailLayout('Reset your password', `<p>Use the button below to choose a new password. The link works once and expires in 1 hour. If you didn't ask for this, you can ignore this e-mail — your password won't change.</p>`, { label: 'Choose a new password', url: `${base()}/reset-password?token=${encodeURIComponent(token)}` }),
    );
  }
  return generic;
}

/** Final step of both "reset password" and "finish registration". */
export async function completePassword(token: string, _: FormState, fd: FormData): Promise<FormState & { done?: boolean }> {
  const row = await peekToken(token);
  if (!row) return { error: 'This link is invalid or has expired. Request a new one.' };
  const password = str(fd, 'password', 200);
  if (password !== str(fd, 'confirm', 200)) return { error: 'The passwords do not match.' };
  const policy = passwordPolicyError(password, row.email);
  if (policy) return { error: policy };

  const hash = await hashPassword(password);
  const existing = await findProfileByEmail(row.email);
  if (existing) {
    await setPassword(existing.id, hash, { verifyEmail: true });
  } else {
    const p = await createVerifiedProfile({ email: row.email, name: row.payload, passwordHash: hash });
    await ensureMembership(p.id, p.fullName);
  }
  await burnToken(row.id);
  return { ok: 'Password saved. You can sign in now.', done: true };
}

// ------------------------------------------------------------------ Signed-in account security

async function checkCurrentPassword(userId: string, password: string): Promise<boolean> {
  const [p] = await db.select().from(profiles).where(eq(profiles.id, userId));
  if (!p) return false;
  if (p.lockedUntil && p.lockedUntil > new Date()) return false;
  if (!p.passwordHash) return true; // Google-only account setting its first password
  const ok = await verifyPassword(password, p.passwordHash);
  if (!ok) await registerFailure(p);
  return ok;
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const next = str(fd, 'password', 200);
  if (next !== str(fd, 'confirm', 200)) return { error: 'The new passwords do not match.' };
  const policy = passwordPolicyError(next, user.email);
  if (policy) return { error: policy };
  if (!(await checkCurrentPassword(user.id, str(fd, 'current', 200)))) return { error: 'Your current password is incorrect (or the account is temporarily locked).' };
  await setPassword(user.id, await hashPassword(next));
  // setPassword signs every session out (including this one): send them to sign in again.
  redirect('/login?changed=1');
}

export async function beginTwoFactor(): Promise<{ error?: string; secret?: string; qr?: string }> {
  const user = await requireUser();
  if (user.totpEnabled) return { error: 'Two-factor authentication is already on.' };
  const secret = generateTotpSecret();
  await db.update(profiles).set({ totpSecret: encryptSecret(secret), totpEnabled: false }).where(eq(profiles.id, user.id));
  const qr = await QRCode.toDataURL(totpUri(secret, user.email), { margin: 1, width: 220 });
  return { secret, qr };
}

export async function confirmTwoFactor(code: string): Promise<{ error?: string; recoveryCodes?: string[] }> {
  const user = await requireUser();
  if (user.totpEnabled || !user.totpSecret) return { error: 'Start setup first.' };
  const step = verifyTotp(decryptSecret(user.totpSecret), code, null);
  if (step === null) return { error: 'That code is not correct. Check the time on your phone and try again.' };
  const { plain, hashes } = generateRecoveryCodes();
  await db.update(profiles).set({ totpEnabled: true, totpLastStep: step, recoveryCodes: JSON.stringify(hashes) }).where(eq(profiles.id, user.id));
  revalidatePath('/dashboard/settings');
  return { recoveryCodes: plain };
}

export async function disableTwoFactor(password: string, code: string): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();
  if (!user.totpEnabled || !user.totpSecret) return { error: 'Two-factor authentication is not on.' };
  if (user.passwordHash && !(await checkCurrentPassword(user.id, password))) return { error: 'Your password is incorrect.' };
  const validTotp = verifyTotp(decryptSecret(user.totpSecret), code, user.totpLastStep) !== null;
  const recovery: string[] = user.recoveryCodes ? JSON.parse(user.recoveryCodes) : [];
  if (!validTotp && !recovery.includes(hashCode(code))) return { error: 'That code is not correct.' };
  await db.update(profiles).set({ totpEnabled: false, totpSecret: null, totpLastStep: null, recoveryCodes: null }).where(eq(profiles.id, user.id));
  revalidatePath('/dashboard/settings');
  return { ok: true };
}

// ------------------------------------------------------------------ Onboarding

export async function markWelcomeSeen() {
  const user = await requireUser();
  if (!user.welcomeSeenAt) await db.update(profiles).set({ welcomeSeenAt: new Date() }).where(eq(profiles.id, user.id));
  revalidatePath('/dashboard');
}

export async function dismissChecklist() {
  const user = await requireUser();
  await db.update(profiles).set({ checklistDismissedAt: new Date() }).where(eq(profiles.id, user.id));
  revalidatePath('/dashboard');
}

/** "Replay the welcome tour" in Settings: shows the tour and the checklist again. */
export async function replayWelcome() {
  const user = await requireUser();
  await db.update(profiles).set({ welcomeSeenAt: null, checklistDismissedAt: null }).where(eq(profiles.id, user.id));
  redirect('/dashboard');
}

// ------------------------------------------------------------------ Calendar feed

/** Turn the personal .ics feed on, replace its secret link (the old one stops working), or switch it off. */
export async function setCalendarFeed(mode: 'enable' | 'regenerate' | 'disable'): Promise<FormState> {
  const user = await requireUser();
  const token = mode === 'disable' ? null : mode === 'enable' && user.calendarToken ? user.calendarToken : newToken(32);
  await db.update(profiles).set({ calendarToken: token }).where(eq(profiles.id, user.id));
  revalidatePath('/dashboard/settings');
  return { ok: mode === 'disable' ? 'Calendar link turned off.' : mode === 'regenerate' ? 'New link created. Old links no longer work.' : 'Calendar link is ready.' };
}

// ------------------------------------------------------------------ E-mail reminders

const LEAD_DAYS = [1, 2, 3, 5, 7, 14];
const WARRANTY_DAYS = [0, 14, 30, 60, 90];

export async function saveReminderSettings(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const on = fd.get('notify') === 'on';
  const lead = Number.parseInt(str(fd, 'lead', 3), 10);
  const warranty = Number.parseInt(str(fd, 'warranty', 3), 10);
  await db
    .update(profiles)
    .set({ notifyReminders: on, reminderLeadDays: LEAD_DAYS.includes(lead) ? lead : 3, warrantyLeadDays: WARRANTY_DAYS.includes(warranty) ? warranty : 30 })
    .where(eq(profiles.id, user.id));
  revalidatePath('/dashboard/settings');
  return { ok: on ? 'Reminders are on.' : 'Reminders are off.' };
}

export async function sendTestReminder(): Promise<FormState> {
  const user = await requireUser();
  const channels = [emailConfigured() && 'e-mail', pushConfigured() && 'push', whatsappConfigured() && user.notifyWhatsapp && user.whatsappVerifiedAt && 'WhatsApp'].filter(Boolean);
  if (!channels.length) return { error: 'No reminder channel is available yet: e-mail is not set up on this site, and push / WhatsApp are not turned on.' };
  const r = await sendReminderDigests({ onlyUserId: user.id, force: true });
  const via = [r.emails && 'e-mail', r.push && 'push', r.whatsapp && 'WhatsApp'].filter(Boolean).join(', ');
  return via
    ? { ok: `Sent by ${via} — ${r.tasks} task${r.tasks === 1 ? '' : 's'}, ${r.warranties} warrant${r.warranties === 1 ? 'y' : 'ies'} and ${r.documents ?? 0} document${r.documents === 1 ? '' : 's'} included.` }
    : { ok: 'Nothing is due in your reminder windows, so there was nothing to send.' };
}

// ------------------------------------------------------------------ Home Passport password

export async function setPassportPassword(_: FormState, fd: FormData): Promise<FormState> {
  const { household, role } = await requireHousehold();
  if (!canManage(role)) return { error: 'Only owners and admins can change this.' };
  const pw = str(fd, 'password', 200);
  if (pw !== str(fd, 'confirm', 200)) return { error: 'The passwords do not match.' };
  const policy = passwordPolicyError(pw);
  if (policy) return { error: policy };
  await db
    .update(households)
    .set({ passportPasswordHash: await hashPassword(pw), passportFailed: 0, passportLockedUntil: null })
    .where(eq(households.id, household.id));
  revalidatePath('/dashboard/passport');
  return { ok: 'Password set. Visitors must now enter it to view your passport.' };
}

export async function removePassportPassword() {
  const { household, role } = await requireHousehold();
  if (!canManage(role)) return;
  await db.update(households).set({ passportPasswordHash: null, passportFailed: 0, passportLockedUntil: null }).where(eq(households.id, household.id));
  revalidatePath('/dashboard/passport');
}

/** Public: visitor enters the passport password. */
export async function unlockPassport(token: string, _: FormState, fd: FormData): Promise<FormState> {
  const tooMany = await enforceIp('passport-unlock', 30, 600);
  if (tooMany) return { error: tooMany };
  const [home] = await db.select().from(households).where(eq(households.passportToken, token));
  if (!home?.passportPasswordHash) return { error: 'This passport is not available.' };
  if (home.passportLockedUntil && home.passportLockedUntil > new Date()) return { error: 'Too many attempts. Please try again in a few minutes.' };
  const ok = await verifyPassword(str(fd, 'password', 200), home.passportPasswordHash);
  if (!ok) {
    const failed = home.passportFailed + 1;
    await db
      .update(households)
      .set(failed >= 10 ? { passportFailed: 0, passportLockedUntil: new Date(Date.now() + 5 * 60_000) } : { passportFailed: failed })
      .where(eq(households.id, home.id));
    return { error: 'That password is not correct.' };
  }
  if (home.passportFailed) await db.update(households).set({ passportFailed: 0 }).where(eq(households.id, home.id));
  (await cookies()).set(passportCookieName(home.id), passportCookieValue(home), {
    path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7,
  });
  redirect(`/passport/${token}`);
}

// ------------------------------------------------------------------ Delete my account

/**
 * Permanently deletes the signed-in user's account and personal data.
 * - Homes where they are the only member are erased entirely (assets, tasks, history, invites, uploaded files).
 * - Homes shared with others are NOT destroyed: ownership passes to another member (an admin first) and only
 *   the leaving user's membership and account are removed.
 */
export async function deleteMyAccount(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (str(fd, 'confirm', 20).trim() !== 'DELETE') return { error: 'Type DELETE (in capitals) to confirm.' };
  if (user.passwordHash && !(await checkCurrentPassword(user.id, str(fd, 'password', 200)))) {
    return { error: 'Your password is incorrect (or the account is temporarily locked).' };
  }
  if (user.totpEnabled && user.totpSecret) {
    const code = str(fd, 'code', 20);
    const okTotp = verifyTotp(decryptSecret(user.totpSecret), code, user.totpLastStep) !== null;
    const recovery: string[] = user.recoveryCodes ? JSON.parse(user.recoveryCodes) : [];
    if (!okTotp && !recovery.includes(hashCode(code))) return { error: 'The authentication code is not correct.' };
  }

  await audit({ id: user.id, email: user.email }, 'account.delete', `Account ${user.email} deleted by its owner`);
  await eraseAccount(user);

  const jar = await cookies();
  for (const name of ['next-auth.session-token', '__Secure-next-auth.session-token', HOME_COOKIE]) jar.delete(name);
  redirect('/?deleted=1');
}
