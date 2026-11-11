'use client';

import { useMemo, useState } from 'react';
import { POWER_REGIONS, airconRunningCost, type PowerRegion } from '@/lib/tools-core';

export default function AirconPowerCalculator() {
  const [region, setRegion] = useState<PowerRegion>('SG');
  const [hp, setHp] = useState(1);
  const [units, setUnits] = useState(2);
  const [hours, setHours] = useState(8);
  const [days, setDays] = useState(30);
  const [inverter, setInverter] = useState(true);
  const [tariff, setTariff] = useState<number | null>(null);
  const reg = POWER_REGIONS.find((x) => x.id === region)!;
  const rate = tariff ?? reg.tariff;
  const r = useMemo(() => airconRunningCost({ hp, hoursPerDay: hours, daysPerMonth: days, inverter, tariff: rate, units }), [hp, hours, days, inverter, rate, units]);
  const money = (n: number) => `${reg.symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="power-calculator">
      <form className="space-y-4 rounded-2xl border bg-surface p-5 hairline" onSubmit={(e) => e.preventDefault()} aria-label="Air-con electricity cost calculator">
        <label className="block"><span className="field-label">Country</span>
          <select className="input" value={region} onChange={(e) => { setRegion(e.target.value as PowerRegion); setTariff(null); }} aria-label="Country">{POWER_REGIONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="field-label">Size (HP)</span>
            <select className="input" value={hp} onChange={(e) => setHp(Number(e.target.value))} aria-label="Size in HP">{[0.75, 1, 1.5, 2, 2.5, 3].map((h) => <option key={h} value={h}>{h} HP</option>)}</select></label>
          <label className="block"><span className="field-label">Number of units</span>
            <input className="input" type="number" min={1} max={20} inputMode="numeric" value={units} onChange={(e) => setUnits(Math.max(1, Math.min(20, Math.round(Number(e.target.value)) || 1)))} aria-label="Number of units" /></label>
          <label className="block"><span className="field-label">Hours a day</span>
            <input className="input" type="number" min={1} max={24} inputMode="decimal" value={hours} onChange={(e) => setHours(Math.max(1, Math.min(24, Number(e.target.value) || 1)))} aria-label="Hours per day" /></label>
          <label className="block"><span className="field-label">Days a month</span>
            <input className="input" type="number" min={1} max={31} inputMode="numeric" value={days} onChange={(e) => setDays(Math.max(1, Math.min(31, Math.round(Number(e.target.value)) || 1)))} aria-label="Days per month" /></label>
        </div>
        <label className="block"><span className="field-label">Electricity price per kWh ({reg.symbol})</span>
          <input className="input" type="number" min={0} step={0.01} inputMode="decimal" value={rate} onChange={(e) => setTariff(Math.max(0, Number(e.target.value) || 0))} aria-label="Price per kWh" /></label>
        <label className="flex min-h-[44px] items-center gap-3 text-[15px]"><input type="checkbox" className="h-5 w-5" checked={inverter} onChange={(e) => setInverter(e.target.checked)} aria-label="Inverter model" />Inverter model (most air-cons sold in the last ten years)</label>
        <p className="text-[13px] text-secondary">The price is a typical figure. Check your latest bill for your real rate per kWh and enter it above.</p>
      </form>
      <div className="space-y-3 rounded-2xl border bg-surface p-5 hairline" data-testid="power-result" aria-live="polite">
        {r ? (<>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-secondary">Estimated running cost</p>
          <p className="text-[30px] font-bold" data-testid="power-month">{money(r.costMonth)} <span className="text-[16px] font-medium text-secondary">a month</span></p>
          <p className="text-[16px]"><b data-testid="power-year">{money(r.costYear)}</b> a year, about {r.kwhMonth.toLocaleString('en-US')} kWh a month.</p>
          <ul className="list-disc space-y-1 pl-5 text-[15px]">
            <li>Raising the thermostat by 1°C could save about <b>{money(r.savingOneDegreeYear)}</b> a year.</li>
            {!inverter && r.savingInverterYear > 0 && <li>An inverter model could save about <b data-testid="power-saving">{money(r.savingInverterYear)}</b> a year on this usage.</li>}
            <li>Dirty filters and coils make the compressor work harder. Regular servicing keeps this estimate honest.</li>
          </ul>
        </>) : <p className="text-secondary">Fill in the details to see the cost.</p>}
      </div>
    </div>
  );
}
