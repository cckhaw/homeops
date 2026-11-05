import { describe, expect, it } from 'vitest';
import { maskPhone, toInternational, whatsappLink } from '@/lib/phone';
import { detectSpikes, monthStart, monthlySeries, yearlyTotals } from '@/lib/utilities-core';
import { expiryState } from '@/lib/documents-core';

describe('phone numbers', () => {
  it('keeps numbers typed with a +', () => expect(toInternational('+60 12-345 6789')).toBe('60123456789'));
  it('adds the home country code to a leading 0', () => {
    expect(toInternational('012-345 6789', 'MYR')).toBe('60123456789');
    expect(toInternational('9123 4567', 'SGD')).toBeNull(); // no 0 and no +: ambiguous
    expect(toInternational('0412 345 678', 'AUD')).toBe('61412345678');
  });
  it('understands 00 prefixes and rejects junk', () => {
    expect(toInternational('0044 20 7946 0958')).toBe('442079460958');
    expect(toInternational('abc')).toBeNull();
    expect(toInternational('+12')).toBeNull();
    expect(toInternational('0123', 'XXX')).toBeNull();
  });
  it('builds links and masks', () => {
    expect(whatsappLink('60123456789', 'Hi there')).toBe('https://wa.me/60123456789?text=Hi%20there');
    expect(maskPhone('60123456789')).toBe('+60••••789');
  });
});

describe('utility bills', () => {
  const b = (period: string, amountCents: number, kind = 'electricity') => ({ kind, period, amountCents });
  it('normalises months', () => {
    expect(monthStart('2025-03')).toBe('2025-03-01');
    expect(monthStart('2025-03-17')).toBe('2025-03-01');
    expect(monthStart('2025-13')).toBeNull();
    expect(monthStart('')).toBeNull();
  });
  it('flags a month 30% above the previous three', () => {
    const bills = [b('2025-01-01', 10000), b('2025-02-01', 10000), b('2025-03-01', 10000), b('2025-04-01', 14000), b('2025-05-01', 10500)];
    expect(detectSpikes(bills, 'electricity')).toEqual([{ period: '2025-04-01', amountCents: 14000, averageCents: 10000, pct: 40 }]);
  });
  it('needs history and ignores other utilities', () => {
    expect(detectSpikes([b('2025-01-01', 100), b('2025-02-01', 900)], 'electricity')).toEqual([]);
    expect(detectSpikes([b('2025-01-01', 1, 'water'), b('2025-02-01', 1, 'water'), b('2025-03-01', 99, 'water')], 'electricity')).toEqual([]);
  });
  it('shows gaps in a 12-month series across a year boundary', () => {
    const s = monthlySeries([b('2025-01-01', 500)], 'electricity', '2025-02-01', 3);
    expect(s).toEqual([{ period: '2024-12-01', amountCents: null }, { period: '2025-01-01', amountCents: 500 }, { period: '2025-02-01', amountCents: null }]);
  });
  it('totals per year', () => expect(yearlyTotals([b('2024-12-01', 5), b('2025-01-01', 7), b('2025-02-01', 3, 'water')])).toEqual([{ year: 2025, cents: 10 }, { year: 2024, cents: 5 }]));
});

describe('document expiry', () => {
  const today = '2025-06-01';
  it('describes each state', () => {
    expect(expiryState(null, today).tone).toBe('none');
    expect(expiryState('2025-05-30', today)).toMatchObject({ tone: 'bad', daysLeft: -2 });
    expect(expiryState('2025-06-01', today).label).toBe('Expires today');
    expect(expiryState('2025-06-11', today)).toMatchObject({ tone: 'warn', daysLeft: 10 });
    expect(expiryState('2026-01-01', today).tone).toBe('ok');
  });
});
