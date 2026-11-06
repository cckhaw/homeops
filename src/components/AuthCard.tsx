import Link from 'next/link';
import GlassCard from './GlassCard';
import { LogoMark } from './Logo';
import { ThemeToggle } from './misc';

export default function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center px-5 py-10">
      <div className="absolute right-3 top-3"><ThemeToggle /></div>
      <GlassCard className="w-full max-w-sm space-y-6 p-7 shadow-xl">
        <div className="text-center">
          <Link href="/" aria-label="Wodejia" className="inline-block"><LogoMark size={64} className="mx-auto mb-3" /></Link>
          <h1 className="text-[26px] font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-[15px] text-secondary">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="text-center text-[14px] text-secondary">{footer}</div>}
        <p className="text-center text-[12px] text-secondary">By continuing you agree to our <Link href="/terms" className="font-semibold text-tint">Terms</Link> and <Link href="/privacy" className="font-semibold text-tint">Privacy Policy</Link>.</p>
      </GlassCard>
    </main>
  );
}
