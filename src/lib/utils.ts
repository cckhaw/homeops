import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ---------- Constants ----------
export const CATEGORIES = [
  'HVAC',
  'Air Conditioner',
  'Water Purifier',
  'Air Purifier',
  'Water Heater',
  'Refrigerator',
  'Dishwasher',
  'Washer & Dryer',
  'Oven & Range',
  'Roof',
  'Plumbing',
  'Electrical',
  'Garage Door',
  'Water Softener',
  'Smoke & CO Detector',
  'TV & Electronics',
  'Outdoor & Garden',
  'Other',
] as const;

export const FREQUENCIES = ['monthly', 'quarterly', 'biannually', 'yearly'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABEL: Record<string, string> = {
  monthly: 'Every month',
  quarterly: 'Every 3 months',
  biannually: 'Every 6 months',
  yearly: 'Every year',
};

const FREQUENCY_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, biannually: 6, yearly: 12 };

// ---------- Dates (all date columns are 'YYYY-MM-DD' strings) ----------
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Adds the recurrence interval, clamping to the last day of shorter months. */
export function addFrequency(iso: string, frequency: string): string {
  const months = FREQUENCY_MONTHS[frequency] ?? 12;
  const d = parseISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toISODate(d);
}

/** Whole days from today until the date (negative when in the past). */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const today = parseISODate(todayISO());
  return Math.round((parseISODate(iso).getTime() - today.getTime()) / 86_400_000);
}

