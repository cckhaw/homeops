import { NextResponse } from 'next/server';
import { readBrandAsset } from '@/lib/brand';
import { DEFAULT_FAVICON_ICO_B64 } from '@/lib/brand-defaults';

export const dynamic = 'force-dynamic';

/** Browsers and crawlers always ask for /favicon.ico, so it follows the uploaded icon too. */
export async function GET() {
  const icon = await readBrandAsset('icon');
  const headers = { 'Cache-Control': 'public, max-age=0, s-maxage=300, must-revalidate' };
  if (icon) return new NextResponse(new Uint8Array(icon.bytes), { headers: { ...headers, 'Content-Type': icon.contentType } });
  return new NextResponse(Buffer.from(DEFAULT_FAVICON_ICO_B64, 'base64'), { headers: { ...headers, 'Content-Type': 'image/x-icon' } });
}
