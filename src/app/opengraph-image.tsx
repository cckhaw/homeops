import { ImageResponse } from 'next/og';
import { LogoMark, LOGO_COLOR_FIXED } from '@/components/Logo';

export const alt = 'HomeOps — the digital passport for your home';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default social-share card for the site. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f5f5f7,#ffffff)', color: '#1d1d1f' }}>
        <LogoMark size={180} color={LOGO_COLOR_FIXED} />
        <div style={{ display: 'flex', marginTop: 24, fontSize: 96, fontWeight: 800, letterSpacing: -2, color: LOGO_COLOR_FIXED }}>HomeOps</div>
        <div style={{ display: 'flex', marginTop: 12, fontSize: 40, color: '#6e6e73' }}>The digital passport for your home</div>
      </div>
    ),
    { ...size },
  );
}
