import { cn } from '@/lib/utils';

/**
 * Wodejia logo: a rounded house with a chimney and a green check that breaks out through the roof.
 *
 * Two looks:
 *  - full colour (default): navy house, green check — follows light/dark mode through the --logo-* CSS variables;
 *  - single colour: pass `color` (e.g. the user's accent inside the app) and everything is drawn in that colour.
 * `fixed` uses hard-coded colours instead of CSS variables, for places that can't read them (social images, app icons).
 */

export const LOGO_FIXED = { navy: '#1F3A6B', green: '#4FA773' } as const;
/** The brand blue used for UI accents (buttons, links) and wherever one flat colour is needed. */
export const LOGO_COLOR = 'rgb(var(--brand))';
export const LOGO_COLOR_FIXED = '#2B5BB5';

const CHECK = 'M44 68 56 80 103 25';

export function LogoMark({ size = 40, className, color, fixed, title = 'Wodejia' }: { size?: number; className?: string; color?: string; fixed?: boolean; title?: string }) {
  const navy = color ?? (fixed ? LOGO_FIXED.navy : 'rgb(var(--logo-navy))');
  const green = color ?? (fixed ? LOGO_FIXED.green : 'rgb(var(--logo-green))');
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={title} className={className}>
      <defs>
        {/* leaves a small gap where the check crosses the roof line */}
        <mask id="wj-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
          <rect width="120" height="120" fill="#fff" />
          <path d={CHECK} stroke="#000" strokeWidth="14" />
        </mask>
      </defs>
      <g mask="url(#wj-cut)" stroke={navy} strokeWidth="7">
        <path d="M8 58 27 41.5V26H40V30.5L58 14 108 58" />
        <path d="M22 52V90a10 10 0 0 0 10 10H88a10 10 0 0 0 10-10V52" />
      </g>
      <path d={CHECK} stroke={green} strokeWidth="8" />
    </svg>
  );
}

/**
 * "wodejia" wordmark in the brand typeface: "wode" in navy, "jia" in green, with one little roof over the "j" and "i".
 * Lower-case on purpose. Both letters lose their dots: the i is the dotless "ı", and the j's dot is clipped off, so the roof is the only mark above them.
 */
export function Wordmark({ size = 40, className, color, fixed }: { size?: number; className?: string; color?: string; fixed?: boolean }) {
  const navy = color ?? (fixed ? LOGO_FIXED.navy : 'rgb(var(--logo-navy))');
  const green = color ?? (fixed ? LOGO_FIXED.green : 'rgb(var(--logo-green))');
  return (
    <span
      className={cn('inline-block select-none whitespace-nowrap font-bold leading-none', className)}
      style={{ fontFamily: 'var(--font-brand), -apple-system, "SF Pro Display", sans-serif', fontSize: size, letterSpacing: '-0.02em' }}
      aria-hidden
    >
      <span style={{ color: navy }}>wode</span>
      <span style={{ color: green }}>
        <span className="relative inline-block">
          <span className="inline-block" style={{ clipPath: 'inset(0.43em -0.2em -0.5em -0.2em)' }}>j</span>
          ı
          <svg viewBox="0 0 62 26" fill="none" stroke="currentColor" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '50%', top: '0.03em', width: '0.66em', height: '0.276em', transform: 'translateX(-50%)' }}>
            <path d="M6 22 31 8 56 22" />
          </svg>
        </span>
        a
      </span>
    </span>
  );
}

/** Mark + wordmark lockup. Pass `color` for a one-colour version. */
export default function Logo({ size = 40, wordmark = true, className, color, fixed }: { size?: number; wordmark?: boolean; className?: string; color?: string; fixed?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} color={color} fixed={fixed} />
      {wordmark && <Wordmark size={size * 0.7} color={color} fixed={fixed} />}
    </span>
  );
}
