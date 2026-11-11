import { describe, expect, it } from 'vitest';
import { demoDataset, propertyTasks, tenancyRows, ymdMonthsAgo, ymdMonthsAhead, demoEmailFor } from '@/lib/demo-core';
import { CATEGORIES } from '@/lib/utils';
import { HOME_ICONS } from '@/lib/home-icons';
import { CURRENCIES } from '@/lib/locale';
import { DOCUMENT_CATEGORIES } from '@/lib/documents-core';
import { compareReports, DEFAULT_CHECKLIST } from '@/lib/rental-core';

const today = '2026-11-10';
const d = demoDataset();

describe('demo dataset: coverage', () => {
  it('has twelve homes of different types, all with unique keys', () => {
    expect(d.homes).toHaveLength(12);
    expect(new Set(d.homes.map((h) => h.key)).size).toBe(12);
    expect(new Set(d.homes.map((h) => h.icon)).size).toBe(12);
    expect(new Set(d.homes.map((h) => h.icon))).toEqual(new Set(HOME_ICONS.map((i) => i.id)));
  });
  it('spans climates and currencies, all supported by the app', () => {
    expect(new Set(d.homes.map((h) => h.climate))).toEqual(new Set(['tropical', 'temperate']));
    const cur = new Set(d.homes.map((h) => h.currency));
    expect(cur.size).toBeGreaterThanOrEqual(4);
    for (const c of cur) expect(CURRENCIES.some((x) => x.code === c)).toBe(true);
  });
  it('covers every function: assets, services, tasks, docs, bills, property dates, rentals, reports, members, passports', () => {
    const any = (f: (h: (typeof d.homes)[number]) => boolean) => d.homes.some(f);
    expect(d.homes.every((h) => h.assets.length >= 2 && h.tasks.length >= 2 && h.services.length >= 1 && h.docs.length >= 1)).toBe(true);
    expect(any((h) => h.bills.length >= 36)).toBe(true);
    expect(d.homes.filter((h) => h.bills.length > 0).length).toBeGreaterThanOrEqual(8);
    expect(d.homes.filter((h) => (h.property ?? []).length > 0).length).toBeGreaterThanOrEqual(6);
    expect(d.homes.reduce((n, h) => n + (h.tenancies?.length ?? 0), 0)).toBeGreaterThanOrEqual(4);
    expect(d.homes.filter((h) => h.passport).length).toBeGreaterThanOrEqual(3);
    expect(d.homes.filter((h) => h.members.length > 0).length).toBeGreaterThanOrEqual(7);
    expect(d.homes.reduce((n, h) => n + h.assets.length, 0)).toBeGreaterThanOrEqual(50);
  });
});

describe('demo dataset: references and values are valid', () => {
  it('uses real categories and valid references', () => {
    const people = new Set(d.people.map((p) => p.key)), cons = new Set(d.contractors.map((c) => c.key)), homes = new Set(d.homes.map((h) => h.key));
    for (const h of d.homes) {
      const keys = new Set(h.assets.map((x) => x.key));
      expect(keys.size).toBe(h.assets.length);
      for (const x of h.assets) { expect(CATEGORIES as readonly string[]).toContain(x.category); expect(x.priceCents).toBeGreaterThan(0); }
      for (const s of h.services) { expect(keys.has(s.asset)).toBe(true); if (s.contractor) expect(cons.has(s.contractor)).toBe(true); expect(s.daysAgo).toBeGreaterThan(0); }
      for (const t of h.tasks) { if (t.asset) expect(keys.has(t.asset)).toBe(true); if (t.who) expect(people.has(t.who)).toBe(true); }
      for (const m of h.members) expect(people.has(m.person)).toBe(true);
      for (const doc of h.docs) expect(DOCUMENT_CATEGORIES as readonly string[]).toContain(doc.category);
      const tenants = new Set((h.tenancies ?? []).map((t) => t.key));
      for (const r of h.reports ?? []) expect(tenants.has(r.tenancy)).toBe(true);
    }
    for (const c of d.contractors) { expect(c.homes.length).toBeGreaterThanOrEqual(1); for (const k of c.homes) expect(homes.has(k)).toBe(true); }
    expect(d.contractors.filter((c) => c.homes.length >= 3).length).toBeGreaterThanOrEqual(3);
  });
  it('shows warranty states: expired, ending soon and healthy', () => {
    const w = d.homes.flatMap((h) => h.assets.map((x) => x.warrantyDays));
    expect(w.some((x) => x !== null && x < 0)).toBe(true);
    expect(w.some((x) => x !== null && x >= 0 && x <= 30)).toBe(true);
    expect(w.some((x) => x !== null && x > 365)).toBe(true);
    expect(w.some((x) => x === null)).toBe(true);
  });
  it('shows task states: overdue, due soon, later and completed history', () => {
    const t = d.homes.flatMap((h) => h.tasks);
    expect(t.some((x) => x.dueInDays < 0 && !x.doneDaysAgo)).toBe(true);
    expect(t.some((x) => x.dueInDays >= 0 && x.dueInDays <= 14)).toBe(true);
    expect(t.some((x) => x.dueInDays > 60)).toBe(true);
    expect(t.some((x) => x.doneDaysAgo)).toBe(true);
    expect(t.some((x) => x.who)).toBe(true);
  });
  it('has documents about to expire, bills with a spike, and years of service history', () => {
    expect(d.homes.flatMap((h) => h.docs).filter((x) => x.expiresInDays !== null && x.expiresInDays <= 30).length).toBeGreaterThanOrEqual(2);
    expect(d.homes.flatMap((h) => h.bills).some((b) => b.note)).toBe(true);
    const years = new Set(d.homes.flatMap((h) => h.services).map((s) => new Date(Date.parse(today) - s.daysAgo * 86_400_000).getFullYear()));
    expect(years.size).toBeGreaterThanOrEqual(3);
    for (const h of d.homes) for (const b of h.bills) { expect(b.amountCents).toBeGreaterThan(0); expect(b.monthsBack).toBeGreaterThanOrEqual(1); expect(b.monthsBack).toBeLessThanOrEqual(12); }
    for (const h of d.homes) { const seen = new Set<string>(); for (const b of h.bills) { const k = `${b.kind}|${b.monthsBack}`; expect(seen.has(k)).toBe(false); seen.add(k); } }
  });
});

