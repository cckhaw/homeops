import { describe, expect, it } from 'vitest';
import { clientIpFrom, windowStartMs } from '@/lib/rate-limit-core';

describe('rate-limit windows', () => {
  it('aligns timestamps to fixed windows', () => {
    const t = Date.UTC(2026, 10, 5, 12, 34, 56);
    expect(windowStartMs(t, 3600)).toBe(Date.UTC(2026, 10, 5, 12, 0, 0));
    expect(windowStartMs(t, 60)).toBe(Date.UTC(2026, 10, 5, 12, 34, 0));
    expect(windowStartMs(t, 86_400)).toBe(Date.UTC(2026, 10, 5, 0, 0, 0));
  });
  it('is stable within a window and advances at the boundary', () => {
    const base = Date.UTC(2026, 0, 1, 0, 10, 0);
    expect(windowStartMs(base, 600)).toBe(windowStartMs(base + 599_999, 600));
    expect(windowStartMs(base + 600_000, 600)).toBe(windowStartMs(base, 600) + 600_000);
  });
});

describe('client IP', () => {
  const bag = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });
  it('takes the first x-forwarded-for entry', () => {
    expect(clientIpFrom(bag({ 'x-forwarded-for': '203.0.113.9, 70.41.3.18, 150.172.238.178' }))).toBe('203.0.113.9');
    expect(clientIpFrom(bag({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1');
  });
  it('falls back to x-real-ip, then a shared bucket', () => {
    expect(clientIpFrom(bag({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
    expect(clientIpFrom(bag({}))).toBe('unknown');
  });
  it('rejects junk so attackers cannot mint unlimited buckets', () => {
    expect(clientIpFrom(bag({ 'x-forwarded-for': "<script>alert(1)</script>" }))).toBe('unknown');
    expect(clientIpFrom(bag({ 'x-forwarded-for': 'a'.repeat(200) }))).toBe('unknown');
  });
  it('reads plain header objects (NextAuth passes these)', () => {
    expect(clientIpFrom({ 'x-forwarded-for': '203.0.113.9' })).toBe('203.0.113.9');
    expect(clientIpFrom({ 'x-forwarded-for': ['203.0.113.9', '1.2.3.4'] })).toBe('203.0.113.9');
  });
});
