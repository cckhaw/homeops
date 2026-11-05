'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'destructive' | 'plain';

const variants: Record<Variant, string> = {
  primary: 'bg-tint text-ontint hover:brightness-110',
  secondary: 'bg-tint/10 text-tint hover:bg-tint/15',
  destructive: 'bg-bad/10 text-bad hover:bg-bad/15',
  plain: 'text-tint hover:bg-tint/10',
};

const base =
  'inline-flex min-h-[44px] min-w-[44px] select-none items-center justify-center gap-2 rounded-xl px-5 text-[17px] font-semibold ' +
  'transition duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint/50 ' +
  'disabled:pointer-events-none disabled:opacity-50';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  href?: string;
  full?: boolean;
};

export default function AppleButton({ variant = 'primary', href, full, className, children, ...rest }: Props) {
  const cls = cn(base, variants[variant], full && 'w-full', className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

/** Submit button that shows a spinner while its parent <form> action is pending. */
export function SubmitButton({ children, variant = 'primary', full, className, pending: pendingProp, ...rest }: Props & { pending?: boolean }) {
  const { pending: formPending } = useFormStatus();
  const pending = pendingProp ?? formPending;
  return (
    <AppleButton type="submit" variant={variant} full={full} disabled={pending || rest.disabled} className={className} {...rest}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </AppleButton>
  );
}
