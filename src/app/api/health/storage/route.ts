import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { safeEqual } from '@/lib/security';
import { BLOB_ACCESS, blobConfigured, selfTest } from '@/lib/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * File-storage health check (write → read → delete a tiny test file).
 * Allowed for signed-in admins, or with the `x-health-key` header matching the optional HEALTH_KEY env var.
 */
export async function GET(req: Request) {
  const key = process.env.HEALTH_KEY;
  const given = req.headers.get('x-health-key');
  const byKey = !!key && !!given && safeEqual(given, key);
  const user = byKey ? null : await getCurrentUser();
  if (!byKey && !user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const r = await selfTest();
  return NextResponse.json({ configured: blobConfigured(), access: BLOB_ACCESS, ...r }, { status: r.ok ? 200 : 503 });
}
