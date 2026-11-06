'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BarChart3, LogOut, Ellipsis, FileArchive, FolderLock, HardHat, Home, Receipt, Package, CalendarCheck, Users, BadgeCheck, Settings, ShieldCheck, Building2, Coffee, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HomeSwitcher, ThemeToggle, type SwitcherHome } from './misc';
import Logo, { LogoMark } from './Logo';

// Inside the signed-in app the logo takes the user's accent colour; public pages keep the default brand blue.
const ACCENT = 'rgb(var(--tint))';

const items = [
  { href: '/dashboard', label: 'Home', icon: Home, exact: true },
  { href: '/dashboard/assets', label: 'Assets', icon: Package },
  { href: '/dashboard/schedule', label: 'Schedule', icon: CalendarCheck },
  { href: '/dashboard/household', label: 'Household', icon: Users },
  { href: '/dashboard/passport', label: 'Passport', icon: BadgeCheck },
];
const records = [
  { href: '/dashboard/documents', label: 'Documents', icon: FolderLock },
  { href: '/dashboard/contractors', label: 'Contractors', icon: HardHat },
  { href: '/dashboard/bills', label: 'Utility bills', icon: Receipt },
  { href: '/dashboard/reports', label: 'Spending', icon: BarChart3 },
  { href: '/dashboard/pack', label: 'Move-out pack', icon: FileArchive },
];
// The phone tab bar has room for six: the five daily screens plus a hub for everything else.
const mobileTabs = [...items, { href: '/dashboard/more', label: 'More', icon: Ellipsis }];
const sideExtra = [
  { href: '/dashboard/homes', label: 'My homes', icon: Building2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

type Props = {
  isAdmin: boolean;
  homes: SwitcherHome[];
  activeId: string;
  collapsed: boolean;
  onToggle: () => void;
  donate?: boolean;
};

export default function Navbar({ isAdmin, homes, activeId, collapsed, onToggle, donate }: Props) {
  const path = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + '/'));
  const link = (href: string, label: string, Icon: typeof Home, exact?: boolean, muted?: boolean) => {
    const on = active(href, exact);
    return (
      <Link
        key={href}
        href={href}
        title={collapsed ? label : undefined}
        aria-label={label}
        aria-current={on ? 'page' : undefined}
        className={cn(
          'flex min-h-[44px] items-center rounded-xl text-[15px] font-medium transition',
          collapsed ? 'justify-center' : 'gap-3 px-3',
          on ? 'bg-tint/10 text-tint' : muted ? 'text-secondary hover:bg-label/5 hover:text-label' : 'text-label hover:bg-label/5',
        )}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        {!collapsed && label}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop sidebar — collapsible to an icon rail */}
      <aside
        className={cn(
          'glass fixed inset-y-0 left-0 z-30 hidden flex-col border-y-0 border-l-0 p-3 transition-[width] duration-200 md:flex',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <div className={cn('mb-4 flex items-center pt-1', collapsed ? 'justify-center' : 'justify-between px-1')}>
          <Link href="/dashboard" aria-label="HomeOps" className="flex items-center">
            {collapsed ? <LogoMark size={40} color={ACCENT} /> : <Logo size={36} color={ACCENT} />}
          </Link>
        </div>
        <div className={cn('mb-3', collapsed && 'flex justify-center')}>
          <HomeSwitcher homes={homes} activeId={activeId} layout={collapsed ? 'rail' : 'sidebar'} />
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain" aria-label="Primary">
          {items.map((i) => link(i.href, i.label, i.icon, i.exact))}
          <div className="my-2 border-t hairline" />
          {records.map((i) => link(i.href, i.label, i.icon))}
          <div className="my-2 border-t hairline" />
          {sideExtra.map((i) => link(i.href, i.label, i.icon))}
        </nav>

        {/* Separate from the main menu: owner tools, support, then display controls */}
        {(isAdmin || donate) && (
          <nav className="mt-2 flex shrink-0 flex-col gap-1 border-t pt-2 hairline" aria-label="More">
            {isAdmin && link('/admin', 'Admin portal', ShieldCheck, false, true)}
            {donate && link('/support', 'Buy me a coffee', Coffee, false, true)}
          </nav>
        )}
        <div className={cn('mt-2 flex shrink-0 gap-1 border-t pt-2 hairline', collapsed ? 'flex-col items-center' : 'items-center justify-between')}>
          <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center')}>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              aria-label="Sign out"
              title="Sign out"
              className="grid h-11 w-11 place-items-center rounded-xl text-secondary transition hover:bg-bad/10 hover:text-bad active:scale-90"
            >
              <LogOut className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <button
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="grid h-11 w-11 place-items-center rounded-xl text-secondary hover:bg-label/5"
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden /> : <PanelLeftClose className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="glass fixed inset-x-0 top-0 z-30 flex items-center gap-2 border-x-0 border-t-0 px-3 py-1.5 md:hidden" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.375rem)' }}>
        <div className="min-w-0 flex-1"><HomeSwitcher homes={homes} activeId={activeId} layout="bar" /></div>
        <ThemeToggle />
        <Link href="/dashboard/settings" aria-label="Settings" className="grid h-11 w-11 place-items-center rounded-xl text-secondary hover:bg-label/5">
          <Settings className="h-5 w-5" aria-hidden />
        </Link>
      </header>

      {/* Mobile bottom tab bar */}
      <nav aria-label="Primary" className="glass pb-safe fixed inset-x-0 bottom-0 z-30 flex border-x-0 border-b-0 md:hidden">
        {mobileTabs.map(({ href, label, icon: Icon, ...r }) => {
          const on = active(href, 'exact' in r ? r.exact : false) || (href === '/dashboard/more' && ['/dashboard/documents', '/dashboard/contractors', '/dashboard/bills', '/dashboard/reports', '/dashboard/pack', '/dashboard/labels', '/dashboard/homes', '/dashboard/settings'].some((p) => path.startsWith(p)));
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? 'page' : undefined}
              className={cn('flex min-h-[49px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[10px] font-medium transition active:scale-95', on ? 'text-tint' : 'text-secondary')}
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
