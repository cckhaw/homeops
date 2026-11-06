import { NextResponse } from 'next/server';
import { isBrandKind } from '@/lib/brand-core';
import { readBrandAsset } from '@/lib/brand';

export const dynamic = 'force-dynamic';

const FALLBACK = { logo: '/brand/wodejia-logo-horizontal.png', icon: '/brand/wodejia-icon-1024.png', share: '/opengraph-image' } as const;

/** The uploaded logo / icon / share image. Cached for a year when the URL carries ?v=<rev> (the rev changes on every upload). */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isBrandKind(kind)) return new NextResponse('Not found', { status: 404 });
  const asset = await readBrandAsset(kind);
  if (!asset) return NextResponse.redirect(new URL(FALLBACK[kind], req.url), 302);
  const versioned = new URL(req.url).searchParams.get('v') === asset.rev;
  return new NextResponse(new Uint8Array(asset.bytes), {
    headers: {
      'Content-Type': asset.contentType,
      'Content-Length': String(asset.bytes.length),
      'Cache-Control': versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=0, s-maxage=60, must-revalidate',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
