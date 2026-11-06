import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { climateForLocale, currencyForLocale, isSupportedCurrency, isSupportedLocale, LOCALES, pickLocale } from '@/lib/locale';
import { formatCurrency, formatDate, formatMonth, relativeDue, templateDueDate, templatesFor, TEMPERATE_TEMPLATES, TROPICAL_TEMPLATES, CATEGORIES, CATEGORY_TASKS } from '@/lib/utils';

describe('locale detection', () => {
  it('picks the best supported locale from Accept-Language', () => {
    expect(pickLocale('ms-MY,ms;q=0.9,en;q=0.8')).toBe('ms-MY');
    expect(pickLocale('en-SG,en;q=0.9')).toBe('en-SG');
    expect(pickLocale('en-GB')).toBe('en-GB');
    expect(pickLocale('zh-TW,zh;q=0.9')).toBe('zh-CN'); // same language, nearest supported region
    expect(pickLocale('en;q=0.5, ms;q=0.9')).toBe('ms-MY'); // honours q-values
    expect(pickLocale('xx-YY')).toBe('en-US');
    expect(pickLocale('*')).toBe('en-US');
    expect(pickLocale(null)).toBe('en-US');
  });
  it('validates saved values', () => {
    expect(isSupportedLocale('en-MY')).toBe(true);
    expect(isSupportedLocale('klingon')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedCurrency('MYR')).toBe(true);
    expect(isSupportedCurrency('XYZ')).toBe(false);
  });
  it('every listed locale is accepted by Intl', () => {
    for (const l of LOCALES) expect(() => new Intl.DateTimeFormat(l.code).format(new Date())).not.toThrow();
  });
});

describe('regional defaults', () => {
  it('maps a locale to its currency and climate', () => {
    expect(currencyForLocale('en-MY')).toBe('MYR');
    expect(currencyForLocale('ms-MY')).toBe('MYR');
    expect(currencyForLocale('en-SG')).toBe('SGD');
    expect(currencyForLocale('en-GB')).toBe('GBP');
    expect(currencyForLocale('de-DE')).toBe('EUR');
    expect(currencyForLocale('en-US')).toBe('USD');
    expect(climateForLocale('en-MY')).toBe('tropical');
    expect(climateForLocale('id-ID')).toBe('tropical');
    expect(climateForLocale('en-GB')).toBe('temperate');
    expect(climateForLocale('en-US')).toBe('temperate');
  });
});

describe('locale-aware formatting', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 5, 12)); });
  afterEach(() => vi.useRealTimers());

  it('formats currency in the home currency', () => {
    expect(formatCurrency(8950, 'MYR', 'en-MY')).toMatch(/RM\s?89\.50/);
    expect(formatCurrency(8950, 'USD', 'en-US')).toBe('$89.50');
    expect(formatCurrency(150000, 'JPY', 'ja-JP')).toMatch(/1,500/); // zero-decimal currency: 1500 yen, not 150000
    expect(formatCurrency(null, 'MYR')).toBe('—');
  });
  it('formats dates in the chosen locale without timezone drift', () => {
    expect(formatDate('2026-03-04', undefined, 'en-US')).toMatch(/Mar 4, 2026/);
    expect(formatDate('2026-03-04', undefined, 'en-GB')).toMatch(/4 Mar 2026/);
    expect(formatMonth('2026-03-01', 'en-GB')).toBe('March 2026');
    expect(relativeDue('2027-01-10', 'en-GB')).toMatch(/10 Jan/);
  });
});

describe('seasonal templates by climate', () => {
  it('has unique, valid templates in both sets', () => {
    for (const set of [TEMPERATE_TEMPLATES, TROPICAL_TEMPLATES]) {
      const titles = set.map((t) => t.title.toLowerCase());
      expect(new Set(titles).size).toBe(titles.length);
      for (const t of set) expect(Boolean(t.month && t.day) || typeof t.offsetDays === 'number').toBe(true);
    }
  });
  it('picks the tropical set for tropical homes and the temperate set otherwise', () => {
    expect(templatesFor('tropical')).toBe(TROPICAL_TEMPLATES);
    expect(templatesFor('temperate')).toBe(TEMPERATE_TEMPLATES);
    expect(templatesFor(undefined)).toBe(TEMPERATE_TEMPLATES);
    expect(TROPICAL_TEMPLATES.some((t) => /monsoon|termite|aircon|mosquito/i.test(t.title))).toBe(true);
    expect(TROPICAL_TEMPLATES.some((t) => /winteri|furnace/i.test(t.title))).toBe(false);
  });
  it('computes first due dates from either a fixed day or an offset', () => {
    // Pin "today": the expected dates below are only true relative to a fixed day.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-05T12:00:00'));
    try {
      expect(templateDueDate({ title: 'x', frequency: 'monthly', offsetDays: 14 })).toBe('2026-11-19');
      expect(templateDueDate({ title: 'x', frequency: 'yearly', month: 12, day: 25 })).toBe('2026-12-25');
      // a fixed day that has already passed this year rolls to next year
      expect(templateDueDate({ title: 'x', frequency: 'yearly', month: 3, day: 1 })).toBe('2027-03-01');
    } finally {
      vi.useRealTimers();
    }
  });
  it('every category with generated tasks is a real category', () => {
    for (const c of Object.keys(CATEGORY_TASKS)) expect(CATEGORIES as readonly string[]).toContain(c);
    for (const c of ['Air Conditioner', 'Water Purifier', 'Air Purifier']) {
      expect(CATEGORIES as readonly string[]).toContain(c);
      expect(CATEGORY_TASKS[c]?.length).toBeGreaterThan(0);
    }
  });
});
