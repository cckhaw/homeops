'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, CalendarCheck, Users, BadgeCheck, Settings, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Home', icon: Home, exact: true },
  { href: '/dashboard/assets', label: 'Assets', icon: Package },
  { href: '/dashboard/schedule', label: 'Schedule', icon: CalendarCheck },
  { href: '/dashboard/household', label: 'Household', icon: Users },
  { href: '/dashboard/passport', label: 'Passport', icon: BadgeCheck },
];

export default function Navbar({ isAdmin, homeName }: { isAdmin: boolean; homeName: string }) {
  const path = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + '/'));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-y-0 border-l-0 p-4 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2 pt-2">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-tint text-white">
            <Home className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[17px] font-bold leading-tight">HomeOps</span>
            <span className="block truncate text-[12px] text-secondary">{homeName}</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
          {[...items, { href: '/dashboard/settings', label: 'Settings', icon: Settings }].map(({ href, label, icon: Icon, ...r }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href, 'exact' in r ? r.exact : false) ? 'page' : undefined}
              className={cn(
                'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition',
                active(href, 'exact' in r ? r.exact : false) ? 'bg-tint/10 text-tint' : 'text-label hover:bg-label/5',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        {isAdmin && (
          <Link href="/admin" className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-secondary hover:bg-label/5">
            <ShieldCheck className="h-5 w-5" aria-hidden />
            Admin portal
          </Link>
        )}
      </aside>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        className="glass pb-safe fixed inset-x-0 bottom-0 z-30 flex border-x-0 border-b-0 md:hidden"
      >
        {items.map(({ href, label, icon: Icon, ...r }) => {
          const on = active(href, 'exact' in r ? r.exact : false);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'flex min-h-[49px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[10px] font-medium transition active:scale-95',
                on ? 'text-tint' : 'text-secondary',
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={on ? 2.4 : 1.8} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
