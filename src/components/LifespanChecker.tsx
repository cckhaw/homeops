'use client';

import { useMemo, useState } from 'react';
import { LIFESPANS, lifeStatus } from '@/lib/tools-core';
import { cn } from '@/lib/utils';

const TONE = { early: 'bg-ok', mid: 'bg-ok', late: 'bg-warn', past: 'bg-bad' } as const;

export default function LifespanChecker() {
  const [id, setId] = useState('aircon');
  const [age, setAge] = useState(7);
  const l = LIFESPANS.find((x) => x.id === id)!;
  const r = useMemo(() => lifeStatus(l, age), [l, age]);
  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="lifespan-checker">
      <form className="space-y-4 rounded-2xl border bg-surface p-5 hairline" onSubmit={(e) => e.preventDefault()} aria-label="Appliance age checker">
        <label className="block"><span className="field-label">Which appliance?</span>
          <select className="input" value={id} onChange={(e) => setId(e.target.value)} aria-label="Appliance">{LIFESPANS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="block"><span className="field-label">How old is it (years)?</span>
          <input className="input" type="number" min={0} max={40} step={0.5} inputMode="decimal" value={age} onChange={(e) => setAge(Math.max(0, Math.min(40, Number(e.target.value) || 0)))} aria-label="Age in years" /></label>
        <p className="text-[13px] text-secondary">Typical lifespan for a {l.name.toLowerCase()}: <b className="text-label">{l.min} to {l.max} years</b>. In hot, humid homes with heavy use, expect the lower end.</p>
      </form>
      <div className="space-y-3 rounded-2xl border bg-surface p-5 hairline" data-testid="lifespan-result" aria-live="polite">
        <p className="text-[22px] font-bold">{r.headline}</p>
        <div className="h-3 overflow-hidden rounded-full bg-label/10" role="img" aria-label={`${r.pct}% of the longest typical lifespan used`}><div className={cn('h-3 rounded-full', TONE[r.state])} style={{ width: `${r.pct}%` }} /></div>
        <p className="text-[14px] text-secondary">{r.pct}% of the longest typical lifespan used{r.state !== 'past' && r.yearsLeftHigh > 0 ? `, roughly ${r.yearsLeftLow > 0 ? `${r.yearsLeftLow} to ` : 'up to '}${r.yearsLeftHigh} years left` : ''}.</p>
        <p className="text-[15px]">{r.advice}</p>
        <p className="rounded-xl bg-label/5 p-3 text-[14px]"><b>Signs it is time:</b> {l.signs}.</p>
      </div>
    </div>
  );
}
