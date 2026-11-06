import { ImageResponse } from 'next/og';
import { LogoMark } from '@/components/LogoArt';
import { readBrandAsset } from '@/lib/brand';

export const dynamic = 'force-dynamic';

/** App icons (apple-touch, PWA 192/512). Uploaded icon if any; otherwise a white tile with the mark inside the maskable safe zone. */
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const size = [180, 192, 512].includes(Number(sizeParam)) ? Number(sizeParam) : 512;
  const custom = await readBrandAsset('icon');
  const headers = { 'Cache-Control': 'public, max-age=0, s-maxage=300, must-revalidate' };
  if (custom) {
    const src = `data:${custom.contentType};base64,${custom.bytes.toString('base64')}`;
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', background: '#ffffff' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} width={size} height={size} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />
        </div>
      ),
      { width: size, height: size, headers },
    );
  }
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <LogoMark size={Math.round(size * 0.66)} fixed />
      </div>
    ),
    { width: size, height: size, headers },
  );
}
