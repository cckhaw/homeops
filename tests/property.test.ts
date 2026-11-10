import { describe, expect, it } from 'vitest';
import { PROPERTY_TEMPLATES, guessRegion, suggestedDate, templatesFor, validatePicks } from '@/lib/property-core';

const byId = (id: string) => PROPERTY_TEMPLATES.find((t) => t.id === id)!;

describe('property templates', () => {
  it('have unique ids and valid fixed dates', () => {
    expect(new Set(PROPERTY_TEMPLATES.map((t) => t.id)).size).toBe(PROPERTY_TEMPLATES.length);
    for (const t of PROPERTY_TEMPLATES) {
      expect(t.hint.length).toBeGreaterThan(20);
      if (t.month) { expect(t.month).toBeGreaterThanOrEqual(1); expect(t.month).toBeLessThanOrEqual(12); expect(t.day).toBeGreaterThanOrEqual(1); }
    }
  });
  it('are region specific, with general ones for everyone', () => {
    const my = templatesFor('MY').map((t) => t.id), sg = templatesFor('SG').map((t) => t.id), other = templatesFor('OTHER').map((t) => t.id);
    expect(my).toContain('my-quit-rent');
    expect(my).not.toContain('sg-property-tax');
    expect(sg).toContain('sg-property-tax');
    expect(sg).not.toContain('my-assessment');
    expect(other).toEqual(['any-insurance', 'any-mortgage']);
    for (const r of [my, sg]) { expect(r).toContain('any-insurance'); expect(r).toContain('any-mortgage'); }
  });
});

describe('suggestedDate', () => {
  it('picks the next occurrence of a fixed date (today counts)', () => {
    expect(suggestedDate(byId('my-quit-rent'), '2026-11-10')).toBe('2027-05-31');
    expect(suggestedDate(byId('my-quit-rent'), '2026-03-01')).toBe('2026-05-31');
    expect(suggestedDate(byId('my-quit-rent'), '2026-05-31')).toBe('2026-05-31');
    expect(suggestedDate(byId('my-assessment'), '2027-12-31')).toBe('2028-02-28');
    expect(suggestedDate(byId('sg-property-tax'), '2026-11-10')).toBe('2027-01-31');
  });
  it('uses the first of next month for recurring bills, including December', () => {
    expect(suggestedDate(byId('sg-mcst'), '2026-11-10')).toBe('2026-12-01');
    expect(suggestedDate(byId('sg-mcst'), '2026-12-15')).toBe('2027-01-01');
  });
  it('asks for a date when none is typical', () => {
    expect(suggestedDate(byId('any-insurance'), '2026-11-10')).toBeNull();
  });
});

describe('guessRegion', () => {
  it('follows currency, then language region', () => {
    expect(guessRegion('MYR', 'en-US')).toBe('MY');
    expect(guessRegion('SGD', 'en-GB')).toBe('SG');
    expect(guessRegion('USD', 'en-SG')).toBe('SG');
    expect(guessRegion(null, 'ms-MY')).toBe('MY');
    expect(guessRegion('USD', 'en-US')).toBe('OTHER');
  });
});

describe('validatePicks', () => {
  const today = '2026-11-10';
  it('turns valid picks into tasks and lets the person change how often', () => {
    const r = validatePicks([{ id: 'sg-mcst', frequency: 'monthly', dueDate: '2026-12-01' }, { id: 'any-insurance', frequency: 'nonsense', dueDate: '2027-03-01' }], today);
    expect(r).toEqual({ ok: true, tasks: [{ title: 'Pay condo maintenance fee and sinking fund (MCST)', frequency: 'monthly', dueDate: '2026-12-01' }, { title: 'Renew home / fire insurance', frequency: 'yearly', dueDate: '2027-03-01' }] });
  });
  it('refuses nothing selected, unknown or repeated reminders, bad or past dates', () => {
    expect(validatePicks([], today).ok).toBe(false);
    expect(validatePicks([{ id: 'nope', frequency: 'yearly', dueDate: '2027-01-01' }], today).ok).toBe(false);
    expect(validatePicks([{ id: 'any-mortgage', frequency: 'monthly', dueDate: '2027-01-01' }, { id: 'any-mortgage', frequency: 'monthly', dueDate: '2027-02-01' }], today).ok).toBe(false);
    expect(validatePicks([{ id: 'any-mortgage', frequency: 'monthly', dueDate: '' }], today)).toMatchObject({ ok: false, error: expect.stringContaining('Choose a date') });
    expect(validatePicks([{ id: 'any-mortgage', frequency: 'monthly', dueDate: '2026-02-30x' }], today).ok).toBe(false);
    expect(validatePicks([{ id: 'any-mortgage', frequency: 'monthly', dueDate: '2025-01-01' }], today)).toMatchObject({ ok: false, error: expect.stringContaining('in the past') });
  });
});
