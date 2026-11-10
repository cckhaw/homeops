import { addDays } from './utils';

/** Landlord-mode rules with no database: rent schedule, arrears, lease state, condition ratings and move-in/out comparison. Unit-tested. */

// ---------------------------------------------------------------- rent schedule
const pad = (n: number) => String(n).padStart(2, '0');
export const periodOf = (iso: string) => iso.slice(0, 7); // '2026-11-03' → '2026-11'
const dueDate = (period: string, day: number) => `${period}-${pad(day)}`;
const nextPeriod = (p: string) => { const [y, m] = p.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`; };

/** The next rent due date on or after `from`: the due day of this month if it has not passed (today counts), otherwise next month's. */
export function nextRentDue(dueDay: number, from: string): string {
  const p = periodOf(from);
  const thisMonth = dueDate(p, dueDay);
  return thisMonth >= from ? thisMonth : dueDate(nextPeriod(p), dueDay);
}

/** Every rent month whose due date falls inside the tenancy and is on or before `today`, oldest first. The first month counts only if rent was due on or after the start date. */
export function duePeriods(start: string, end: string | null, dueDay: number, today: string): string[] {
  const out: string[] = [];
  let p = periodOf(start);
  if (dueDate(p, dueDay) < start) p = nextPeriod(p);
  const last = end && end < today ? end : today;
  for (let guard = 0; guard < 600; guard++) {
    const d = dueDate(p, dueDay);
    if (d > last) break;
    out.push(p);
    p = nextPeriod(p);
  }
  return out;
}

export type Arrears = { unpaid: string[]; months: number; owedCents: number };
export function arrears(duePeriodsList: string[], paid: { period: string; amountCents: number }[], rentCents: number): Arrears {
  const paidSet = new Set(paid.map((p) => p.period));
  const unpaid = duePeriodsList.filter((p) => !paidSet.has(p));
  return { unpaid, months: unpaid.length, owedCents: unpaid.length * rentCents };
}

/** The oldest unpaid month, which "Mark rent received" settles. */
export const oldestUnpaid = (a: Arrears) => a.unpaid[0] ?? null;

export type LeaseState = 'rolling' | 'active' | 'ending-soon' | 'ended';
export function leaseState(end: string | null, today: string, soonDays = 60): { state: LeaseState; daysLeft: number | null } {
  if (!end) return { state: 'rolling', daysLeft: null };
  const days = Math.round((Date.parse(end) - Date.parse(today)) / 86_400_000);
  return { state: days < 0 ? 'ended' : days <= soonDays ? 'ending-soon' : 'active', daysLeft: days };
}

/** When to remind the landlord about renewal: `lead` days before the lease ends (never in the past: then today). */
export const renewalReminderDate = (end: string, today: string, lead = 60) => { const d = addDays(end, -lead); return d < today ? today : d; };

// ---------------------------------------------------------------- tenancy input
export type TenancyInput = { tenantName: string; startDate: string; endDate: string | null; rentCents: number | null; dueDay: number; depositCents: number | null };
export function validateTenancy(i: TenancyInput): string | null {
  if (!i.tenantName.trim()) return 'Enter the tenant’s name.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.startDate)) return 'Choose the start date.';
  if (i.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(i.endDate)) return 'The end date is not valid.';
  if (i.endDate && i.endDate <= i.startDate) return 'The lease must end after it starts.';
  if (i.rentCents == null || i.rentCents <= 0) return 'Enter the monthly rent.';
  if (!Number.isInteger(i.dueDay) || i.dueDay < 1 || i.dueDay > 28) return 'Rent day must be between 1 and 28 (so it falls in every month).';
  if (i.depositCents != null && i.depositCents < 0) return 'The deposit cannot be negative.';
  return null;
}

// ---------------------------------------------------------------- condition reports
export const CONDITIONS = [
  { id: 'good', label: 'Good', rank: 0 },
  { id: 'fair', label: 'Fair', rank: 1 },
  { id: 'poor', label: 'Poor', rank: 2 },
  { id: 'damaged', label: 'Damaged', rank: 3 },
  { id: 'missing', label: 'Missing', rank: 4 },
] as const;
export type Condition = (typeof CONDITIONS)[number]['id'];
export const isCondition = (c: unknown): c is Condition => CONDITIONS.some((x) => x.id === c);
export const conditionRank = (c: string) => CONDITIONS.find((x) => x.id === c)?.rank ?? 0;
export const conditionLabel = (c: string) => CONDITIONS.find((x) => x.id === c)?.label ?? c;

export const REPORT_KINDS = [
  { id: 'move_in', label: 'Move-in' },
  { id: 'move_out', label: 'Move-out' },
  { id: 'inspection', label: 'Inspection' },
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number]['id'];
export const isReportKind = (k: unknown): k is ReportKind => REPORT_KINDS.some((x) => x.id === k);
export const reportKindLabel = (k: string) => REPORT_KINDS.find((x) => x.id === k)?.label ?? k;

/** Starting checklist: rooms and what to look at. The landlord edits, adds and deletes freely. */
export const DEFAULT_CHECKLIST: { room: string; items: string[] }[] = [
  { room: 'Living room', items: ['Walls and paint', 'Floor', 'Ceiling and lights', 'Windows and curtains', 'Air conditioner'] },
  { room: 'Kitchen', items: ['Walls and tiles', 'Cabinets', 'Sink and taps', 'Hob and hood', 'Fridge'] },
  { room: 'Bedroom', items: ['Walls and paint', 'Floor', 'Wardrobe', 'Windows', 'Air conditioner'] },
  { room: 'Bathroom', items: ['Toilet', 'Basin and taps', 'Shower and tiles', 'Water heater'] },
  { room: 'Entrance and balcony', items: ['Main door and locks', 'Keys and access cards', 'Balcony floor and railing'] },
  { room: 'Meters', items: ['Electricity meter reading', 'Water meter reading', 'Gas meter reading'] },
];

export type ReportItem = { room: string; item: string; condition: string; notes?: string | null; hasPhoto?: boolean };
export type Change = { room: string; item: string; before: Condition; after: Condition; worse: boolean; notes?: string | null };

/** Items whose condition differs between the move-in and move-out reports (matched by room + item, ignoring case), worst first. */
export function compareReports(moveIn: ReportItem[], moveOut: ReportItem[]): Change[] {
  const key = (i: ReportItem) => `${i.room.trim().toLowerCase()}|${i.item.trim().toLowerCase()}`;
  const before = new Map(moveIn.map((i) => [key(i), i]));
  const changes: Change[] = [];
  for (const o of moveOut) {
    const b = before.get(key(o));
    if (!b || !isCondition(b.condition) || !isCondition(o.condition) || b.condition === o.condition) continue;
    changes.push({ room: o.room, item: o.item, before: b.condition, after: o.condition, worse: conditionRank(o.condition) > conditionRank(b.condition), notes: o.notes });
  }
  return changes.sort((a, b) => Number(b.worse) - Number(a.worse) || conditionRank(b.after) - conditionRank(a.after));
}

export function reportSummary(items: ReportItem[]) {
  const counts = Object.fromEntries(CONDITIONS.map((c) => [c.id, 0])) as Record<Condition, number>;
  for (const i of items) if (isCondition(i.condition)) counts[i.condition]++;
  return { total: items.length, counts, issues: counts.poor + counts.damaged + counts.missing, photos: items.filter((i) => i.hasPhoto).length };
}
