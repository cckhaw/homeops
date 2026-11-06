'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Copy, Moon, Plus, Sun, X } from 'lucide-react';
import HomeIcon from './HomeIcon';
import { cn } from '@/lib/utils';
import { switchHome } from '@/app/actions';
import { applyMode, readMode } from '@/lib/theme';
import Tip from './Tip';
import AppleButton from './AppleButton';
import HomePicker, { PICKER_THRESHOLD } from './HomePicker';

/** Re-fetches server data periodically and on focus so household members see each other's changes. */
export function LiveRefresh({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [router, intervalMs]);
  return null;
}

export function CopyButton({ path, label = 'Copy link' }: { path: string; label?: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <AppleButton
      type="button"
      variant="secondary"
      onClick={async () => {
        const url = new URL(path, window.location.origin).toString();
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          window.prompt('Copy this link', url);
        }
        setDone(true);
        timer.current = setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {done ? 'Copied' : label}
    </AppleButton>
  );
}

export function ShareButton({ path, title }: { path: string; title: string }) {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== 'undefined' && !!navigator.share), []);
  if (!canShare) return null;
  return (
    <AppleButton
      type="button"
      onClick={() => navigator.share({ title, url: new URL(path, window.location.origin).toString() }).catch(() => {})}
    >
      Share…
    </AppleButton>
  );
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}

/** iOS-style bottom sheet (centered modal on larger screens). */
export function Sheet({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  // Portals need the document: render nothing until mounted so the first client render matches the server HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || !mounted) return null;
  // Portal: ancestors with backdrop-filter (glass cards) would otherwise trap position:fixed.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="glass relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] p-5 sm:max-w-xl sm:rounded-[28px]" style={{ background: 'rgb(var(--surface) / 0.94)' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[22px] font-bold">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-label/5">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Quick light/dark flip (explicit choice; full options live in Settings → Appearance). `tip` adds a hover tooltip. */
export function ThemeToggle({ className, tip }: { className?: string; tip?: { side?: 'top' | 'right'; align?: 'start' | 'center' | 'end' } }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const m = readMode();
    setDark(m === 'dark' || (m === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  }, []);
  const button = (
    <button
      type="button"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={tip ? undefined : dark ? 'Light mode' : 'Dark mode'}
      onClick={() => {
        applyMode(dark ? 'light' : 'dark');
        setDark(!dark);
      }}
      className={className ?? 'grid h-11 w-11 place-items-center rounded-xl text-secondary transition hover:bg-label/5 active:scale-90'}
    >
      {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
  return tip ? <Tip label={dark ? 'Switch to light mode' : 'Switch to dark mode'} side={tip.side} align={tip.align}>{button}</Tip> : button;
}

export type SwitcherHome = { id: string; name: string; icon: string };

/**
 * Home switcher: one icon button per home (active one filled), plus a "+" to add or manage homes.
 * layout: 'sidebar' = wrapping grid with the active home's name underneath; 'rail' = vertical, collapsed sidebar;
 * 'bar' = horizontally scrolling row with the active name, for the mobile top bar.
 */
export function HomeSwitcher({ homes, activeId, layout = 'sidebar' }: { homes: SwitcherHome[]; activeId: string; layout?: 'sidebar' | 'rail' | 'bar' }) {
  const [pending, start] = useTransition();
  const active = homes.find((h) => h.id === activeId);
  // Many homes: a row of icons stops working, so use one button that opens a searchable list instead.
  if (homes.length > PICKER_THRESHOLD) {
    if (layout === 'rail') return <HomePicker homes={homes} activeId={activeId} compact />;
    if (layout === 'bar') {
      return (
        <div className="flex min-w-0 items-center gap-2">
          <HomePicker homes={homes} activeId={activeId} />
        </div>
      );
    }
    return <HomePicker homes={homes} activeId={activeId} />;
  }
  // The collapsed rail is narrow: show the active home and a few others, the rest are one tap away on "My homes".
  const shown = layout === 'rail' && homes.length > 6 ? [active, ...homes.filter((h) => h.id !== activeId)].filter((h): h is SwitcherHome => !!h).slice(0, 6) : homes;

  const buttons = shown.map((h) => {
    const on = h.id === activeId;
    return (
      <button
        key={h.id}
        type="button"
        aria-pressed={on}
        aria-label={h.name}
        title={h.name}
        disabled={pending}
        onClick={() => !on && start(() => switchHome(h.id))}
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-xl transition active:scale-90 disabled:opacity-60',
          on ? 'bg-tint text-ontint shadow-sm' : 'bg-label/5 text-secondary hover:bg-label/10 hover:text-label',
        )}
      >
        <HomeIcon id={h.icon} className="h-5 w-5" />
      </button>
    );
  });
  const add = (
    <Link href="/dashboard/homes" aria-label="Add or manage homes" title="Add or manage homes" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-dashed text-secondary transition hover:bg-label/5 hover:text-label hairline">
      <Plus className="h-5 w-5" aria-hidden />
    </Link>
  );

  if (layout === 'bar') {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <div role="group" aria-label="Your homes" className="flex min-w-0 items-center gap-1.5 overflow-x-auto">{buttons}{add}</div>
        <span className="hidden min-w-0 truncate text-[15px] font-semibold min-[420px]:block">{active?.name}</span>
      </div>
    );
  }
  return (
    <div>
      <div role="group" aria-label="Your homes" className={cn('flex gap-1.5', layout === 'rail' ? 'flex-col items-center' : 'flex-wrap')}>{buttons}{add}</div>
      {layout === 'sidebar' && active && <p className="mt-2 truncate px-1 text-[14px] font-semibold" title={active.name}>{active.name}</p>}
    </div>
  );
}

/** Destructive submit button that asks for confirmation first. */
export function ConfirmButton({ message, children, className, label }: { message: string; children: React.ReactNode; className?: string; label?: string }) {
  return (
    <AppleButton
      type="submit"
      variant="destructive"
      className={className}
      aria-label={label}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </AppleButton>
  );
}

/** Copies an arbitrary string (e.g. a calendar link) to the clipboard. */
export function CopyTextButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <AppleButton
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          window.prompt('Copy this link', text);
        }
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {done ? 'Copied' : label}
    </AppleButton>
  );
}
