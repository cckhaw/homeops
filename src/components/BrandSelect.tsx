'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Pencil, Search } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { BRAND_NAMES, canonicalBrand } from '@/lib/brands';
import { cn } from '@/lib/utils';

/**
 * Brand picker: a dropdown of known brands (each with its logo), plus "Other brand" which
 * reveals a text field. Submits the chosen/typed brand as the `make` form field.
 */
export default function BrandSelect({ value, onChange, name = 'make' }: { value: string; onChange: (v: string) => void; name?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [other, setOther] = useState(() => !!value && !canonicalBrand(value));
  const root = useRef<HTMLDivElement>(null);
  const known = canonicalBrand(value);

  // OCR (or editing) may set a value from outside: keep the mode consistent with it.
  useEffect(() => {
    if (value && !canonicalBrand(value)) setOther(true);
    if (value && canonicalBrand(value)) setOther(false);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const list = useMemo(() => (q ? BRAND_NAMES.filter((b) => b.toLowerCase().includes(q)) : BRAND_NAMES), [q]);

  const pick = (b: string) => {
    onChange(b);
    setOther(false);
    setOpen(false);
    setQuery('');
  };
  const pickOther = (text = '') => {
    setOther(true);
    onChange(text);
    setOpen(false);
    setQuery('');
  };

  const label = other ? 'Other brand' : known ?? 'Select a brand';

  return (
    <div ref={root} className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center gap-3 !py-1.5 text-left"
      >
        {other ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-label/5 text-secondary"><Pencil className="h-4 w-4" aria-hidden /></span>
        ) : (
          <BrandLogo make={known} size={36} />
        )}
        <span className={cn('min-w-0 flex-1 truncate', !known && !other && 'text-secondary')}>{label}</span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-secondary transition', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div className="overflow-hidden rounded-2xl border bg-surface shadow-lg hairline" aria-label="Brands">
          <div className="flex items-center gap-2 border-b px-3 hairline">
            <Search className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brands"
              aria-label="Search brands"
              className="min-h-[44px] w-full bg-transparent text-[16px] outline-none"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto overscroll-contain py-1">
            {list.map((b) => (
              <li key={b}>
                <button
                  type="button"
                  onClick={() => pick(b)}
                  aria-current={b === known ? 'true' : undefined}
                  className={cn('flex min-h-[48px] w-full items-center gap-3 px-3 text-left text-[16px] hover:bg-label/5 active:bg-label/10', b === known && 'bg-tint/10 font-semibold text-tint')}
                >
                  <BrandLogo make={b} size={32} />
                  {b}
                </button>
              </li>
            ))}
            <li className="border-t hairline">
              <button type="button" onClick={() => pickOther(q && !list.length ? query.trim() : '')} className="flex min-h-[48px] w-full items-center gap-3 px-3 text-left text-[16px] font-semibold text-tint hover:bg-label/5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-tint/10"><Pencil className="h-4 w-4" aria-hidden /></span>
                {q && !list.length ? `Other brand: “${query.trim()}”` : 'Other brand…'}
              </button>
            </li>
          </ul>
        </div>
      )}

      {other && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={80}
          aria-label="Brand name"
          placeholder="Type the brand name"
          className="input"
          autoFocus={!value}
        />
      )}
    </div>
  );
}
