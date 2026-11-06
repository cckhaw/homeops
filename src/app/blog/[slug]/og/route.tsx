import { ImageResponse } from 'next/og';
import { livePostBySlug } from '@/lib/blog';
import { LogoMark, LOGO_COLOR_FIXED } from '@/components/LogoArt';

export const runtime = 'nodejs';

/**
 * Social-share / search card for an article: category, title and the Wodejia brand (1200×630 PNG).
 * Served from our own route (not Next's immutable metadata image) so editing a title refreshes the card within the hour.
 */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await livePostBySlug(slug).catch(() => null);
  const title = post?.title ?? 'The Wodejia blog';
  const category = post?.category ?? 'Home care guides';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: `linear-gradient(135deg, ${LOGO_COLOR_FIXED}, #2bb3a3)`, color: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 30, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.92 }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.18)', padding: '8px 22px', borderRadius: 999 }}>{category}</div>
        </div>
        <div style={{ display: 'flex', fontSize: title.length > 70 ? 56 : 68, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 34, fontWeight: 700 }}>
          <div style={{ display: 'flex', background: '#ffffff', borderRadius: 18, padding: 10 }}><LogoMark size={56} fixed /></div>
          Wodejia
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': post ? 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' : 'public, max-age=60' }, status: post ? 200 : 404 },
  );
}
