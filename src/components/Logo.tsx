import { cn } from '@/lib/utils';

/** The single flat logo colour: the default brand blue (independent of any accent colour a user picks). */
export const LOGO_COLOR = 'rgb(var(--brand))';
/** Fixed value for places that cannot read CSS variables (app icons, favicon). */
export const LOGO_COLOR_FIXED = '#0E7FAE';

/** The HomeOps mark: a house outline whose roof line turns into a check mark. One flat colour. Pure SVG — safe in server, client and OG-image contexts. */
export function LogoMark({ size = 40, className, color = LOGO_COLOR }: { size?: number; className?: string; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="HomeOps"
      className={className}
    >
      <path d="M45 88H25a9 9 0 0 1-9-9V47" strokeWidth={9} />
      <path d="M7 52 44 15l17 17" strokeWidth={9} />
      <path d="M27 34V21h7" strokeWidth={7} />
      <path d="M78 49v30a9 9 0 0 1-9 9H57" strokeWidth={9} />
      <path d="m33 53 15 17 37-44" strokeWidth={10} />
    </svg>
  );
}

/**
 * "HomeOps" wordmark: bold geometric type where the O becomes a little house —
 * a roof sits on top of it and a four-pane window fills the counter.
 */
export function Wordmark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-block select-none whitespace-nowrap font-bold leading-none tracking-tight', className)}
      style={{ fontFamily: 'var(--font-brand), -apple-system, "SF Pro Display", sans-serif', fontSize: size, color: LOGO_COLOR }}
      aria-hidden
    >
      Home
      {/* The "O" is drawn: a ring (cap-height, matches the type weight) with a roof above and a four-pane window inside. */}
      <svg
        viewBox="0 0 84 104"
        style={{ display: 'inline-block', width: '0.84em', height: '1.04em', verticalAlign: 'baseline', margin: '0 0.015em' }}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 41 42 11l38 30" strokeWidth={13} />
        <circle cx="42" cy="67" r="28.5" strokeWidth={14.5} />
        <rect x="30" y="55" width="24" height="24" rx="1.5" strokeWidth={4} />
        <path d="M42 55v24M30 67h24" strokeWidth={3.5} strokeLinecap="butt" />
      </svg>
      ps
    </span>
  );
}

/** Mark + wordmark lockup. */
export default function Logo({ size = 40, wordmark = true, className }: { size?: number; wordmark?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {wordmark && <Wordmark size={size * 0.62} />}
    </span>
  );
}
