'use server';

import { audit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { siteBaseUrl } from '@/lib/donate';
import { telegramCall, telegramConfigured } from '@/lib/telegram';

export type TelegramAdminResult = { ok: boolean; message: string; url?: string };

const webhookUrl = () => `${siteBaseUrl('http://localhost:3000')}/api/telegram/webhook`;

/** Admin-only: tells Telegram where to send messages for the bot (with the secret it must echo back). */
export async function registerTelegramWebhook(): Promise<TelegramAdminResult> {
  const admin = await requireAdmin();
  if (!telegramConfigured()) return { ok: false, message: 'Set TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME and TELEGRAM_WEBHOOK_SECRET in the environment and redeploy first.' };
  const url = webhookUrl();
  if (!/^https:\/\//.test(url) && process.env.NODE_ENV === 'production') return { ok: false, message: `Telegram needs an https address; this site's address is ${url}. Set NEXTAUTH_URL to your main domain.` };
  const r = await telegramCall('setWebhook', { url, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['message'], drop_pending_updates: true });
  await audit(admin, 'telegram.webhook', r.ok ? `Registered Telegram webhook at ${url}` : `Telegram webhook failed: ${r.description ?? r.status}`);
  return r.ok ? { ok: true, message: 'Webhook registered. Connecting Telegram from Settings now works.', url } : { ok: false, message: `Telegram refused: ${r.description ?? 'unknown error'}.` };
}

export async function checkTelegramWebhook(): Promise<TelegramAdminResult> {
  await requireAdmin();
  if (!telegramConfigured()) return { ok: false, message: 'Telegram is not configured (token, username and webhook secret).' };
  const r = await telegramCall('getWebhookInfo', {});
  const info = (r.result ?? {}) as { url?: string; last_error_message?: string; pending_update_count?: number };
  if (!r.ok) return { ok: false, message: `Telegram refused: ${r.description ?? 'unknown error'}.` };
  const expected = webhookUrl();
  if (info.url !== expected) return { ok: false, message: info.url ? `The webhook points to ${info.url}, not ${expected}. Press Register webhook.` : 'No webhook is registered yet. Press Register webhook.', url: info.url };
  return { ok: !info.last_error_message, message: info.last_error_message ? `Registered, but Telegram reported: ${info.last_error_message}` : `Registered and healthy (${info.pending_update_count ?? 0} waiting).`, url: info.url };
}