export function formatDate(iso: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions, locale = 'en-US'): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? parseISODate(iso.slice(0, 10)) : iso;
  return d.toLocaleDateString(locale, opts ?? { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatMonth(iso: string, locale = 'en-US'): string {
  return parseISODate(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function relativeDue(iso: string, locale = 'en-US'): string {
  const n = daysUntil(iso);
  if (n === null) return '';
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  if (n === -1) return '1 day overdue';
  if (n < 0) return `${-n} days overdue`;
  if (n < 45) return `Due in ${n} days`;
  return `Due ${formatDate(iso, { month: 'short', day: 'numeric' }, locale)}`;
}

// ---------- Money ----------
/** `cents` is the amount × 100 (kept uniform for every currency; Intl applies each currency's own decimals). */
export function formatCurrency(cents: number | null | undefined, currency = 'USD', locale = 'en-US'): string {
  if (cents === null || cents === undefined) return '—';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

export function parseCurrencyToCents(input: string | null | undefined): number | null {
  if (!input) return null;
  const n = Number.parseFloat(input.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

// ---------- Warranty & health ----------
export type WarrantyState = { label: string; tone: 'ok' | 'warn' | 'bad' | 'none' };

export function warrantyState(expiry: string | null | undefined, locale = 'en-US'): WarrantyState {
  const n = daysUntil(expiry);
  if (n === null) return { label: 'No warranty on file', tone: 'none' };
  if (n < 0) return { label: `Expired ${formatDate(expiry, undefined, locale)}`, tone: 'bad' };
  if (n <= 90) return { label: `Expires in ${n} day${n === 1 ? '' : 's'}`, tone: 'warn' };
  return { label: `Covered until ${formatDate(expiry, undefined, locale)}`, tone: 'ok' };
}

export function healthScore(input: {
  installDate: string | null;
  warrantyExpiry: string | null;
  overdueTasks: number;
}): { score: number; tone: 'ok' | 'warn' | 'bad' } {
  let score = 100;
  score -= Math.min(input.overdueTasks * 20, 50);
  const w = daysUntil(input.warrantyExpiry);
  if (w !== null && w < 0) score -= 10;
  if (input.installDate) {
    const years = -((daysUntil(input.installDate) ?? 0) / 365);
    if (years > 15) score -= 25;
    else if (years > 10) score -= 15;
    else if (years > 7) score -= 5;
  }
  score = Math.max(0, Math.min(100, score));
  return { score, tone: score >= 80 ? 'ok' : score >= 55 ? 'warn' : 'bad' };
}

// ---------- Seasonal maintenance templates ----------
export type TaskTemplate = { title: string; frequency: Frequency; month?: number; day?: number; offsetDays?: number };

/** Four seasons: furnace, gutters, frost. Seeded for temperate homes (the default). */
export const TEMPERATE_TEMPLATES: TaskTemplate[] = [
  { title: 'Test smoke & CO detectors', frequency: 'biannually', month: 3, day: 10 },
  { title: 'Service A/C before summer', frequency: 'yearly', month: 4, day: 1 },
  { title: 'Replace HVAC air filter', frequency: 'quarterly', month: 1, day: 15 },
  { title: 'Inspect roof & flashing', frequency: 'yearly', month: 5, day: 1 },
  { title: 'Clean dryer vent', frequency: 'yearly', month: 6, day: 1 },
  { title: 'Service furnace / heating', frequency: 'yearly', month: 9, day: 15 },
  { title: 'Clean gutters & downspouts', frequency: 'biannually', month: 10, day: 15 },
  { title: 'Winterize outdoor faucets', frequency: 'yearly', month: 10, day: 25 },
  { title: 'Flush water heater', frequency: 'yearly', month: 1, day: 20 },
];

/** Year-round heat and humidity, monsoon rains: aircon care, drains, damp, termites and mosquito prevention. */
export const TROPICAL_TEMPLATES: TaskTemplate[] = [
  { title: 'Clean air-conditioner filters', frequency: 'monthly', offsetDays: 14 },
  { title: 'Aircon servicing (chemical wash)', frequency: 'biannually', offsetDays: 45 },
  { title: 'Check for stagnant water (mosquito prevention)', frequency: 'monthly', offsetDays: 7 },
  { title: 'Clean roof gutters & drains before monsoon', frequency: 'biannually', month: 10, day: 1 },
  { title: 'Inspect roof & ceiling for leaks', frequency: 'yearly', month: 10, day: 15 },
  { title: 'Termite inspection', frequency: 'yearly', month: 3, day: 1 },
  { title: 'Clean water tank & check filters', frequency: 'biannually', offsetDays: 60 },
  { title: 'Test smoke detectors', frequency: 'biannually', month: 3, day: 10 },
  { title: 'Test earth-leakage breaker (RCCB)', frequency: 'quarterly', offsetDays: 30 },
  { title: 'Check for mould & damp (wardrobes, bathrooms)', frequency: 'quarterly', offsetDays: 21 },
  { title: 'Inspect water heater', frequency: 'yearly', offsetDays: 90 },
];

/** Kept for existing imports: the default (temperate) set. */
export const SEASONAL_TEMPLATES = TEMPERATE_TEMPLATES;

export const templatesFor = (climate: string | null | undefined): TaskTemplate[] =>
  climate === 'tropical' ? TROPICAL_TEMPLATES : TEMPERATE_TEMPLATES;

/** First due date for a template: a fixed month/day (next occurrence) or N days from now. */
export function templateDueDate(t: TaskTemplate, from = new Date()): string {
  if (t.month && t.day) return nextOccurrence(t.month, t.day, from);
  return addDays(toISODate(from), t.offsetDays ?? 30);
}

/**
 * Next date for a yearly month/day. If this year's date passed within `graceDays`,
 * the season is still current, so schedule it a week out instead of waiting a year.
 */
export function nextOccurrence(month: number, day: number, from = new Date(), graceDays = 45): string {
  const today = toISODate(from);
  const thisYear = toISODate(new Date(from.getFullYear(), month - 1, day));
  if (thisYear >= today) return thisYear;
  if (-(daysUntil(thisYear) ?? -999) <= graceDays) return addDays(today, 7);
  return toISODate(new Date(from.getFullYear() + 1, month - 1, day));
}

export type AssetTaskTemplate = { title: string; frequency: Frequency; offsetDays: number };

/** Suggested recurring tasks generated when an asset in this category is added. */
export const CATEGORY_TASKS: Record<string, AssetTaskTemplate[]> = {
  HVAC: [
    { title: 'Replace filter', frequency: 'quarterly', offsetDays: 30 },
    { title: 'Professional tune-up', frequency: 'yearly', offsetDays: 150 },
  ],
  'Water Heater': [
    { title: 'Flush tank', frequency: 'yearly', offsetDays: 90 },
    { title: 'Test pressure-relief valve', frequency: 'yearly', offsetDays: 90 },
  ],
  Refrigerator: [
    { title: 'Clean condenser coils', frequency: 'biannually', offsetDays: 60 },
    { title: 'Replace water filter', frequency: 'biannually', offsetDays: 90 },
  ],
  Dishwasher: [{ title: 'Clean filter & run cleaner cycle', frequency: 'monthly', offsetDays: 30 }],
  'Washer & Dryer': [
    { title: 'Clean lint trap & vent', frequency: 'yearly', offsetDays: 60 },
    { title: 'Run washer clean cycle', frequency: 'monthly', offsetDays: 30 },
  ],
  'Oven & Range': [{ title: 'Deep clean & inspect seals', frequency: 'biannually', offsetDays: 90 }],
  Roof: [{ title: 'Inspect shingles & flashing', frequency: 'yearly', offsetDays: 120 }],
  Plumbing: [{ title: 'Check for leaks under sinks', frequency: 'quarterly', offsetDays: 30 }],
  Electrical: [{ title: 'Test GFCI outlets', frequency: 'quarterly', offsetDays: 30 }],
  'Garage Door': [{ title: 'Lubricate & test auto-reverse', frequency: 'biannually', offsetDays: 45 }],
  'Water Softener': [{ title: 'Refill salt & clean brine tank', frequency: 'quarterly', offsetDays: 30 }],
  'Air Conditioner': [
    { title: 'Clean filters', frequency: 'monthly', offsetDays: 14 },
    { title: 'Professional servicing (chemical wash)', frequency: 'biannually', offsetDays: 60 },
  ],
  'Water Purifier': [
    { title: 'Replace filters', frequency: 'biannually', offsetDays: 90 },
    { title: 'Sanitise & service', frequency: 'yearly', offsetDays: 150 },
  ],
  'Air Purifier': [
    { title: 'Clean pre-filter', frequency: 'monthly', offsetDays: 14 },
    { title: 'Replace HEPA filter', frequency: 'yearly', offsetDays: 180 },
  ],
  'Smoke & CO Detector': [{ title: 'Test & replace batteries', frequency: 'biannually', offsetDays: 30 }],
};
