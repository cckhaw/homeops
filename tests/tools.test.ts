import { describe, expect, it } from 'vitest';
import { LIFESPANS, airconCost, bulkFactor, lifeStatus } from '@/lib/tools-core';

describe('airconCost', () => {
  it('prices a normal-use wall unit in Singapore', () => {
    const r = airconCost({ region: 'SG', type: 'wall', units: 1, usage: 'normal' });
    // 3 visits a year: 2 general + 1 wash (a wash replaces one general visit) + an overhaul 0.4 times a year
    expect(r.rows.map((x) => [x.service, x.perYear])).toEqual([['general', 2], ['wash', 1], ['overhaul', 0.4]]);
    expect(r.yearLow).toBe(50 + 60 + 60);
    expect(r.yearHigh).toBe(90 + 100 + 100);
    expect(r.symbol).toBe('S$');
  });
  it('scales with units and gives multi-unit discounts', () => {
    expect(bulkFactor(1)).toBe(1);
    expect(bulkFactor(3)).toBe(0.9);
    expect(bulkFactor(6)).toBe(0.85);
    const one = airconCost({ region: 'SG', type: 'wall', units: 1, usage: 'normal' });
    const four = airconCost({ region: 'SG', type: 'wall', units: 4, usage: 'normal' });
    expect(four.yearLow).toBeGreaterThan(one.yearLow * 3);
    expect(four.yearLow).toBeLessThan(one.yearLow * 4); // discount applies
    expect(four.perUnitLow).toBeLessThan(one.perUnitLow + 1);
  });
  it('costs more for heavier use, cassettes and Malaysia ranges are in RM', () => {
    const light = airconCost({ region: 'MY', type: 'wall', units: 2, usage: 'light' });
    const heavy = airconCost({ region: 'MY', type: 'wall', units: 2, usage: 'heavy' });
    expect(heavy.yearHigh).toBeGreaterThan(light.yearHigh);
    expect(light.symbol).toBe('RM');
    expect(airconCost({ region: 'SG', type: 'cassette', units: 1, usage: 'normal' }).yearLow).toBeGreaterThan(airconCost({ region: 'SG', type: 'wall', units: 1, usage: 'normal' }).yearLow);
  });
  it('keeps low below high and clamps silly unit counts', () => {
    for (const region of ['SG', 'MY'] as const) for (const type of ['wall', 'cassette'] as const) for (const usage of ['light', 'normal', 'heavy'] as const) {
      const r = airconCost({ region, type, units: 3, usage });
      expect(r.yearLow).toBeLessThan(r.yearHigh);
      expect(r.gasLow).toBeLessThan(r.gasHigh);
    }
    expect(airconCost({ region: 'SG', type: 'wall', units: 0, usage: 'normal' }).units).toBe(1);
    expect(airconCost({ region: 'SG', type: 'wall', units: 999, usage: 'normal' }).units).toBe(20);
    expect(airconCost({ region: 'SG', type: 'wall', units: Number.NaN, usage: 'normal' }).units).toBe(1);
  });
});

describe('lifeStatus', () => {
  const fridge = LIFESPANS.find((l) => l.id === 'fridge')!; // 10 to 15 years
  it('moves through the stages with age', () => {
    expect(lifeStatus(fridge, 2).state).toBe('early');
    expect(lifeStatus(fridge, 8).state).toBe('mid');
    expect(lifeStatus(fridge, 12).state).toBe('late');
    expect(lifeStatus(fridge, 15).state).toBe('past');
    expect(lifeStatus(fridge, 20).yearsLeftHigh).toBe(0);
  });
  it('estimates years left and percent used', () => {
    const r = lifeStatus(fridge, 6);
    expect(r.yearsLeftLow).toBe(4);
    expect(r.yearsLeftHigh).toBe(9);
    expect(r.pct).toBe(40);
    expect(lifeStatus(fridge, -3).pct).toBe(0);
  });
  it('has sane data', () => {
    expect(new Set(LIFESPANS.map((l) => l.id)).size).toBe(LIFESPANS.length);
    for (const l of LIFESPANS) { expect(l.min).toBeLessThan(l.max); expect(l.signs.length).toBeGreaterThan(15); }
  });
});

