'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, Bug, Menu, Newspaper, ScrollText, Settings, Tags, Users, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from './Logo';

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: 'errors' | 'scheduled' };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Overview', items: [{ href: '/admin', label: 'Analytics', icon: BarChart3, exact: true }] },
  { title: 'People', items: [{ href: '/admin/users', label: 'Users', icon: Users }] },
  { title: 'Content', items: [{ href: '/admin/blog', label: 'Blog', icon: Newspaper, badge: 'scheduled' }, { href: '/admin/brands', label: 'Brands', icon: Tags }] },
  { title: 'System', items: [{ href: '/admin/errors', label: 'Errors', icon: Bug, badge: 'errors' }, { href: '/admin/audit', label: 'Audit log', icon: ScrollText }, { href: '/admin/settings', label: 'Site config', icon: Settings }] },
];
const ALL = GROUPS.flatMap((g) => g.items);

export type AdminBadges = { errors: number; scheduled: number };

function Menu_({ badges, onNavigate, path }: { badges: AdminBadges; onNavigate?: () => void; path: string }) {
  const on = (i: Item) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + '/'));
  return (
    <nav aria-label="Admin sections" className="flex-1 space-y-5 overflow-y-auto overscroll-contain pb-2">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const n = i.badge ? badges[i.badge] : 0;
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={onNavigate}
                    aria-current={on(i) ? 'page' : undefined}
                    className={cn('flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition', on(i) ? 'bg-tint/10 text-tint' : 'text-label hover:bg-label/5')}
                  >
                    <i.icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="flex-1">{i.label}</span>
                    {n > 0 && (
                      <span className={cn('min-w-[22px] rounded-full px-1.5 text-center text-[12px] font-semibold tabular-nums', i.badge === 'errors' ? 'bg-bad/15 text-bad' : 'bg-tint/15 text-tint')} aria-label={`${n} ${i.badge === 'errors' ? 'open' : 'scheduled'}`}>{n}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Admin navigation: a grouped left sidebar on tablet/desktop, and a top bar with a slide-in drawer on phones. */
export default function AdminNav({ badges }: { badges: AdminBadges }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);
  const current = ALL.find((i) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + '/')));

  const head = (
    <div className="mb-5 flex items-center justify-between px-1">
      <Link href="/admin" aria-label="HomeOps admin" className="flex items-center gap-2"><Logo size={30} /><span className="rounded-md bg-tint/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-tint">Admin</span></Link>
    </div>
  );
  const foot = (
    <div className="mt-2 border-t pt-2 hairline">
      <Link href="/dashboard" className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-secondary transition hover:bg-label/5 hover:text-label"><ArrowLeft className="h-5 w-5" aria-hidden />Back to the app</Link>
    </div>
  );

  return (
    <>
      {/* tablet / desktop */}
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-y-0 border-l-0 p-3 md:flex" aria-label="Admin">
        {head}
        <Menu_ badges={badges} path={path} />
        {foot}
      </aside>

      {/* phone */}
      <header className="glass fixed inset-x-0 top-0 z-30 flex items-center gap-2 border-x-0 border-t-0 px-3 py-1.5 md:hidden" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.375rem)' }}>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open admin menu" aria-expanded={open} className="grid h-11 w-11 place-items-center rounded-xl text-label hover:bg-label/5"><Menu className="h-6 w-6" aria-hidden /></button>
        <p className="min-w-0 flex-1 truncate text-[17px] font-semibold">{current?.label ?? 'Admin'}</p>
        <Link href="/dashboard" aria-label="Back to the app" className="grid h-11 w-11 place-items-center rounded-xl text-secondary hover:bg-label/5"><ArrowLeft className="h-5 w-5" aria-hidden /></Link>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="glass absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col p-3" style={{ background: 'rgb(var(--surface) / 0.96)', paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}>
            <div className="flex items-start justify-between">
              {head}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-full bg-label/5"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <Menu_ badges={badges} path={path} onNavigate={() => setOpen(false)} />
            {foot}
          </div>
        </div>
      )}
    </>
  );
}
