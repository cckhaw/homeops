import { createHash, randomBytes } from 'node:crypto';
import type { DigestItem } from './digest-core';

/** Telegram pieces that need no network: link tokens, command parsing and the message text. Unit-tested. */
export const LINK_TTL_MS = 15 * 60_000;

export const newLinkToken = () => randomBytes(18).toString('base64url'); // 24 URL-safe characters (Telegram allows up to 64 in /start payloads)
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
export const isLinkToken = (t: string) => /^[A-Za-z0-9_-]{16,64}$/.test(t);

/** "/start abc" or "/start@WodejiaBot abc" → { cmd: 'start', arg: 'abc' }. Anything that is not a command → null. */
export function parseCommand(text: string | undefined): { cmd: string; arg: string } | null {
  const m = /^\/([a-z_]+)(?:@\w+)?(?:\s+(\S+))?/i.exec((text ?? '').trim());
  return m ? { cmd: m[1].toLowerCase(), arg: m[2] ?? '' } : null;
}

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ICON = { task: '🔧', warranty: '🛡️', document: '📄' } as const;

/** The daily digest as a Telegram message (HTML parse mode), cut to Telegram's 4096-character limit. */
export function telegramDigest(items: DigestItem[], base: string): string {
  const multi = new Set(items.map((i) => i.home).filter(Boolean)).size > 1;
  const lines = items.slice(0, 15).map((i) => `${ICON[i.kind]} ${escapeHtml(i.title)}${i.kind === 'warranty' ? ' (warranty)' : ''}: ${escapeHtml(i.when)}${multi && i.home ? ` [${escapeHtml(i.home)}]` : ''}`);
  const more = items.length > 15 ? `\n+${items.length - 15} more` : '';
  const text = `<b>Wodejia: ${items.length} thing${items.length === 1 ? '' : 's'} need${items.length === 1 ? 's' : ''} your attention</b>\n\n${lines.join('\n')}${more}\n\n<a href="${escapeHtml(base)}/dashboard/schedule">Open Wodejia</a>`;
  return text.slice(0, 4000);
}

export const WELCOME_TEXT = '✅ Telegram is connected. Wodejia will send your reminders here. Send /stop any time to turn them off.';
export const HELP_TEXT = 'This is the Wodejia reminder bot. To connect it, open Wodejia → Settings → Notifications → Telegram and press “Connect Telegram”. Send /stop to turn reminders off.';
export const EXPIRED_TEXT = 'That connect link has expired or was already used. In Wodejia, open Settings → Notifications → Telegram and press “Connect Telegram” for a new one.';
export const STOPPED_TEXT = 'Reminders on Telegram are off. You can turn them back on in Wodejia → Settings → Notifications.';
