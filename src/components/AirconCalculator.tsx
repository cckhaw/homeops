'use client';

import { useMemo, useState } from 'react';
import { AIRCON_REGIONS, AIRCON_TYPES, SERVICES, USAGE, airconCost, type AirconRegion, type AirconType, type Usage } from '@/lib/tools-core';

const fmt = (n: number) => n.toLocaleString('en-US');

export default function AirconCalculator() {
  const [region, setRegion] = useState<AirconRegion>('SG');
  const [type, setType] = useState<AirconType>('wall');
  const [units, setUnits] = useState(3);
  const [usage, setUsage] = useState<Usage>('normal');
  const r = useMemo(() => airconCost({ region, type, units, usage }), [region, type, units, usage]);
  const u = USAGE.find((x) => x.id === usage)!;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]" data-testid="aircon-calculator">
      <form className="space-y-4 rounded-2xl border bg-surface p-5 hairline" onSubmit={(e) => e.preventDefault()} aria-label="Air-con cost calculator">
        <label className="block"><span className="field-label">Where are you?</span>
          <select className="input" value={region} onChange={(e) => setRegion(e.target.value as AirconRegion)} aria-label="Country">{AIRCON_REGIONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        <label className="block"><span className="field-label">Type of unit</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as AirconType)} aria-label="Type of unit">{AIRCON_TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        <label className="block"><span className="field-label">How many units?</span>
          <input className="input" type="number" min={1} max={20} inputMode="numeric" value={units} onChange={(e) => setUnits(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} aria-label="Number of units" /></label>
        <fieldset><legend className="field-label">How much do you use them?</legend>
          <div className="space-y-2">{USAGE.map((x) => (
            <label key={x.id} className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border p-3 hairline has-[:checked]:border-tint has-[:checked]:bg-tint/5">
              <input type="radio" name="usage" value={x.id} checked={usage === x.id} onChange={() => setUsage(x.id)} className="mt-1 h-5 w-5 accent-[rgb(var(--tint))]" aria-label={x.label} />
              <span><span className="block text-[15px] font-semibold">{x.label}</span><span className="block text-[13px] text-secondary">{x.hint}</span></span>
            </label>))}</div>
        </fieldset>
      </form>

      <div className="space-y-4" aria-live="polite">
        <div className="rounded-2xl bg-tint p-6 text-ontint" data-testid="aircon-total">
          <p className="text-[13px] font-semibold uppercase tracking-wide opacity-80">Estimated yearly cost</p>
          <p className="mt-1 text-[36px] font-bold leading-tight">{r.symbol}{fmt(r.yearLow)} to {r.symbol}{fmt(r.yearHigh)}</p>
          <p className="mt-1 text-[15px] opacity-90">for {r.units} unit{r.units === 1 ? '' : 's'}, about {r.symbol}{fmt(r.perUnitLow)} to {r.symbol}{fmt(r.perUnitHigh)} per unit a year</p>
        </div>
        <div className="overflow-x-auto rounded-2xl border bg-surface hairline">
          <table className="w-full text-left text-[14px]" data-testid="aircon-table">
            <thead className="text-secondary"><tr><th className="p-3 font-medium">Service</th><th className="p-3 font-medium">Times a year</th><th className="p-3 font-medium">Each visit</th><th className="p-3 font-medium">Per year</th></tr></thead>
            <tbody className="divide-y hairline [&>tr]:border-inherit">{r.rows.map((x) => (
              <tr key={x.service}><td className="p-3"><span className="block font-semibold">{SERVICES.find((s) => s.id === x.service)!.label}</span><span className="block text-[12px] text-secondary">{SERVICES.find((s) => s.id === x.service)!.what}</span></td>
                <td className="p-3">{x.perYear === 0 ? '—' : Number.isInteger(x.perYear) ? x.perYear : `about every ${Math.round(1 / x.perYear)} years`}</td>
                <td className="p-3">{r.symbol}{fmt(x.perVisitLow)}–{fmt(x.perVisitHigh)}</td>
                <td className="p-3">{x.perYear === 0 ? '—' : `${r.symbol}${fmt(x.yearLow)}–${fmt(x.yearHigh)}`}</td></tr>))}</tbody>
          </table>
        </div>
        <p className="text-[14px] text-secondary"><b className="text-label">{u.label} use</b> means a general service about {u.general - u.wash > 0 ? `${u.general - u.wash} times` : 'no times'} a year plus {u.wash === 1 ? 'one chemical wash' : `${u.wash} chemical washes`}. If an air-con is not cooling, a gas top-up after finding the leak would be about {r.symbol}{fmt(r.gasLow)}–{fmt(r.gasHigh)} extra for {r.units} unit{r.units === 1 ? '' : 's'}.</p>
      </div>
    </div>
  );
}
