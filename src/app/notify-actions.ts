'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles, pushSubscriptions } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { enforce } from '@/lib/rate-limit';
import { toInternational, maskPhone } from '@/lib/phone';
import { pushConfigured, sendPushToUser } from '@/lib/push';
import { CODE_TTL_MS, MAX_CODE_ATTEMPTS, codeMatches, hashCode, newCode, sendWhatsappTemplate, whatsappConfigured } from '@/lib/whatsapp';
import { getPrefs } from '@/lib/prefs';
import { LINK_TTL_MS, hashToken, linkUrl, newLinkToken, sendTelegram, telegramConfigured } from '@/lib/telegram';
import { WELCOME_TEXT } from '@/lib/telegram-core';
import { qrSvg } from '@/lib/qr';

type FormState = { error?: string; ok?: string } | undefined;
const str = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? '').trim().slice(0, max);
const B64URL = /^[A-Za-z0-9_-]{8,200}$/;

// ------------------------------------------------------------------ Web Push

/** Called by the browser after the user allows notifications. The same device can only be registered once. */
export async function savePushSubscription(input: { endpoint: string; p256dh: string; auth: string; label?: string }): Promise<FormState> {
  const user = await requireUser();
  if (!pushConfigured()) return { error: 'Push notifications are not set up on this site yet.' };
  const limited = await enforce('push-sub', user.id, 20, 3600);
  if (limited) return { error: limited };
  let url: URL;
  try {
    url = new URL(input.endpoint);
  } catch {
    return { error: 'That device could not be registered.' };
  }
  const local = process.env.NODE_ENV !== 'production' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if ((url.protocol !== 'https:' && !local) || input.endpoint.length > 2048 || !B64URL.test(input.p256dh) || !B64URL.test(input.auth)) return { error: 'That device could not be registered.' };
  const label = (input.label ?? '').replace(/[^\w .()/-]/g, '').slice(0, 60) || null;
  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth, label })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: user.id, p256dh: input.p256dh, auth: input.auth, label } });
  revalidatePath('/dashboard/settings', 'layout');
  return { ok: 'Notifications are on for this device.' };
}

export async function removePushSubscription(endpoint: string): Promise<FormState> {
  const user = await requireUser();
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, String(endpoint).slice(0, 2048))));
  revalidatePath('/dashboard/settings', 'layout');
  return { ok: 'Notifications are off for this device.' };
}

export async function removePushDevice(id: string): Promise<void> {
  const user = await requireUser();
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.id, id)));
  revalidatePath('/dashboard/settings', 'layout');
}

export async function sendTestPush(): Promise<FormState> {
  const user = await requireUser();
  if (!pushConfigured()) return { error: 'Push notifications are not set up on this site yet.' };
  const limited = await enforce('push-test', user.id, 6, 600);
  if (limited) return { error: limited };
  const r = await sendPushToUser(user.id, { title: 'Wodejia test', body: 'Push notifications are working on this device.', url: '/dashboard/settings/notifications' });
  revalidatePath('/dashboard/settings', 'layout');
  return r.sent ? { ok: `Sent to ${r.sent} device${r.sent === 1 ? '' : 's'}.` } : { error: 'No device could be reached. Turn notifications on again from this device.' };
}

// ------------------------------------------------------------------ WhatsApp

/** Step 1: send a 6-digit code to the number. Nothing is switched on until the code comes back. */
export async function startWhatsappVerification(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!whatsappConfigured()) return { error: 'WhatsApp reminders are not set up on this site yet.' };
  const { currency } = await getPrefs().catch(() => ({ currency: 'USD' }));
  const number = toInternational(str(fd, 'phone', 40), currency);
  if (!number) return { error: 'Enter the number with its country code, e.g. +60 12-345 6789.' };
  const limited = (await enforce('wa-code', user.id, 3, 3600)) ?? (await enforce('wa-code-number', number, 3, 3600));
  if (limited) return { error: limited };
  const code = newCode();
  const changed = user.whatsappNumber !== number;
  await db
    .update(profiles)
    .set({
      whatsappNumber: number,
      whatsappCodeHash: hashCode(number, code),
      whatsappCodeExpires: new Date(Date.now() + CODE_TTL_MS),
      whatsappCodeAttempts: 0,
      ...(changed ? { whatsappVerifiedAt: null, notifyWhatsapp: false } : {}),
    })
    .where(eq(profiles.id, user.id));
  if (!(await sendWhatsappTemplate(number, 'code', code))) return { error: 'We could not send the code. Check the number and try again.' };
  revalidatePath('/dashboard/settings', 'layout');
  return { ok: `Code sent to ${maskPhone(number)}. It is valid for 10 minutes.` };
}

