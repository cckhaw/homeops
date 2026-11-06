import { ImageResponse } from 'next/og';
import { LogoMark } from '@/components/Logo';

export const runtime = 'edge';

/** App icons (apple-touch, PWA 192/512). White tile with the mark; mark sits inside the maskable safe zone. */
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const size = [180, 192, 512].includes(Number(sizeParam)) ? Number(sizeParam) : 512;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <LogoMark size={Math.round(size * 0.66)} fixed />
      </div>
    ),
    { width: size, height: size },
  );
}
