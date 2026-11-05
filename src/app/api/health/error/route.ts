import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { safeEqual } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Deliberately throws, to prove error tracking works end to end. Admins, or the `x-health-key` header. */
export async function GET(req: Request) {
  const key = process.env.HEALTH_KEY;
  const given = req.headers.get('x-health-key');
  const byKey = !!key && !!given && safeEqual(given, key);
  const user = byKey ? null : await getCurrentUser();
  if (!byKey && !user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  throw new Error('Health check: deliberate test error for error monitoring');
}
