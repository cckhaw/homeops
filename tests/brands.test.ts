import { describe, expect, it } from 'vitest';
import {
  brandKey, canonicalBrand, defaultBrands, findBrand, makeModelLabel, normalizeDomain, recordLogoSrc, logoSrc,
} from '@/lib/brands';

const list = defaultBrands();

describe('built-in brand list', () => {
  it('has unique, well-formed entries (keeps the DB seed safe)', () => {
    const keys = list.map((b) => brandKey(b.name));
    expect(new Set(keys).size).toBe(keys.length);
    expect(list.length).toBeGreaterThan(150);
    for (const b of list) expect(normalizeDomain(b.domain)).toBe(b.domain);
  });
  it('includes the regional brands', () => {
    for (const n of ['Cuckoo', 'Coway', 'Khind', 'Pensonic', 'Midea', 'Toyomi']) expect(canonicalBrand(list, n)).toBe(n);
  });
});

describe('brand lookup', () => {
  it('ignores case and punctuation', () => {
    expect(findBrand(list, 'lg')?.name).toBe('LG');
    expect(findBrand(list, 'a.o. smith')?.name).toBe('A. O. Smith');
    expect(findBrand(list, 'LG Electronics')?.name).toBe('LG'); // first word
    expect(findBrand(list, 'Acme Heating')).toBeNull();
    expect(canonicalBrand(list, 'LG Electronics')).toBeNull(); // canonical needs an exact match
  });
});

describe('domains and logos', () => {
  it('normalises websites', () => {
    expect(normalizeDomain('https://www.LG.com/about?x=1')).toBe('lg.com');
    expect(normalizeDomain('cuckoo.co.kr')).toBe('cuckoo.co.kr');
    expect(normalizeDomain('not a domain')).toBeNull();
    expect(normalizeDomain('')).toBeNull();
    expect(normalizeDomain('localhost')).toBeNull();
  });
  it('prefers a custom logo, proxying private storage', () => {
    const priv = { id: 'abc', name: 'X', domain: 'x.com', logoUrl: 'https://s.private.blob.vercel-storage.com/brand-logos/x.png' };
    expect(recordLogoSrc(priv)).toMatch(/^\/api\/brand-logo\/abc\?v=/);
    expect(recordLogoSrc({ name: 'X', domain: 'x.com', logoUrl: 'https://cdn.example.com/x.png' })).toBe('https://cdn.example.com/x.png');
    expect(recordLogoSrc({ name: 'X', domain: 'x.com', logoUrl: null })).toContain('domain=x.com');
    expect(recordLogoSrc({ name: 'X', domain: null, logoUrl: null })).toBeNull();
  });
  it('falls back to a typed website, else a letter tile', () => {
    expect(logoSrc(list, 'somebrand.com')).toContain('domain=somebrand.com');
    expect(logoSrc(list, 'Unknown Brand')).toBeNull();
  });
});

describe('make + model label', () => {
  it('joins and falls back to the legacy field', () => {
    expect(makeModelLabel({ make: 'LG', model: 'OLED65' })).toBe('LG OLED65');
    expect(makeModelLabel({ make: null, model: null, makeModel: 'Old Combined' })).toBe('Old Combined');
    expect(makeModelLabel({})).toBeNull();
  });
});
