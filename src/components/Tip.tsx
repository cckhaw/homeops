import { cn } from '@/lib/utils';

/**
 * Small hover / keyboard-focus tooltip. Wrap an icon-only control; the label also reaches screen readers through the
 * control's own aria-label, so the bubble itself is decorative (aria-hidden).
 */
export default function Tip({ label, side = 'top', align = 'center', className, children }: { label: string; side?: 'top' | 'right'; align?: 'start' | 'center' | 'end'; className?: string; children: React.ReactNode }) {
  const pos =
    side === 'right'
      ? 'left-full top-1/2 ml-2 -translate-y-1/2'
      : cn('bottom-full mb-2', align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2');
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        aria-hidden
        data-tip
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-label px-2.5 py-1.5 text-[12px] font-medium text-bg opacity-0 shadow-lg transition-opacity duration-150',
          'group-hover/tip:opacity-100 group-hover/tip:delay-300 group-focus-within/tip:opacity-100',
          pos,
        )}
      >
        {label}
      </span>
    </span>
  );
}
