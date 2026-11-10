import { NextResponse } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { EXPIRED_TEXT, HELP_TEXT, STOPPED_TEXT, WELCOME_TEXT, hashToken, isLinkToken, parseCommand } from '@/lib/telegram-core';
import { secretMatches, sendTelegram, telegramConfigured } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Update = { message?: { text?: string; chat?: { id?: number | string; type?: string } } };

/**
 * Telegram calls this for every message sent to the bot. The secret header proves the call came from Telegram.
 * "/start <token>" links the chat to the Wodejia account that created the one-time token; "/stop" turns reminders off.
 * Always answers 200 once the request is authentic (Telegram retries anything else).
 */
export async function POST(req: Request) {
  if (!telegramConfigured() || !secretMatches(req.headers.get('x-telegram-bot-api-secret-token'))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const update = (await req.json().catch(() => ({}))) as Update;
  const msg = update.message;
  const chatId = msg?.chat?.id != null ? String(msg.chat.id) : '';
  if (!chatId || msg?.chat?.type !== 'private') return NextResponse.json({ ok: true }); // groups and channels are ignored
  const cmd = parseCommand(msg.text);

  if (cmd?.cmd === 'start' && cmd.arg) {
    const [user] = isLinkToken(cmd.arg)
      ? await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.telegramLinkHash, hashToken(cmd.arg)), gt(profiles.telegramLinkExpires, new Date())))
      : [];
    if (!user) {
      await sendTelegram(chatId, EXPIRED_TEXT);
      return NextResponse.json({ ok: true });
    }
    // one chat belongs to one account; a token works once
    await db.update(profiles).set({ telegramChatId: null, notifyTelegram: false }).where(eq(profiles.telegramChatId, chatId));
    await db.update(profiles).set({ telegramChatId: chatId, telegramLinkedAt: new Date(), notifyTelegram: true, telegramLinkHash: null, telegramLinkExpires: null }).where(eq(profiles.id, user.id));
    await sendTelegram(chatId, WELCOME_TEXT);
  } else if (cmd?.cmd === 'stop') {
    await db.update(profiles).set({ notifyTelegram: false }).where(eq(profiles.telegramChatId, chatId));
    await sendTelegram(chatId, STOPPED_TEXT);
  } else {
    await sendTelegram(chatId, HELP_TEXT);
  }
  return NextResponse.json({ ok: true });
}
