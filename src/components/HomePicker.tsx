'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Check, ChevronsUpDown, Plus, Search, Settings2, X } from 'lucide-react';
import HomeIcon from './HomeIcon';
import { cn } from '@/lib/utils';
import { switchHome } from '@/app/actions';

type Home = { id: string; name: string; icon: string };

/** Above this many homes a row of icon buttons stops being usable, so the switcher becomes a searchable list. */
export const PICKER_THRESHOLD = 4;

/**
 * Switcher for people with many homes: one button showing the current home, opening a searchable list.
 * Desktop/tablet: a popover beside the sidebar. Phone: a bottom sheet. `compact` = icon-only trigger (collapsed rail, phone bar).
 */
export default function HomePicker({ homes, activeId, compact, showName = true }: { homes: Home[]; activeId: string; compact?: boolean; showName?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [pending, start] = useTransition();
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const active = homes.find((h) => h.id === activeId);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = needle ? homes.filter((h) => h.name.toLowerCase().includes(needle)) : homes;
    // The current home always comes first so it is never lost in a long list.
    return [...rows].sort((a, b) => (a.id === activeId ? -1 : b.id === activeId ? 1 : a.name.localeCompare(b.name)));
  }, [homes, q, activeId]);

  const show = () => {
    const r = trigger.current?.getBoundingClientRect();
    setPos(r ? { left: Math.max(8, r.left), top: r.bottom + 6 } : null);
    setQ('');
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const choose = (h: Home) => {
    if (h.id === activeId) return close();
    start(async () => {
      await switchHome(h.id);
      setOpen(false);
    });
  };

  const panel = (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <div className="absolute inset-0 bg-black/30 md:bg-transparent" onClick={close} aria-hidden />
      <div
        role="dialog"
        aria-label="Choose a home"
        style={pos ? { left: pos.left, top: pos.top } : undefined}
        className={cn(
          'glass absolute flex max-h-[70dvh] flex-col overflow-hidden shadow-2xl',
          // phone: bottom sheet; md+: popover anchored under the trigger
          'inset-x-0 bottom-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-auto md:w-72 md:rounded-2xl md:pb-0',
        )}
      >
        <div className="flex items-center gap-2 border-b p-3 hairline">
          <Search className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
          <input
            ref={search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${homes.length} homes`}
            aria-label="Search homes"
            className="min-h-[40px] w-full bg-transparent text-[16px] outline-none placeholder:text-secondary"
          />
          <button type="button" onClick={close} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-secondary hover:bg-label/5 md:hidden">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-1.5" role="listbox" aria-label="Your homes">
          {list.map((h) => {
            const on = h.id === activeId;
            return (
              <li key={h.id} role="option" aria-selected={on}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => choose(h)}
                  className={cn('flex min-h-[48px] w-full items-center gap-3 rounded-xl px-2.5 text-left text-[16px] transition disabled:opacity-60', on ? 'bg-tint/10 font-semibold text-tint' : 'hover:bg-label/5')}
                >
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', on ? 'bg-tint text-ontint' : 'bg-label/5 text-secondary')}>
                    <HomeIcon id={h.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{h.name}</span>
                  {on && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="px-3 py-6 text-center text-[15px] text-secondary">No home matches &ldquo;{q}&rdquo;.</li>}
        </ul>
        <div className="flex border-t p-1.5 hairline">
          <Link href="/dashboard/homes" onClick={() => setOpen(false)} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-tint hover:bg-label/5">
            <Settings2 className="h-4 w-4" aria-hidden /> Manage homes
          </Link>
          <Link href="/dashboard/homes" onClick={() => setOpen(false)} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-tint hover:bg-label/5">
            <Plus className="h-4 w-4" aria-hidden /> Add a home
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Current home: ${active?.name ?? ''}. Switch home`}
        title={active?.name}
        className={cn(
          'flex min-h-[48px] items-center gap-2.5 rounded-xl bg-label/5 text-left transition hover:bg-label/10 active:scale-[0.98]',
          compact ? 'w-11 justify-center p-0' : 'w-full px-2.5',
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-tint text-ontint">
          <HomeIcon id={active?.icon} className="h-[18px] w-[18px]" />
        </span>
        {!compact && showName && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] font-semibold">{active?.name}</span>
              <span className="block text-[12px] text-secondary">{homes.length} homes</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
          </>
        )}
      </button>
      {open && typeof document !== 'undefined' && createPortal(panel, document.body)}
    </>
  );
}
