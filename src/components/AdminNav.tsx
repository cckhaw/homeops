'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, BarChart3, Bug, ScrollText, Settings, Tags, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/admin', label: 'Analytics', icon: BarChart3, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/brands', label: 'Brands', icon: Tags },
  { href: '/admin/audit', label: 'Audit', icon: ScrollText },
  { href: '/admin/errors', label: 'Errors', icon: Bug },
  { href: '/admin/settings', label: 'Config', icon: Settings },
];

/** Admin navigation: a top strip on desktop, the same bottom tab bar as the app on phones (all five sections visible). */
export default function AdminNav() {
  const path = usePathname();
  const on = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + '/'));
  return (
    <>
      <header className="glass sticky top-0 z-20 border-x-0 border-t-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-5xl items-center gap-1 px-3 py-1.5">
          <Link href="/dashboard" className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-3 text-[15px] text-tint">
            <ArrowLeft className="h-4 w-4" aria-hidden /> App
          </Link>
          <span className="mx-1 shrink-0 text-[15px] font-bold">Admin</span>
          <nav aria-label="Admin sections" className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={href}
                href={href}
                aria-current={on(href, exact) ? 'page' : undefined}
                className={cn('flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3 text-[15px] font-medium transition', on(href, exact) ? 'bg-tint/10 text-tint' : 'hover:bg-label/5')}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <nav aria-label="Admin sections" className="glass pb-safe fixed inset-x-0 bottom-0 z-30 flex border-x-0 border-b-0 md:hidden">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = on(href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn('flex min-h-[49px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[10px] font-medium transition active:scale-95', active ? 'text-tint' : 'text-secondary')}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
