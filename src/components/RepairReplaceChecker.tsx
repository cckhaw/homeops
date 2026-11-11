'use client';

import { useMemo, useState } from 'react';
import { LIFESPANS, repairOrReplace } from '@/lib/tools-core';
import { cn } from '@/lib/utils';

const TONE = { repair: 'text-ok', consider: 'text-warn', replace: 'text-bad' } as const;
const num = (v: string, max: number) => Math.max(0, Math.min(max, Number(v) || 0));

export default function RepairReplaceChecker() {
  const [id, setId] = useState('washer');
  const [age, setAge] = useState('7');
  const [repair, setRepair] = useState('280');
  const [price, setPrice] = useState('900');
  const [warranty, setWarranty] = useState(false);
  const l = LIFESPANS.find((x) => x.id === id)!;
  const r = useMemo(() => repairOrReplace({ age: num(age, 60), lifespanMax: l.max, repairCost: num(repair, 1_000_000), newPrice: num(price, 1_000_000), underWarranty: warranty }), [age, repair, price, warranty, l]);
  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="repair-checker">
      <form className="space-y-4 rounded-2xl border bg-surface p-5 hairline" onSubmit={(e) => e.preventDefault()} aria-label="Repair or replace calculator">
        <label className="block"><span className="field-label">Which appliance?</span>
          <select className="input" value={id} onChange={(e) => setId(e.target.value)} aria-label="Appliance">{LIFESPANS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="block"><span className="field-label">How old is it (years)?</span>
          <input className="input" type="number" min={0} step={0.5} inputMode="decimal" value={age} onChange={(e) => setAge(e.target.value)} aria-label="Age in years" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="field-label">Repair quote</span>
            <input className="input" type="number" min={0} inputMode="decimal" value={repair} onChange={(e) => setRepair(e.target.value)} aria-label="Repair quote" /></label>
          <label className="block"><span className="field-label">Price of a new one</span>
            <input className="input" type="number" min={1} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Price of a new one" /></label>
        </div>
        <label className="flex min-h-[44px] items-center gap-3 text-[15px]"><input type="checkbox" className="h-5 w-5" checked={warranty} onChange={(e) => setWarranty(e.target.checked)} aria-label="Still under warranty" />Still under warranty</label>
      </form>
      <div className="space-y-3 rounded-2xl border bg-surface p-5 hairline" data-testid="repair-result" aria-live="polite">
        {r ? (<>
          <p className={cn('text-[24px] font-bold', TONE[r.verdict])} data-testid="repair-verdict">{r.headline}</p>
          <ul className="list-disc space-y-1 pl-5 text-[15px]">{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="rounded-xl bg-label/5 p-3 text-[14px]">Typical lifespan of a {l.name.toLowerCase()}: <b>{l.min} to {l.max} years</b>. Currency does not matter, enter both prices in the same one.</p>
        </>) : <p className="text-secondary">Enter the repair quote and the price of a new one.</p>}
      </div>
    </div>
  );
}
