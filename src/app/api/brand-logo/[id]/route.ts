import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { brands } from '@/db/schema';
import { isPrivateBlobUrl, openBlob } from '@/lib/blob';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public: serves an admin-uploaded brand logo (stored in the private bucket) so it can appear on public pages too. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse(null, { status: 404 });
  const [b] = await db.select({ logoUrl: brands.logoUrl }).from(brands).where(eq(brands.id, id));
  if (!b?.logoUrl) return new NextResponse(null, { status: 404 });
  if (!isPrivateBlobUrl(b.logoUrl)) return NextResponse.redirect(b.logoUrl, 302); // a pasted external link

  const file = await openBlob(b.logoUrl).catch(() => null);
  const type = file?.blob.contentType ?? '';
  if (!file || !type.startsWith('image/')) return new NextResponse(null, { status: 404 });
  return new Response(file.stream, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
    },
  });
}