import { addMonthsISO, airconRunningCost, repairOrReplace, warrantyStatus } from '@/lib/tools-core';

describe('warranty expiry', () => {
  it('adds months without spilling into the next month', () => {
    expect(addMonthsISO('2025-01-31', 1)).toBe('2025-02-28');
    expect(addMonthsISO('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonthsISO('2025-03-15', 24)).toBe('2027-03-15');
    expect(addMonthsISO('nope', 12)).toBeNull();
  });
  it('classifies active, ending and expired', () => {
    expect(warrantyStatus('2026-01-01', 24, '2026-06-01')?.state).toBe('active');
    const ending = warrantyStatus('2025-01-01', 24, '2026-12-01')!;
    expect(ending.state).toBe('ending');
    expect(ending.daysLeft).toBe(31);
    expect(warrantyStatus('2025-01-01', 12, '2026-01-01')?.headline).toBe('Expires today');
    const gone = warrantyStatus('2024-01-01', 12, '2025-01-11')!;
    expect(gone.state).toBe('expired');
    expect(gone.daysLeft).toBe(-10);
  });
  it('rejects bad input', () => {
    expect(warrantyStatus('2026-01-01', 0, '2026-02-01')).toBeNull();
    expect(warrantyStatus('', 12, '2026-02-01')).toBeNull();
  });
});

describe('repair or replace', () => {
  const base = { lifespanMax: 12, newPrice: 1000, underWarranty: false };
  it('repairs a young appliance with a cheap fix', () => expect(repairOrReplace({ ...base, age: 3, repairCost: 150 })?.verdict).toBe('repair'));
  it('replaces when the repair is half the price', () => expect(repairOrReplace({ ...base, age: 5, repairCost: 520 })?.verdict).toBe('replace'));
  it('replaces an old appliance when the repair is a big share', () => expect(repairOrReplace({ ...base, age: 13, repairCost: 350 })?.verdict).toBe('replace'));
  it('is a close call in the middle', () => expect(repairOrReplace({ ...base, age: 9, repairCost: 350 })?.verdict).toBe('consider'));
  it('always repairs under warranty and rejects bad input', () => {
    expect(repairOrReplace({ ...base, age: 11, repairCost: 900, underWarranty: true })?.verdict).toBe('repair');
    expect(repairOrReplace({ ...base, age: 3, repairCost: 100, newPrice: 0 })).toBeNull();
  });
});

describe('air-con running cost', () => {
  const i = { hp: 1, hoursPerDay: 8, daysPerMonth: 30, inverter: true, tariff: 0.3, units: 1 };
  it('estimates kWh and cost', () => {
    const r = airconRunningCost(i)!;
    expect(r.kwhMonth).toBe(104); // 0.62 x 8 x 30 x 0.7
    expect(r.costMonth).toBeCloseTo(31.25, 1);
    expect(r.costYear).toBeCloseTo(r.costMonth * 12, 0);
  });
  it('scales with units and costs more for a non-inverter, showing the saving', () => {
    expect(airconRunningCost({ ...i, units: 3 })!.kwhMonth).toBe(Math.round(104.16 * 3));
    const std = airconRunningCost({ ...i, inverter: false })!;
    expect(std.costYear).toBeGreaterThan(airconRunningCost(i)!.costYear);
    expect(std.savingInverterYear).toBeGreaterThan(0);
    expect(airconRunningCost(i)!.savingInverterYear).toBe(0);
  });
  it('rejects bad input', () => expect(airconRunningCost({ ...i, hp: 0 })).toBeNull());
});
