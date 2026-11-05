import { NextResponse } from 'next/server';
import { sendReminderDigests } from '@/lib/reminders';
import { purgeRateLimits } from '@/lib/rate-limit';
import { db } from '@/db';
import { contractorHomes, contractors, errorLog } from '@/db/schema';
import { and, isNotNull, lt, notInArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** Called daily by Vercel Cron (vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await sendReminderDigests();
  // Daily housekeeping: finished rate-limit windows, and resolved errors older than 30 days.
  await purgeRateLimits().catch(() => {});
  // Contractors whose every home has been deleted are orphans.
  await db.delete(contractors).where(notInArray(contractors.id, db.select({ id: contractorHomes.contractorId }).from(contractorHomes))).catch(() => {});
  await db.delete(errorLog).where(and(isNotNull(errorLog.resolvedAt), lt(errorLog.resolvedAt, new Date(Date.now() - 30 * 86_400_000)))).catch(() => {});
  return NextResponse.json(result);
}