describe('demo rentals', () => {
  it('includes an active tenancy with unpaid months, an ended one, and a move-in/move-out comparison with changes', () => {
    const all = d.homes.flatMap((h) => (h.tenancies ?? []).map((t) => ({ h, t })));
    expect(all.some(({ t }) => tenancyRows(t, today).unpaid > 0 && !t.ended)).toBe(true);
    expect(all.some(({ t }) => t.ended)).toBe(true);
    const lang = d.homes.find((h) => h.key === 'langkawi')!;
    const rep = (kind: string) => lang.reports!.find((r) => r.kind === kind)!;
    const toItems = (r: ReturnType<typeof rep>) => DEFAULT_CHECKLIST.flatMap((room) => room.items.map((item) => ({ room: room.room, item, condition: r.ratings[`${room.room}|${item}`] ?? 'good' })));
    const changes = compareReports(toItems(rep('move_in')), toItems(rep('move_out')));
    expect(changes.some((c) => c.worse)).toBe(true);
    expect(changes[0].worse).toBe(true);
  });
  it('computes sensible tenancy dates', () => {
    for (const h of d.homes) for (const t of h.tenancies ?? []) {
      const r = tenancyRows(t, today);
      expect(r.startDate < today).toBe(true);
      if (r.endDate) expect(r.endDate > r.startDate).toBe(true);
      expect(r.paid.length).toBeLessThanOrEqual(t.paidMonths);
      expect(r.nextDue >= today).toBe(true);
    }
  });
  it('rental report ratings only name real checklist items', () => {
    const valid = new Set(DEFAULT_CHECKLIST.flatMap((r) => r.items.map((i) => `${r.room}|${i}`)));
    for (const h of d.homes) for (const r of h.reports ?? []) for (const k of [...Object.keys(r.ratings), ...Object.keys(r.itemNotes)]) expect(valid.has(k)).toBe(true);
  });
});

describe('helpers', () => {
  it('property tasks come from the real templates with future dates', () => {
    const bukit = d.homes.find((h) => h.key === 'bukit')!;
    const p = propertyTasks(bukit, today);
    expect(p.map((x) => x.title)).toContain('Pay property tax (IRAS)');
    expect(p.map((x) => x.title)).toContain('Renew home / fire insurance');
    for (const x of p) expect(x.dueDate >= today).toBe(true);
  });
  it('date helpers cross year boundaries', () => {
    expect(ymdMonthsAgo('2026-01-15', 2, 5)).toBe('2025-11-05');
    expect(ymdMonthsAgo('2026-11-10', 0, 1)).toBe('2026-11-01');
    expect(ymdMonthsAhead('2026-11-10', 3, 28)).toBe('2027-02-28');
  });
  it('demo e-mails are unroutable', () => {
    expect(demoEmailFor('abcdef12-3456')).toBe('demo-abcdef12@demo.wodejia.invalid');
  });
});
