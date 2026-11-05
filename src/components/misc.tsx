'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Check, Copy, Moon, Sun, X } from 'lucide-react';
import { switchHome } from '@/app/actions';
import { applyMode, readMode } from '@/lib/theme';
import AppleButton from './AppleButton';

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
  if (!open || typeof document === 'undefined') return null;
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

/** Quick light/dark flip (explicit choice; full options live in Settings → Appearance). */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const m = readMode();
    setDark(m === 'dark' || (m === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  }, []);
  return (
    <button
      type="button"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      onClick={() => {
        applyMode(dark ? 'light' : 'dark');
        setDark(!dark);
      }}
      className={className ?? 'grid h-11 w-11 place-items-center rounded-xl text-secondary transition hover:bg-label/5 active:scale-90'}
    >
      {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}

export function HomeSwitcher({ homes, activeId, className }: { homes: { id: string; name: string }[]; activeId: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Switch home"
      value={activeId}
      disabled={pending}
      onChange={(e) => {
        if (e.target.value === '__manage') return router.push('/dashboard/homes');
        start(() => switchHome(e.target.value));
      }}
      className={className ?? 'input min-h-[44px] py-1.5 text-[15px] font-semibold'}
    >
      {homes.map((h) => (
        <option key={h.id} value={h.id}>{h.name}</option>
      ))}
      <option value="__manage">＋ Add or manage homes…</option>
    </select>
  );
}

/** Destructive submit button that asks for confirmation first. */
export function ConfirmButton({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <AppleButton
      type="submit"
      variant="destructive"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </AppleButton>
  );
}
