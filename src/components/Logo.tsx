import { cn } from '@/lib/utils';

/**
 * Wodejia logo: a rounded house (with a chimney) around a soft-blue heart-shield, and a green check that breaks out through the roof.
 *
 * Two looks:
 *  - full colour (default): navy outline, sky-blue heart, green check — follows light/dark mode through the --logo-* CSS variables;
 *  - single colour: pass `color` (e.g. the user's accent inside the app) and everything is drawn in that colour.
 * `fixed` uses hard-coded colours instead of CSS variables, for places that can't read them (social images, app icons).
 */

export const LOGO_FIXED = { navy: '#1F3A6B', green: '#4FA773', sky1: '#B4D8FF', sky2: '#5B9DF0' } as const;
/** The brand blue used for UI accents (buttons, links) and wherever one flat colour is needed. */
export const LOGO_COLOR = 'rgb(var(--brand))';
export const LOGO_COLOR_FIXED = '#2B5BB5';

const CHECK = 'M44 68 56 80 103 25';

export function LogoMark({ size = 40, className, color, fixed, title = 'Wodejia' }: { size?: number; className?: string; color?: string; fixed?: boolean; title?: string }) {
  const mono = color;
  const navy = mono ?? (fixed ? LOGO_FIXED.navy : 'rgb(var(--logo-navy))');
  const green = mono ?? (fixed ? LOGO_FIXED.green : 'rgb(var(--logo-green))');
  const s1 = fixed ? LOGO_FIXED.sky1 : 'rgb(var(--logo-sky1))';
  const s2 = fixed ? LOGO_FIXED.sky2 : 'rgb(var(--logo-sky2))';
  // The same ids may appear several times on a page; identical definitions make that harmless.
  const sfx = fixed ? 'f' : 'v';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={title} className={className}>
      <defs>
        <linearGradient id={`wj-heart-${sfx}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s1} />
          <stop offset="1" stopColor={s2} />
        </linearGradient>
        <mask id="wj-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
          <rect width="120" height="120" fill="#fff" />
          <path d={CHECK} stroke="#000" strokeWidth="14" />
        </mask>
      </defs>
      <g mask="url(#wj-cut)" stroke={navy} strokeWidth="7">
        <path d="M8 58 27 41.5V26H40V30.5L58 14 108 58" />
        <path d="M22 52V90a10 10 0 0 0 10 10H88a10 10 0 0 0 10-10V52" />
      </g>
      <path d="M60 94C37 78 33 63 41 55c7-6 15-3 19 4 4-7 12-10 19-4 8 8 4 23-19 39Z" fill={mono ?? `url(#wj-heart-${sfx})`} fillOpacity={mono ? 0.28 : 1} stroke="none" />
      <path d={CHECK} stroke={green} strokeWidth="8" />
    </svg>
  );
}

/**
 * "wodejia" wordmark in the brand typeface: "wode" in navy, "jia" in green, and a little roof in place of the i's dot.
 * Lower-case on purpose; the i is the dotless "ı" so the roof is the only mark above it.
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
        j
        <span className="relative inline-block">
          ı
          <svg viewBox="0 0 40 24" fill="none" stroke="currentColor" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '50%', top: '0.04em', width: '0.36em', height: '0.216em', transform: 'translateX(-50%)' }}>
            <path d="M5 20 20 7 35 20" />
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
