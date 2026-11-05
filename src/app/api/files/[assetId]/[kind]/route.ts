import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { openBlob } from '@/lib/blob';
import { isMember } from '@/lib/household';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Streams an asset's receipt or manual to a signed-in member of the home that owns it. Files have no public link. */
export async function GET(_: Request, { params }: { params: Promise<{ assetId: string; kind: string }> }) {
  const { assetId, kind } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!UUID.test(assetId) || !['receipt', 'manual'].includes(kind)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));
  // Same response for "doesn't exist" and "not yours", so ids can't be probed.
  if (!asset || !(await isMember(user.id, asset.householdId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const url = kind === 'receipt' ? asset.receiptUrl : asset.manualUrl;
  if (!url) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const file = await openBlob(url).catch(() => null);
  if (!file) return NextResponse.json({ error: 'File unavailable' }, { status: 404 });
  return new Response(file.stream, {
    headers: {
      'Content-Type': file.blob.contentType || 'application/octet-stream',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    },
  });
}
