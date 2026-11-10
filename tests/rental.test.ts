import { describe, expect, it } from 'vitest';
import { CONDITIONS, DEFAULT_CHECKLIST, arrears, compareReports, duePeriods, leaseState, nextRentDue, oldestUnpaid, renewalReminderDate, reportSummary, validateTenancy } from '@/lib/rental-core';

describe('nextRentDue', () => {
  it('is this month if the due day has not passed, today included', () => {
    expect(nextRentDue(5, '2026-11-03')).toBe('2026-11-05');
    expect(nextRentDue(5, '2026-11-05')).toBe('2026-11-05');
  });
  it('rolls to next month, including across the year end', () => {
    expect(nextRentDue(5, '2026-11-06')).toBe('2026-12-05');
    expect(nextRentDue(1, '2026-12-15')).toBe('2027-01-01');
  });
});

describe('duePeriods and arrears', () => {
  it('counts each rent month that has fallen due since the lease began', () => {
    expect(duePeriods('2026-08-10', null, 5, '2026-11-06')).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(duePeriods('2026-08-03', null, 5, '2026-11-04')).toEqual(['2026-08', '2026-09', '2026-10']);
  });
  it('stops at the end of the lease and handles a lease that has not started', () => {
    expect(duePeriods('2026-01-01', '2026-03-31', 1, '2026-11-06')).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(duePeriods('2027-01-01', null, 1, '2026-11-06')).toEqual([]);
  });
  it('finds unpaid months, the amount owed and the oldest one', () => {
    const due = duePeriods('2026-08-01', null, 1, '2026-11-06');
    const a = arrears(due, [{ period: '2026-08', amountCents: 200000 }, { period: '2026-10', amountCents: 200000 }], 200000);
    expect(a.unpaid).toEqual(['2026-09', '2026-11']);
    expect(a.months).toBe(2);
    expect(a.owedCents).toBe(400000);
    expect(oldestUnpaid(a)).toBe('2026-09');
    expect(oldestUnpaid(arrears(due, due.map((period) => ({ period, amountCents: 1 })), 1))).toBeNull();
  });
});

describe('leaseState and renewal reminder', () => {
  it('classifies the lease', () => {
    expect(leaseState(null, '2026-11-06')).toEqual({ state: 'rolling', daysLeft: null });
    expect(leaseState('2027-06-01', '2026-11-06').state).toBe('active');
    expect(leaseState('2026-12-20', '2026-11-06')).toEqual({ state: 'ending-soon', daysLeft: 44 });
    expect(leaseState('2026-11-05', '2026-11-06').state).toBe('ended');
    expect(leaseState('2026-11-06', '2026-11-06').state).toBe('ending-soon');
  });
  it('reminds 60 days ahead, never in the past', () => {
    expect(renewalReminderDate('2027-06-30', '2026-11-06')).toBe('2027-05-01');
    expect(renewalReminderDate('2026-12-01', '2026-11-06')).toBe('2026-11-06');
  });
});

describe('validateTenancy', () => {
  const ok = { tenantName: 'Mr Lee', startDate: '2026-11-01', endDate: '2027-10-31', rentCents: 250000, dueDay: 1, depositCents: 500000 };
  it('accepts a good tenancy and a rolling one', () => {
    expect(validateTenancy(ok)).toBeNull();
    expect(validateTenancy({ ...ok, endDate: null, depositCents: null })).toBeNull();
  });
  it('explains what is wrong', () => {
    expect(validateTenancy({ ...ok, tenantName: ' ' })).toMatch(/name/);
    expect(validateTenancy({ ...ok, startDate: '' })).toMatch(/start/);
    expect(validateTenancy({ ...ok, endDate: '2026-10-01' })).toMatch(/after it starts/);
    expect(validateTenancy({ ...ok, rentCents: null })).toMatch(/rent/);
    expect(validateTenancy({ ...ok, rentCents: 0 })).toMatch(/rent/);
    expect(validateTenancy({ ...ok, dueDay: 31 })).toMatch(/1 and 28/);
    expect(validateTenancy({ ...ok, dueDay: 1.5 })).toMatch(/1 and 28/);
    expect(validateTenancy({ ...ok, depositCents: -1 })).toMatch(/deposit/);
  });
});

describe('condition reports', () => {
  const moveIn = [
    { room: 'Living room', item: 'Walls and paint', condition: 'good' },
    { room: 'Kitchen', item: 'Hob and hood', condition: 'fair' },
    { room: 'Bathroom', item: 'Toilet', condition: 'good' },
    { room: 'Bedroom', item: 'Wardrobe', condition: 'poor' },
  ];
  const moveOut = [
    { room: 'living room', item: 'WALLS and paint', condition: 'damaged', notes: 'Large marks' },
    { room: 'Kitchen', item: 'Hob and hood', condition: 'good' },
    { room: 'Bathroom', item: 'Toilet', condition: 'good' },
    { room: 'Bedroom', item: 'Wardrobe', condition: 'poor' },
    { room: 'Balcony', item: 'New item', condition: 'missing' },
  ];
  it('finds what changed between move-in and move-out, worst first', () => {
    const c = compareReports(moveIn, moveOut);
    expect(c.map((x) => `${x.item}:${x.before}>${x.after}:${x.worse}`)).toEqual(['WALLS and paint:good>damaged:true', 'Hob and hood:fair>good:false']);
    expect(c[0].notes).toBe('Large marks');
  });
  it('ignores items that are unchanged or only on one report', () => {
    expect(compareReports(moveIn, moveIn)).toEqual([]);
    expect(compareReports([], moveOut)).toEqual([]);
  });
  it('summarises a report', () => {
    const s = reportSummary([...moveOut.map((i) => ({ ...i, hasPhoto: i.condition === 'damaged' }))]);
    expect(s.total).toBe(5);
    expect(s.counts).toMatchObject({ good: 2, poor: 1, damaged: 1, missing: 1, fair: 0 });
    expect(s.issues).toBe(3);
    expect(s.photos).toBe(1);
  });
  it('has a sensible default checklist and condition scale', () => {
    expect(DEFAULT_CHECKLIST.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_CHECKLIST.every((r) => r.items.length >= 3)).toBe(true);
    expect(CONDITIONS.map((c) => c.rank)).toEqual([0, 1, 2, 3, 4]);
  });
});
