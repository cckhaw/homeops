import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { newsletterSubscribers } from '@/db/schema';
import { readLink } from '@/lib/newsletter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** One-click unsubscribe used by the "Unsubscribe" button that Gmail / Apple Mail show next to the sender (RFC 8058). */
export async function POST(req: Request) {
  const t = readLink(new URL(req.url).searchParams.get('t'));
  if (!t || t.kind !== 'unsub') return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  await db.update(newsletterSubscribers).set({ status: 'unsubscribed', unsubscribedAt: new Date() }).where(eq(newsletterSubscribers.email, t.email));
  return NextResponse.json({ ok: true });
}

/** Someone opening the link in a browser gets the normal page (with a button), never an unsubscribe by accident. */
export async function GET(req: Request) {
  return NextResponse.redirect(new URL(`/newsletter/unsubscribe?t=${encodeURIComponent(new URL(req.url).searchParams.get('t') ?? '')}`, req.url), 303);
}
