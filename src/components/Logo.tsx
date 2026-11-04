import { cn } from '@/lib/utils';

export const LOGO_BLUE = '#6CC4EA';
export const LOGO_GREEN = '#8FD1A4';

/** The HomeOps mark: a house outline whose roof line turns into a check mark. Pure SVG — safe in server, client and OG-image contexts. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="HomeOps"
      className={className}
    >
      <g stroke={LOGO_BLUE} strokeWidth={9}>
        <path d="M45 88H25a9 9 0 0 1-9-9V47" />
        <path d="M7 52 44 15l17 17" />
      </g>
      <path d="M27 34V21h7" stroke={LOGO_BLUE} strokeWidth={7} />
      <g stroke={LOGO_GREEN}>
        <path d="M78 49v30a9 9 0 0 1-9 9H57" strokeWidth={9} />
        <path d="m33 53 15 17 37-44" strokeWidth={10} />
      </g>
    </svg>
  );
}

/** Mark + "HomeOps" wordmark (the roof over the O echoes the mark). */
export default function Logo({ size = 40, wordmark = true, className }: { size?: number; wordmark?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} />
      {wordmark && (
        <span className="font-bold leading-none tracking-tight text-label/80" style={{ fontSize: size * 0.58 }} aria-hidden>
          Home
          <span className="relative inline-block">
            O
            <svg viewBox="0 0 20 10" className="absolute left-1/2 -translate-x-1/2" style={{ width: '0.62em', top: '-0.18em' }} fill="none" stroke={LOGO_BLUE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9 10 2l8 7" />
            </svg>
          </span>
          ps
        </span>
      )}
    </span>
  );
}
