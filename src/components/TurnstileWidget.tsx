'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | null = null;
const loadScript = () =>
  (loading ??= new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Turnstile failed to load'));
    document.head.appendChild(s);
  }));

/**
 * Cloudflare Turnstile widget. Inside a <form> it adds a hidden `cf-turnstile-response` field; `onToken` also reports the
 * token (for programmatic sign-in). Tokens are single-use, so bump `resetKey` after every submit attempt.
 */
export default function TurnstileWidget({ siteKey, resetKey = 0, onToken }: { siteKey: string; resetKey?: number; onToken?: (t: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        id.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          theme: 'auto',
          callback: (t: string) => onToken?.(t),
          'expired-callback': () => onToken?.(''),
          'error-callback': () => onToken?.(''),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (id.current) window.turnstile?.remove(id.current);
      id.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  useEffect(() => {
    if (resetKey && id.current) {
      onToken?.('');
      window.turnstile?.reset(id.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return <div ref={box} className="flex min-h-[65px] justify-center" aria-label="Security check" />;
}
