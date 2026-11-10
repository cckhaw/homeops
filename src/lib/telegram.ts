import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { LINK_TTL_MS, hashToken, newLinkToken } from './telegram-core';

/**
 * Telegram bot (https://core.telegram.org/bots/api): free, no business verification. Needs three settings:
 *   TELEGRAM_BOT_TOKEN       from @BotFather
 *   TELEGRAM_BOT_USERNAME    the bot's @name without the @
 *   TELEGRAM_WEBHOOK_SECRET  a random string you choose (A–Z a–z 0–9 _ -, up to 256 characters)
 * then press "Register webhook" in Admin → Site config. TELEGRAM_API_URL is only for tests.
 */
export const telegramConfigured = () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME && process.env.TELEGRAM_WEBHOOK_SECRET);
const api = () => process.env.TELEGRAM_API_URL ?? 'https://api.telegram.org';

export type TgResult = { ok: boolean; status: number; description?: string; result?: unknown };

export async function telegramCall(method: string, body: Record<string, unknown>): Promise<TgResult> {
  if (!telegramConfigured()) return { ok: false, status: 0, description: 'not configured' };
  try {
    const res = await fetch(`${api()}/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; result?: unknown };
    return { ok: !!json.ok && res.ok, status: res.status, description: json.description, result: json.result };
  } catch (e) {
    console.error('Telegram request failed', method, e instanceof Error ? e.message : e);
    return { ok: false, status: 0, description: 'network error' };
  }
}

/** 'blocked' means the person blocked the bot or deleted the chat: stop messaging them. */
export async function sendTelegram(chatId: string, html: string): Promise<'sent' | 'blocked' | 'failed'> {
  const r = await telegramCall('sendMessage', { chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true });
  if (r.ok) return 'sent';
  return r.status === 403 || (r.status === 400 && /chat not found/i.test(r.description ?? '')) ? 'blocked' : 'failed';
}

export const linkUrl = (token: string) => `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${token}`;
export const secretMatches = (given: string | null) => {
  const want = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
  if (!want || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
};
export { LINK_TTL_MS, hashToken, newLinkToken };
