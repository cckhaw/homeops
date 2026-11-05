import { describe, expect, it } from 'vitest';
import { MAX_DONATION_CENTS, MIN_DONATION_CENTS, parseDollarsToCents } from '@/lib/donate';

describe('donation amounts', () => {
  it('parses dollars to cents', () => {
    expect(parseDollarsToCents('5')).toBe(500);
    expect(parseDollarsToCents('$7.50')).toBe(750);
    expect(parseDollarsToCents('0.99')).toBe(99);
    expect(parseDollarsToCents('1,000')).toBe(100000);
  });
  it('rejects junk', () => {
    for (const bad of ['', 'abc', '1.234', '-5', '1e3', null, undefined]) expect(parseDollarsToCents(bad as string)).toBeNull();
  });
  it('documents the allowed range', () => {
    expect(MIN_DONATION_CENTS).toBe(100);
    expect(MAX_DONATION_CENTS).toBe(50_000);
  });
});
