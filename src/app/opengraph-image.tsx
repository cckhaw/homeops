import { readBrandAsset } from '@/lib/brand';
import { DEFAULT_SHARE_PNG_B64 } from '@/lib/brand-defaults';

export const dynamic = 'force-dynamic';
export const alt = 'Wodejia — the digital passport for your home';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default share image for every page without its own: the uploaded one, else the built-in card. */
export default async function Image() {
  const custom = await readBrandAsset('share');
  const body = custom ? custom.bytes : Buffer.from(DEFAULT_SHARE_PNG_B64, 'base64');
  return new Response(new Uint8Array(body), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=0, s-maxage=300, must-revalidate' } });
}
