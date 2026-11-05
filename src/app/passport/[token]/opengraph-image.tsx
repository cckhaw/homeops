import { ImageResponse } from 'next/og';
import { LogoMark, LOGO_COLOR_FIXED } from '@/components/Logo';
import { findPassportHome, isPassportUnlocked, loadPassport } from '@/lib/passport';

export const alt = 'Home Service Passport';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

/**
 * Share card for a Home Passport link. Password-protected passports (and unknown links) get a generic card:
 * the home's name and figures are only drawn when the passport is public.
 */
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const home = await findPassportHome(token);
  const open = home && (await isPassportUnlocked(home));
  const data = open ? await loadPassport(token) : null;
  const title = data?.home.name ?? 'Home Service Passport';
  const stats = data ? [`${data.stats.assets} assets`, `${data.stats.completed} check-ups done`, data.stats.overall == null ? null : `${data.stats.overall}/100 health`].filter(Boolean) as string[] : [];

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f5f5f7,#ffffff)', color: '#1d1d1f', padding: 60 }}>
        <LogoMark size={150} color={LOGO_COLOR_FIXED} />
        <div style={{ display: 'flex', marginTop: 20, fontSize: 30, fontWeight: 700, color: LOGO_COLOR_FIXED, letterSpacing: 4 }}>HOME SERVICE PASSPORT</div>
        <div style={{ display: 'flex', marginTop: 16, fontSize: 72, fontWeight: 800, textAlign: 'center' }}>{title.slice(0, 40)}</div>
        {stats.length > 0 && <div style={{ display: 'flex', marginTop: 20, fontSize: 36, color: '#6e6e73' }}>{stats.join('  ·  ')}</div>}
      </div>
    ),
    { ...size },
  );
}
