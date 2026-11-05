export type ReportAsset = { id: string; name: string; category: string; installDate: string | null; purchaseCents: number | null };
export type ReportService = { assetId: string; serviceDate: string; costCents: number | null };

export type SpendReport = {
  year: number;
  totalCents: number;
  purchaseCents: number;
  serviceCents: number;
  /** Cents per month, January first. */
  months: { purchase: number; service: number }[];
  byCategory: { category: string; cents: number }[];
  byAsset: { id: string; name: string; purchase: number; service: number; cents: number }[];
  /** Purchase prices recorded without an install/purchase date can't be placed in a year. */
  undatedPurchases: number;
};

const yearOf = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? Number(d.slice(0, 4)) : null);
const monthOf = (d: string) => Number(d.slice(5, 7)) - 1;

/** Years that have any spending (newest first); always includes `current`. */
export function reportYears(assets: ReportAsset[], services: ReportService[], current: number): number[] {
  const ys = new Set<number>([current]);
  for (const a of assets) if (a.purchaseCents) { const y = yearOf(a.installDate); if (y) ys.add(y); }
  for (const s of services) if (s.costCents) { const y = yearOf(s.serviceDate); if (y) ys.add(y); }
  return [...ys].sort((a, b) => b - a);
}

/** What a household spent in one calendar year: purchases (by install/purchase date) plus service/repair costs. */
export function buildSpendReport(assets: ReportAsset[], services: ReportService[], year: number): SpendReport {
  const months = Array.from({ length: 12 }, () => ({ purchase: 0, service: 0 }));
  const byAsset = new Map<string, { id: string; name: string; purchase: number; service: number; cents: number }>();
  const byCat = new Map<string, number>();
  const info = new Map(assets.map((a) => [a.id, a]));
  const row = (a: ReportAsset) => {
    let r = byAsset.get(a.id);
    if (!r) byAsset.set(a.id, (r = { id: a.id, name: a.name, purchase: 0, service: 0, cents: 0 }));
    return r;
  };
  let undated = 0;
  for (const a of assets) {
    if (!a.purchaseCents) continue;
    if (!a.installDate) { undated += a.purchaseCents; continue; }
    if (yearOf(a.installDate) !== year) continue;
    months[monthOf(a.installDate)].purchase += a.purchaseCents;
    const r = row(a); r.purchase += a.purchaseCents; r.cents += a.purchaseCents;
    byCat.set(a.category, (byCat.get(a.category) ?? 0) + a.purchaseCents);
  }
  for (const s of services) {
    const a = info.get(s.assetId);
    if (!a || !s.costCents || yearOf(s.serviceDate) !== year) continue;
    months[monthOf(s.serviceDate)].service += s.costCents;
    const r = row(a); r.service += s.costCents; r.cents += s.costCents;
    byCat.set(a.category, (byCat.get(a.category) ?? 0) + s.costCents);
  }
  const purchaseCents = months.reduce((n, m) => n + m.purchase, 0);
  const serviceCents = months.reduce((n, m) => n + m.service, 0);
  return {
    year,
    totalCents: purchaseCents + serviceCents,
    purchaseCents,
    serviceCents,
    months,
    byCategory: [...byCat].map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents),
    byAsset: [...byAsset.values()].sort((a, b) => b.cents - a.cents),
    undatedPurchases: undated,
  };
}

/** RFC 4180 CSV cell. Also defuses spreadsheet formulas (=, +, -, @) so a hostile asset name can't run in Excel. */
export function csvCell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
