'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

/**
 * Filters FAQ entries on the page as you type. The full list is always in the server-rendered HTML (so search engines and
 * no-JS visitors see everything); this only hides non-matching `[data-faq-item]` elements and empty `[data-faq-group]` sections.
 */
export default function FaqSearch({ scope }: { scope: string }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<number | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const root = document.getElementById(scope);
    if (!root) return;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    root.querySelectorAll<HTMLElement>('[data-faq-item]').forEach((el) => {
      const text = (el.getAttribute('data-faq-text') ?? el.textContent ?? '').toLowerCase();
      const ok = terms.every((t) => text.includes(t));
      el.hidden = !ok;
      if (ok) n++;
      if (ok && terms.length && el instanceof HTMLDetailsElement) el.open = true;
    });
    root.querySelectorAll<HTMLElement>('[data-faq-group]').forEach((g) => { g.hidden = g.querySelectorAll('[data-faq-item]:not([hidden])').length === 0; });
    setHits(terms.length ? n : null);
  }, [q, scope]);
  return (
    <div role="search" className="mx-auto w-full max-w-xl">
      <label className="relative block">
        <span className="sr-only">Search the help centre</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary" aria-hidden />
        <input ref={ref} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the help centre" className="input !pl-12" autoComplete="off" />
      </label>
      <p className="mt-2 min-h-[20px] text-center text-[14px] text-secondary" role="status" aria-live="polite">
        {hits === null ? '' : hits === 0 ? 'No questions match that. Try a different word.' : `${hits} question${hits === 1 ? '' : 's'} found`}
      </p>
    </div>
  );
}
