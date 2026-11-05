'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import AssetCard from './AssetCard';
import GlassCard from './GlassCard';
import type { Asset } from '@/db/schema';
import { cn } from '@/lib/utils';

/** Searchable, filterable list of a home's assets (instant, in the browser — a home has dozens, not millions). */
export default function AssetList({ assets, overdue, locale }: { assets: Asset[]; overdue: Record<string, number>; locale: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(assets.map((a) => a.category))].sort((a, b) => a.localeCompare(b)), [assets]);
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      assets.filter((a) => {
        if (category && a.category !== category) return false;
        if (!q) return true;
        return [a.name, a.category, a.make, a.model, a.makeModel, a.serialNumber, a.notes].some((f) => f?.toLowerCase().includes(q));
      }),
    [assets, q, category],
  );

  if (assets.length === 0) {
    return <GlassCard className="py-10 text-center text-secondary">No assets yet. Tap “Add asset” to create your first passport entry.</GlassCard>;
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, brand, model, serial number…"
            aria-label="Search assets"
            className="input pl-10 pr-11"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-0 top-0 grid h-[44px] w-11 place-items-center text-secondary">
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
            {[null, ...categories].map((c) => (
              <button
                key={c ?? 'all'}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={cn('min-h-[36px] shrink-0 rounded-full px-3.5 text-[14px] font-semibold transition', category === c ? 'bg-tint text-ontint' : 'bg-label/5 text-secondary hover:bg-label/10')}
              >
                {c ?? 'All'}
              </button>
            ))}
          </div>
        )}
        <p className="px-1 text-[13px] text-secondary" aria-live="polite">
          {shown.length === assets.length ? `${assets.length} asset${assets.length === 1 ? '' : 's'}` : `${shown.length} of ${assets.length} assets`}
        </p>
      </div>
      {shown.length === 0 ? (
        <GlassCard className="py-10 text-center text-secondary">No assets match your search.</GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((a) => (
            <AssetCard key={a.id} asset={a} overdueTasks={overdue[a.id] ?? 0} locale={locale} />
          ))}
        </div>
      )}
    </>
  );
}
