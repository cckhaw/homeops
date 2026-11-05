import { describe, expect, it } from 'vitest';
import { OVERDUE_REPEAT_MS, pickWarranties, shouldRemindTask, warrantyKindsDue } from '@/lib/reminder-rules';

const A = (id: string, daysLeft: number) => ({ id, name: id, warrantyExpiry: '2027-01-01', daysLeft });

describe('warranty notice kinds', () => {
  it('is silent when switched off, expired, or outside the window', () => {
    expect(warrantyKindsDue(10, 0)).toEqual([]);
    expect(warrantyKindsDue(-1, 30)).toEqual([]);
    expect(warrantyKindsDue(31, 30)).toEqual([]);
  });
  it('sends a lead notice inside the window and a final notice in the last week', () => {
    expect(warrantyKindsDue(30, 30)).toEqual(['lead']);
    expect(warrantyKindsDue(7, 30)).toEqual(['lead', 'final']);
    expect(warrantyKindsDue(0, 30)).toEqual(['lead', 'final']);
    expect(warrantyKindsDue(5, 3)).toEqual(['final']); // lead window shorter than a week
  });
});

describe('pickWarranties', () => {
  it('mails each notice once', () => {
    const first = pickWarranties([A('fridge', 20)], 30, new Set());
    expect(first).toHaveLength(1);
    expect(first[0].kind).toBe('lead');
    expect(pickWarranties([A('fridge', 20)], 30, new Set(['fridge:lead']))).toHaveLength(0);
  });
  it('sends the final notice later even after the lead notice', () => {
    const p = pickWarranties([A('fridge', 5)], 30, new Set(['fridge:lead']));
    expect(p).toHaveLength(1);
    expect(p[0].kind).toBe('final');
  });
  it('sends a single final notice when first noticed inside the last week, and records both', () => {
    const p = pickWarranties([A('tv', 3)], 30, new Set());
    expect(p).toHaveLength(1);
    expect(p[0].kind).toBe('final');
    expect(p[0].marks).toEqual(['lead', 'final']);
  });
  it('orders by urgency and ignores assets outside the window', () => {
    const p = pickWarranties([A('a', 25), A('b', 2), A('c', 90)], 30, new Set());
    expect(p.map((x) => x.asset.id)).toEqual(['b', 'a']);
  });
  it('force (test e-mail) ignores the sent log', () => {
    expect(pickWarranties([A('fridge', 20)], 30, new Set(['fridge:lead']), true)).toHaveLength(1);
  });
});

describe('task reminders', () => {
  const now = 1_800_000_000_000;
  it('mails a new task once, then weekly while overdue', () => {
    expect(shouldRemindTask(3, undefined, now)).toBe(true);
    expect(shouldRemindTask(3, now - 1000, now)).toBe(false);
    expect(shouldRemindTask(-2, now - 1000, now)).toBe(false);
    expect(shouldRemindTask(-2, now - OVERDUE_REPEAT_MS, now)).toBe(true);
    expect(shouldRemindTask(1, now - OVERDUE_REPEAT_MS * 2, now)).toBe(false); // not overdue: never repeated
  });
  it('force always sends', () => {
    expect(shouldRemindTask(3, now - 1000, now, true)).toBe(true);
  });
});
