import 'server-only';
import { and, eq, lt, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from '@/db';
import { rateLimits } from '@/db/schema';
import { sign } from '@/lib/security';
import { TOO_MANY, clientIpFrom, windowStartMs } from '@/lib/rate-limit-core';

export { TOO_MANY, clientIpFrom };

const keyOf = (scope: string, subject: string) => sign(`ratelimit:${scope}:${subject}`).slice(0, 40);

export async function getClientIp(): Promise<string> {
  return clientIpFrom(await headers());
}

/**
 * Counts one hit for (scope, subject) in the current fixed window and reports whether it is still within `limit`.
 * Fails OPEN: if the database is unavailable the request is allowed (rate limiting must never lock real users out).
 */
export async function rateLimit(scope: string, subject: string, limit: number, windowSec: number) {
  try {
    const start = new Date(windowStartMs(Date.now(), windowSec));
    const [row] = await db
      .insert(rateLimits)
      .values({ key: keyOf(scope, subject), windowStart: start, count: 1 })
      .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
      .returning({ count: rateLimits.count });
    const retryAfterSec = Math.max(1, Math.ceil((start.getTime() + windowSec * 1000 - Date.now()) / 1000));
    return { ok: row.count <= limit, count: row.count, retryAfterSec };
  } catch (e) {
    console.error('rate limiter unavailable (allowing request):', e instanceof Error ? e.message : e);
    return { ok: true, count: 0, retryAfterSec: 0 };
  }
}

/** Current count without incrementing (used to decide whether a CAPTCHA is needed). */
export async function peekRateLimit(scope: string, subject: string, windowSec: number): Promise<number> {
  try {
    const start = new Date(windowStartMs(Date.now(), windowSec));
    const [row] = await db.select({ count: rateLimits.count }).from(rateLimits).where(and(eq(rateLimits.key, keyOf(scope, subject)), eq(rateLimits.windowStart, start)));
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

/** Convenience: an error message if the caller is over the limit, else null. */
export async function enforce(scope: string, subject: string, limit: number, windowSec: number): Promise<string | null> {
  const r = await rateLimit(scope, subject, limit, windowSec);
  return r.ok ? null : TOO_MANY;
}

/** Same, keyed by the caller's IP address. */
export async function enforceIp(scope: string, limit: number, windowSec: number): Promise<string | null> {
  return enforce(scope, await getClientIp(), limit, windowSec);
}

/** Housekeeping: counters from finished windows are useless after a day. */
export async function purgeRateLimits() {
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(Date.now() - 2 * 86_400_000)));
}