/** Step 2: the code proves the number is theirs. Limited to 5 tries per code. */
export async function confirmWhatsapp(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const code = str(fd, 'code', 12).replace(/\D/g, '');
  if (!user.whatsappNumber || !user.whatsappCodeHash || !user.whatsappCodeExpires) return { error: 'Request a code first.' };
  if (user.whatsappCodeExpires.getTime() < Date.now()) return { error: 'That code has expired. Request a new one.' };
  if (user.whatsappCodeAttempts >= MAX_CODE_ATTEMPTS) return { error: 'Too many wrong codes. Request a new one.' };
  if (!/^\d{6}$/.test(code) || !codeMatches(user.whatsappNumber, code, user.whatsappCodeHash)) {
    await db.update(profiles).set({ whatsappCodeAttempts: user.whatsappCodeAttempts + 1 }).where(eq(profiles.id, user.id));
    return { error: 'That code is not correct.' };
  }
  await db
    .update(profiles)
    .set({ whatsappVerifiedAt: new Date(), notifyWhatsapp: true, whatsappCodeHash: null, whatsappCodeExpires: null, whatsappCodeAttempts: 0 })
    .where(eq(profiles.id, user.id));
  revalidatePath('/dashboard/settings', 'layout');
  return { ok: 'WhatsApp reminders are on.' };
}

export async function setWhatsappReminders(on: boolean): Promise<FormState> {
  const user = await requireUser();
  if (on && !user.whatsappVerifiedAt) return { error: 'Verify your number first.' };
  await db.update(profiles).set({ notifyWhatsapp: on }).where(eq(profiles.id, user.id));
  revalidatePath('/dashboard/settings', 'layout');
  return { ok: on ? 'WhatsApp reminders are on.' : 'WhatsApp reminders are off.' };
}

/** Forget the number completely. */
export async function removeWhatsapp(): Promise<FormState> {
  const user = await requireUser();
  await db
    .update(profiles)
    .set({ notifyWhatsapp: false, whatsappNumber: null, whatsappVerifiedAt: null, whatsappCodeHash: null, whatsappCodeExpires: null, whatsappCodeAttempts: 0 })
    .where(eq(profiles.id, user.id));
  revalidatePath('/dashboard/settings', 'layout');
  return { ok: 'Your number has been removed.' };
}

// ------------------------------------------------------------------ Telegram

/** Step 1: make a one-time link (valid 15 minutes). Opening it in Telegram and pressing Start connects the chat. */
export async function startTelegramLink(): Promise<{ error?: string; url?: string; qr?: string }> {
  const user = await requireUser();
  if (!telegramConfigured()) return { error: 'Telegram reminders are not set up on this site yet.' };
  const limited = await enforce('tg-link', user.id, 10, 3600);
  if (limited) return { error: limited };
  const token = newLinkToken();
  await db.update(profiles).set({ telegramLinkHash: hashToken(token), telegramLinkExpires: new Date(Date.now() + LINK_TTL_MS) }).where(eq(profiles.id, user.id));
  const url = linkUrl(token);
  return { url, qr: await qrSvg(url) }; // the QR lets a computer user scan the link with their phone
}

export async function setTelegramReminders(on: boolean): Promise<FormState> {
  const user = await requireUser();
  if (on && !user.telegramChatId) return { error: 'Connect Telegram first.' };
  await db.update(profiles).set({ notifyTelegram: on }).where(eq(profiles.id, user.id));
  revalidatePath('/dashboard/settings', 'layout');
  return { ok: on ? 'Telegram reminders are on.' : 'Telegram reminders are off.' };
}

export async function sendTestTelegram(): Promise<FormState> {
  const user = await requireUser();
  if (!telegramConfigured() || !user.telegramChatId) return { error: 'Connect Telegram first.' };
  const limited = await enforce('tg-test', user.id, 6, 600);
  if (limited) return { error: limited };
  const r = await sendTelegram(user.telegramChatId, `${WELCOME_TEXT}\n\n(This is a test message.)`);
  if (r === 'blocked') {
    await db.update(profiles).set({ telegramChatId: null, notifyTelegram: false, telegramLinkedAt: null }).where(eq(profiles.id, user.id));
    revalidatePath('/dashboard/settings', 'layout');
    return { error: 'Telegram says the chat is closed or the bot was blocked. Connect again to continue.' };
  }
  return r === 'sent' ? { ok: 'Test message sent. Check Telegram.' } : { error: 'The message could not be sent. Try again in a moment.' };
}

export async function removeTelegram(): Promise<FormState> {
  const user = await requireUser();
  await db.update(profiles).set({ notifyTelegram: false, telegramChatId: null, telegramLinkedAt: null, telegramLinkHash: null, telegramLinkExpires: null }).where(eq(profiles.id, user.id));
  revalidatePath('/dashboard/settings', 'layout');
  return { ok: 'Telegram has been disconnected.' };
}
