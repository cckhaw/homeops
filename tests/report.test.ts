import { describe, expect, it } from 'vitest';
import { buildSpendReport, csvCell, reportYears } from '@/lib/report-core';

const assets = [
  { id: 'a', name: 'Fridge', category: 'Kitchen', installDate: '2025-03-10', purchaseCents: 120000 },
  { id: 'b', name: 'Aircon', category: 'Air Conditioner', installDate: '2024-06-01', purchaseCents: 90000 },
  { id: 'c', name: 'Old TV', category: 'Electronics', installDate: null, purchaseCents: 50000 },
];
const services = [
  { assetId: 'b', serviceDate: '2025-07-15', costCents: 8000 },
  { assetId: 'b', serviceDate: '2025-12-31', costCents: 2000 },
  { assetId: 'a', serviceDate: '2024-01-01', costCents: 999 },
  { assetId: 'a', serviceDate: '2025-01-01', costCents: null },
];

describe('spend report', () => {
  it('totals purchases and service for one year', () => {
    const r = buildSpendReport(assets, services, 2025);
    expect(r.purchaseCents).toBe(120000);
    expect(r.serviceCents).toBe(10000);
    expect(r.totalCents).toBe(130000);
    expect(r.months[2].purchase).toBe(120000);
    expect(r.months[6].service).toBe(8000);
    expect(r.months[11].service).toBe(2000);
  });
  it('ranks assets and categories', () => {
    const r = buildSpendReport(assets, services, 2025);
    expect(r.byAsset.map((a) => a.id)).toEqual(['a', 'b']);
    expect(r.byAsset[1]).toMatchObject({ purchase: 0, service: 10000 });
    expect(r.byCategory[0]).toEqual({ category: 'Kitchen', cents: 120000 });
  });
  it('keeps undated purchases out of every year but reports them', () => {
    expect(buildSpendReport(assets, services, 2025).undatedPurchases).toBe(50000);
    expect(buildSpendReport(assets, services, 2024).purchaseCents).toBe(90000);
  });
  it('lists years that have spending, newest first, and always the current year', () => {
    expect(reportYears(assets, services, 2026)).toEqual([2026, 2025, 2024]);
  });
  it('escapes CSV and neutralises formulas', () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell(12.5)).toBe('12.5');
  });
});
