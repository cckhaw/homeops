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
