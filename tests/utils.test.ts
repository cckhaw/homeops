import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDays, addFrequency, daysUntil, formatCurrency, formatDate, healthScore, nextOccurrence, parseCurrencyToCents, relativeDue,
  toISODate, warrantyState,
} from '@/lib/utils';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 5, 12, 0, 0)); // 5 Nov 2026, local time
});
afterEach(() => vi.useRealTimers());

describe('dates', () => {
  it('formats and adds days across month and year ends', () => {
    expect(toISODate(new Date(2026, 0, 9))).toBe('2026-01-09');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('clamps recurring dates to the end of shorter months', () => {
    expect(addFrequency('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(addFrequency('2024-01-31', 'monthly')).toBe('2024-02-29'); // leap year
    expect(addFrequency('2026-08-31', 'quarterly')).toBe('2026-11-30');
    expect(addFrequency('2026-03-15', 'biannually')).toBe('2026-09-15');
    expect(addFrequency('2024-02-29', 'yearly')).toBe('2025-02-28');
  });
  it('counts whole days from today', () => {
    expect(daysUntil('2026-11-05')).toBe(0);
    expect(daysUntil('2026-11-08')).toBe(3);
    expect(daysUntil('2026-11-01')).toBe(-4);
    expect(daysUntil(null)).toBeNull();
  });
  it('words relative due dates', () => {
    expect(relativeDue('2026-11-05')).toBe('Due today');
    expect(relativeDue('2026-11-06')).toBe('Due tomorrow');
    expect(relativeDue('2026-11-04')).toBe('1 day overdue');
    expect(relativeDue('2026-11-01')).toBe('4 days overdue');
    expect(relativeDue('2026-11-15')).toBe('Due in 10 days');
  });
  it('formats ISO dates without timezone drift', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDate(null)).toBe('—');
  });
});

describe('nextOccurrence (seasonal scheduling)', () => {
  it('returns this year when the date is still ahead', () => {
    expect(nextOccurrence(12, 25)).toBe('2026-12-25');
  });
  it('schedules a just-missed season a week out instead of next year', () => {
    expect(nextOccurrence(10, 25)).toBe('2026-11-12'); // missed 11 days ago → today + 7
  });
  it('rolls over to next year when the season is long gone', () => {
    expect(nextOccurrence(3, 10)).toBe('2027-03-10');
  });
});

describe('warranty and health', () => {
  it('classifies warranty state', () => {
    expect(warrantyState(null).tone).toBe('none');
    expect(warrantyState('2026-11-01').tone).toBe('bad');
    expect(warrantyState('2026-12-01').tone).toBe('warn');
    expect(warrantyState('2028-01-01').tone).toBe('ok');
  });
  it('scores asset health', () => {
    expect(healthScore({ installDate: null, warrantyExpiry: null, overdueTasks: 0 }).score).toBe(100);
    expect(healthScore({ installDate: null, warrantyExpiry: null, overdueTasks: 2 }).score).toBe(60);
    expect(healthScore({ installDate: null, warrantyExpiry: null, overdueTasks: 9 }).score).toBe(50); // capped penalty
    expect(healthScore({ installDate: '2005-01-01', warrantyExpiry: '2010-01-01', overdueTasks: 0 }).score).toBe(65);
    expect(healthScore({ installDate: null, warrantyExpiry: null, overdueTasks: 0 }).tone).toBe('ok');
    expect(healthScore({ installDate: null, warrantyExpiry: null, overdueTasks: 2 }).tone).toBe('warn');
    expect(healthScore({ installDate: null, warrantyExpiry: null, overdueTasks: 3 }).tone).toBe('bad');
  });
});

describe('money', () => {
  it('parses user input to cents', () => {
    expect(parseCurrencyToCents('89.50')).toBe(8950);
    expect(parseCurrencyToCents('$1,299')).toBe(129900);
    expect(parseCurrencyToCents('')).toBeNull();
    expect(parseCurrencyToCents('abc')).toBeNull();
  });
  it('formats cents', () => {
    expect(formatCurrency(8950)).toBe('$89.50');
    expect(formatCurrency(null)).toBe('—');
  });
});
