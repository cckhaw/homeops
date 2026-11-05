import { ImageResponse } from 'next/og';
import { LogoMark, LOGO_COLOR_FIXED } from '@/components/Logo';

export const runtime = 'edge';

/** App icons (apple-touch, PWA 192/512). White tile with the mark; mark sits inside the maskable safe zone. */
export function GET(_: Request, { params }: { params: { size: string } }) {
  const size = [180, 192, 512].includes(Number(params.size)) ? Number(params.size) : 512;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <LogoMark size={Math.round(size * 0.62)} color={LOGO_COLOR_FIXED} />
      </div>
    ),
    { width: size, height: size },
  );
}
