import { addDays, type Frequency } from './utils';

/**
 * Recurring property obligations for Singapore and Malaysia homes, offered as ready-made schedule tasks.
 * Dates here are *typical*: authorities and management bodies differ, so every date is editable and the hint
 * tells people to check their own bill. Pure (no database) and unit-tested.
 */
export type Region = 'MY' | 'SG' | 'OTHER';
export const REGIONS: { id: Region; label: string }[] = [
  { id: 'MY', label: 'Malaysia' },
  { id: 'SG', label: 'Singapore' },
  { id: 'OTHER', label: 'Somewhere else' },
];
export const isRegion = (r: unknown): r is Region => REGIONS.some((x) => x.id === r);

export type PropertyTemplate = {
  id: string;
  regions: Region[]; // where it is suggested ('OTHER' templates are shown to everyone as general ones)
  title: string;
  frequency: Frequency;
  /** Typical due date as month/day; when absent the person must choose the first date (e.g. an insurance renewal). */
  month?: number;
  day?: number;
  /** Offset used instead of a fixed date: "the 1st of next month". */
  firstOfNextMonth?: boolean;
  hint: string;
};

export const PROPERTY_TEMPLATES: PropertyTemplate[] = [
  { id: 'my-quit-rent', regions: ['MY'], title: 'Pay quit rent (cukai tanah)', frequency: 'yearly', month: 5, day: 31, hint: 'Land quit rent is billed once a year; most states ask for payment by 31 May. Check your land office notice.' },
  { id: 'my-assessment', regions: ['MY'], title: 'Pay assessment tax (cukai pintu)', frequency: 'biannually', month: 2, day: 28, hint: 'Local councils usually bill twice a year, due around the end of February and the end of August. Check your bill.' },
  { id: 'my-strata', regions: ['MY'], title: 'Pay maintenance fee and sinking fund (strata)', frequency: 'quarterly', firstOfNextMonth: true, hint: 'Condominium and apartment management bodies bill monthly or quarterly. Change “every 3 months” to monthly if yours does.' },
  { id: 'sg-property-tax', regions: ['SG'], title: 'Pay property tax (IRAS)', frequency: 'yearly', month: 1, day: 31, hint: 'IRAS sends the bill in the last months of the year. The due date is printed on your bill, so adjust this date to match.' },
  { id: 'sg-mcst', regions: ['SG'], title: 'Pay condo maintenance fee and sinking fund (MCST)', frequency: 'quarterly', firstOfNextMonth: true, hint: 'Your management corporation bills quarterly in most condos. Check the due date on your notice.' },
  { id: 'sg-conservancy', regions: ['SG'], title: 'Pay service and conservancy charges (S&CC)', frequency: 'monthly', firstOfNextMonth: true, hint: 'HDB flats pay S&CC monthly together with the town council bill. Skip this if you live in a private condo.' },
  { id: 'any-insurance', regions: ['MY', 'SG', 'OTHER'], title: 'Renew home / fire insurance', frequency: 'yearly', hint: 'Choose the date your policy ends. Wodejia reminds you before it does.' },
  { id: 'any-mortgage', regions: ['MY', 'SG', 'OTHER'], title: 'Pay mortgage or home loan', frequency: 'monthly', hint: 'Choose the day your instalment is due each month.' },
];

export const templatesFor = (region: Region) => PROPERTY_TEMPLATES.filter((t) => t.regions.includes(region));

/** The first due date to suggest: the next time month/day comes round (today counts), or the 1st of next month. Null when the person must choose. */
export function suggestedDate(t: PropertyTemplate, today: string): string | null {
  const [y, m, d] = today.split('-').map(Number);
  if (t.firstOfNextMonth) {
    const nm = m === 12 ? 1 : m + 1;
    return `${m === 12 ? y + 1 : y}-${String(nm).padStart(2, '0')}-01`;
  }
  if (!t.month || !t.day) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const thisYear = `${y}-${pad(t.month)}-${pad(Math.min(t.day, new Date(y, t.month, 0).getDate()))}`;
  if (thisYear >= today) return thisYear;
  return `${y + 1}-${pad(t.month)}-${pad(Math.min(t.day, new Date(y + 1, t.month, 0).getDate()))}`;
}

/** Region guess from the home's currency (then the language region): MYR → Malaysia, SGD → Singapore. */
export function guessRegion(currency: string | null | undefined, locale: string | null | undefined): Region {
  if (currency === 'MYR') return 'MY';
  if (currency === 'SGD') return 'SG';
  if (/-MY$/.test(locale ?? '')) return 'MY';
  if (/-SG$/.test(locale ?? '')) return 'SG';
  return 'OTHER';
}

export type PropertyPick = { id: string; frequency: string; dueDate: string };
export type PickResult = { ok: true; tasks: { title: string; frequency: Frequency; dueDate: string }[] } | { ok: false; error: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const FREQS: Frequency[] = ['monthly', 'quarterly', 'biannually', 'yearly'];

/** Checks what the person selected against the known templates and turns it into tasks. Unknown ids and malformed dates are refused, past dates too far back are refused. */
export function validatePicks(picks: PropertyPick[], today: string): PickResult {
  if (!picks.length) return { ok: false, error: 'Tick at least one reminder.' };
  const tasks: { title: string; frequency: Frequency; dueDate: string }[] = [];
  const seen = new Set<string>();
  for (const p of picks) {
    const t = PROPERTY_TEMPLATES.find((x) => x.id === p.id);
    if (!t || seen.has(p.id)) return { ok: false, error: 'That reminder is not available.' };
    seen.add(p.id);
    if (!ISO.test(p.dueDate) || Number.isNaN(Date.parse(p.dueDate))) return { ok: false, error: `Choose a date for “${t.title}”.` };
    if (p.dueDate < addDays(today, -31)) return { ok: false, error: `The date for “${t.title}” is in the past. Choose the next one.` };
    const frequency = (FREQS as string[]).includes(p.frequency) ? (p.frequency as Frequency) : t.frequency;
    tasks.push({ title: t.title, frequency, dueDate: p.dueDate });
  }
  return { ok: true, tasks };
}
