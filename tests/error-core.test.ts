import { describe, expect, it } from 'vitest';
import { fingerprint, isBenign, normalizeRoute, sanitizeText } from '@/lib/error-core';

describe('sanitizeText', () => {
  it('strips e-mail addresses, ids, tokens and bearer credentials', () => {
    const out = sanitizeText('Failed for ada@example.com id 3f2504e0-4f89-11d3-9a0c-0305e82c3301 token AbCdEfGhIjKlMnOpQrStUvWxYz123456 Bearer sk_live_abc123');
    expect(out).not.toMatch(/ada@example\.com|3f2504e0|AbCdEfGh|sk_live/);
    expect(out).toContain('[email]');
    expect(out).toContain('[id]');
    expect(out).toContain('[token]');
  });
  it('keeps ordinary error text and caps the length', () => {
    expect(sanitizeText('Cannot read properties of undefined (reading "name")')).toBe('Cannot read properties of undefined (reading "name")');
    expect(sanitizeText('word '.repeat(300), 400)).toHaveLength(400);
  });
});

describe('normalizeRoute', () => {
  it('replaces ids and tokens with a placeholder and drops the query', () => {
    expect(normalizeRoute('/dashboard/assets/3f2504e0-4f89-11d3-9a0c-0305e82c3301?tab=1')).toBe('/dashboard/assets/[id]');
    expect(normalizeRoute('/passport/AbCdEfGhIjKlMnOpQrStUvWx')).toBe('/passport/[id]');
    expect(normalizeRoute('/api/files/123/receipt')).toBe('/api/files/[id]/receipt');
    expect(normalizeRoute('/dashboard/settings')).toBe('/dashboard/settings');
    expect(normalizeRoute(null)).toBeNull();
  });
});

describe('isBenign', () => {
  it('ignores framework control flow and browser noise', () => {
    expect(isBenign('NEXT_REDIRECT')).toBe(true);
    expect(isBenign('x', 'NEXT_NOT_FOUND;404')).toBe(true);
    expect(isBenign('Failed to fetch')).toBe(true);
    expect(isBenign('ChunkLoadError: Loading chunk 12 failed')).toBe(true);
  });
  it('keeps real bugs', () => {
    expect(isBenign('Cannot read properties of undefined')).toBe(false);
    expect(isBenign('relation "x" does not exist')).toBe(false);
  });
});

describe('fingerprint', () => {
  it('is stable and distinguishes source, route and message', () => {
    const a = fingerprint('server', '/a', 'boom');
    expect(a).toBe(fingerprint('server', '/a', 'boom'));
    expect(a).toHaveLength(24);
    expect(a).not.toBe(fingerprint('client', '/a', 'boom'));
    expect(a).not.toBe(fingerprint('server', '/b', 'boom'));
    expect(a).not.toBe(fingerprint('server', '/a', 'bang'));
  });
});
