import { cn } from '@/lib/utils';

type Props = React.HTMLAttributes<HTMLDivElement> & { padded?: boolean };

/** Translucent Apple-style surface (20px blur, hairline border). */
export default function GlassCard({ className, padded = true, children, ...rest }: Props) {
  return (
    <div className={cn('glass rounded-apple shadow-[0_1px_2px_rgba(0,0,0,0.04)]', padded && 'p-5', className)} {...rest}>
      {children}
    </div>
  );
}
