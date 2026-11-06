'use client';

import { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { LogoMark as ArtMark, Wordmark, LOGO_FIXED, LOGO_COLOR, LOGO_COLOR_FIXED } from './LogoArt';

export { Wordmark, LOGO_FIXED, LOGO_COLOR, LOGO_COLOR_FIXED };

/** URLs of admin-uploaded images (null = use the built-in artwork). Provided once by the root layout. */
export type SiteBrand = { logo: string | null; icon: string | null };
const Ctx = createContext<SiteBrand>({ logo: null, icon: null });
export const SiteBrandProvider = ({ value, children }: { value: SiteBrand; children: React.ReactNode }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;

/** Symbol only. Uses the uploaded icon when there is one. `fixed` (social/app-icon contexts) always uses the built-in art. */
export function LogoMark({ size = 40, className, color, fixed, title = 'Wodejia' }: { size?: number; className?: string; color?: string; fixed?: boolean; title?: string }) {
  const { icon } = useContext(Ctx);
  if (icon && !fixed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon} width={size} height={size} alt={title} className={cn('rounded-[22%] object-contain', className)} />;
  }
  return <ArtMark size={size} className={className} color={color} fixed={fixed} title={title} />;
}

/** Mark + wordmark lockup, or the uploaded logo. Pass `color` for a one-colour version of the built-in logo. */
export default function Logo({ size = 40, wordmark = true, className, color, fixed }: { size?: number; wordmark?: boolean; className?: string; color?: string; fixed?: boolean }) {
  const { logo } = useContext(Ctx);
  if (logo && wordmark && !fixed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="Wodejia" height={size} style={{ height: size * 1.05, width: 'auto', maxWidth: size * 6 }} className={cn('object-contain', className)} />;
  }
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} color={color} fixed={fixed} />
      {wordmark && <Wordmark size={size * 0.7} color={color} fixed={fixed} />}
    </span>
  );
}
