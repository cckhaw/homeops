import Link from 'next/link';
import { donationsEnabled } from '@/lib/donate';
import AppleButton from './AppleButton';
import Logo from './Logo';
import { ThemeToggle } from './misc';

/** Header for public content pages (blog). It never depends on who is visiting, so these pages can be cached and served fast. */
export function SiteHeader({ active }: { active?: 'blog' }) {
  const link = (href: string, label: string, on?: boolean) => (
    <Link href={href} aria-current={on ? 'page' : undefined} className={on ? 'font-semibold text-label' : 'transition hover:text-label'}>{label}</Link>
  );
  return (
    <header className="glass sticky top-0 z-20 border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2.5">
        <Link href="/" aria-label="Wodejia"><Logo size={36} /></Link>
        <nav aria-label="Site" className="hidden items-center gap-7 text-[15px] font-medium text-secondary md:flex">
          {link('/#features', 'Features')}
          {link('/#how', 'How it works')}
          {link('/blog', 'Blog', active === 'blog')}
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href="/blog" className="flex min-h-[44px] items-center px-3 text-[15px] font-medium text-secondary md:hidden">Blog</Link>
          <ThemeToggle />
          <AppleButton href="/login" variant="plain">Sign in</AppleButton>
          <AppleButton href="/register" className="hidden sm:inline-flex">Get started</AppleButton>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t px-5 py-10 hairline">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
        <Link href="/" aria-label="Wodejia"><Logo size={28} /></Link>
        <p className="text-[13px] text-secondary">
          © {new Date().getFullYear()} Wodejia
          {' · '}
          <Link href="/blog" className="font-semibold text-tint">Blog</Link>
          {' · '}
          <Link href="/privacy" className="font-semibold text-tint">Privacy</Link>
          {' · '}
          <Link href="/terms" className="font-semibold text-tint">Terms</Link>
          {donationsEnabled() && (
            <>
              {' · '}
              <Link href="/support" className="font-semibold text-tint">☕ Buy me a coffee</Link>
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
