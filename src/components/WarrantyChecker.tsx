'use client';

import { useMemo, useState } from 'react';
import { warrantyStatus } from '@/lib/tools-core';
import { cn } from '@/lib/utils';

const TONE = { active: 'text-ok', ending: 'text-warn', expired: 'text-bad' } as const;
const PRESETS = [{ m: 12, l: '1 year' }, { m: 24, l: '2 years' }, { m: 36, l: '3 years' }, { m: 60, l: '5 years' }, { m: 120, l: '10 years' }];
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function WarrantyChecker() {
  const [date, setDate] = useState(() => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() - 10); return d.toISOString().slice(0, 10); });
  const [months, setMonths] = useState(12);
  const r = useMemo(() => warrantyStatus(date, months, today()), [date, months]);
  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="warranty-checker">
      <form className="space-y-4 rounded-2xl border bg-surface p-5 hairline" onSubmit={(e) => e.preventDefault()} aria-label="Warranty expiry calculator">
        <label className="block"><span className="field-label">Purchase (or delivery) date</span>
          <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} aria-label="Purchase date" /></label>
        <label className="block"><span className="field-label">Warranty length (months)</span>
          <input className="input" type="number" min={1} max={240} inputMode="numeric" value={months} onChange={(e) => setMonths(Math.max(1, Math.min(240, Math.round(Number(e.target.value)) || 1)))} aria-label="Warranty months" /></label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Common warranty lengths">
          {PRESETS.map((p) => <button key={p.m} type="button" onClick={() => setMonths(p.m)} className={cn('min-h-[40px] rounded-full border px-4 text-[14px] font-medium hairline', months === p.m ? 'bg-tint text-ontint' : 'bg-surface')}>{p.l}</button>)}
        </div>
        <p className="text-[13px] text-secondary">Most warranties start on the purchase or delivery date on your receipt, not the day you unboxed it. Check your warranty card for the exact start.</p>
      </form>
      <div className="space-y-3 rounded-2xl border bg-surface p-5 hairline" data-testid="warranty-result" aria-live="polite">
        {r ? (<>
          <p className={cn('text-[24px] font-bold', TONE[r.state])}>{r.headline}</p>
          <p className="text-[16px]">Warranty ends on <b data-testid="warranty-end">{fmt(r.endISO)}</b>.</p>
          <p className="text-[15px]">{r.advice}</p>
        </>) : <p className="text-secondary">Enter a purchase date and a warranty length.</p>}
      </div>
    </div>
  );
}
