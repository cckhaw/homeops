export const UTILITY_KINDS = [
  { id: 'electricity', label: 'Electricity', unit: 'kWh' },
  { id: 'water', label: 'Water', unit: 'm³' },
  { id: 'gas', label: 'Gas', unit: 'm³' },
  { id: 'internet', label: 'Internet / phone', unit: '' },
  { id: 'other', label: 'Other', unit: '' },
] as const;
export type UtilityKind = (typeof UTILITY_KINDS)[number]['id'];
export const isUtilityKind = (k: string): k is UtilityKind => UTILITY_KINDS.some((x) => x.id === k);

/** "2025-03" or "2025-03-17" → "2025-03-01"; null for anything else. */
export function monthStart(input: string | null | undefined): string | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/.exec((input ?? '').trim());
  return m ? `${m[1]}-${m[2]}-01` : null;
}

export type Bill = { kind: string; period: string; amountCents: number; usage?: number | null };
export type Spike = { period: string; amountCents: number; averageCents: number; pct: number };

/** A month "spikes" when it is ≥ 30 % above the average of the three months before it (needs at least two of them). */
export const SPIKE_RATIO = 1.3;

export function detectSpikes(bills: Bill[], kind: string): Spike[] {
  const rows = bills.filter((b) => b.kind === kind).sort((a, b) => a.period.localeCompare(b.period));
  const out: Spike[] = [];
  for (let i = 2; i < rows.length; i++) {
    const prev = rows.slice(Math.max(0, i - 3), i);
    const avg = prev.reduce((n, b) => n + b.amountCents, 0) / prev.length;
    if (avg > 0 && rows[i].amountCents >= avg * SPIKE_RATIO) {
      out.push({ period: rows[i].period, amountCents: rows[i].amountCents, averageCents: Math.round(avg), pct: Math.round((rows[i].amountCents / avg - 1) * 100) });
    }
  }
  return out;
}

/** Last `n` months (oldest first) for one utility, with gaps shown as null so a missing bill is visible on the chart. */
export function monthlySeries(bills: Bill[], kind: string, endPeriod: string, n = 12): { period: string; amountCents: number | null }[] {
  const byPeriod = new Map(bills.filter((b) => b.kind === kind).map((b) => [b.period, b.amountCents]));
  const [ey, em] = endPeriod.split('-').map(Number);
  const out: { period: string; amountCents: number | null }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ey, em - 1 - i, 1));
    const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
    out.push({ period, amountCents: byPeriod.get(period) ?? null });
  }
  return out;
}

/** Total per calendar year (all utilities). */
export function yearlyTotals(bills: Bill[]): { year: number; cents: number }[] {
  const m = new Map<number, number>();
  for (const b of bills) m.set(Number(b.period.slice(0, 4)), (m.get(Number(b.period.slice(0, 4))) ?? 0) + b.amountCents);
  return [...m].map(([year, cents]) => ({ year, cents })).sort((a, b) => b.year - a.year);
}
