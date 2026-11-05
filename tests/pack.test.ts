import { describe, expect, it } from 'vitest';
import { extensionFor, packReadme, renderSummaryHtml, safeName, toCsv, pathAllocator } from '@/lib/pack-core';

describe('move-out pack', () => {
  it('makes safe file names', () => {
    expect(safeName('a/b\\c:d')).toBe('a_b_c_d');
    expect(safeName('Fridge LG 5000!.pdf')).toBe('Fridge_LG_5000_.pdf');
    expect(safeName('///')).toBe('file');
    expect(safeName('..hidden')).toBe('hidden');
  });
  it('picks an extension', () => {
    expect(extensionFor('https://x/y/receipt.PDF?z', null)).toBe('.pdf');
    expect(extensionFor('https://x/y/abc', 'image/jpeg')).toBe('.jpg');
    expect(extensionFor('https://x/y/abc', null)).toBe('.bin');
  });
  it('de-duplicates paths', () => {
    const next = pathAllocator();
    expect(['a/x.pdf', 'a/x.pdf', 'a/y', 'a/y', 'a/x.pdf'].map(next)).toEqual(['a/x.pdf', 'a/x-2.pdf', 'a/y', 'a/y-2', 'a/x-3.pdf']);
  });
  it('writes CSV with formula protection', () => expect(toCsv([['a', '=1+1'], [null, 'b,c']])).toBe(`a,'=1+1\r\n,"b,c"\r\n`));
  it('renders an escaped summary with only the chosen sections', () => {
    const base = { home: { name: '<b>Home</b>', address: null }, generatedOn: '2025-01-02', money: (c: number | null | undefined) => `$${(c ?? 0) / 100}`, date: (d: string | null | undefined) => d ?? '', assets: [{ name: 'Fridge <x>', category: 'Kitchen', make: 'LG', model: null, serialNumber: null, installDate: null, warrantyExpiry: null, purchaseCents: 100000, notes: null, files: ['files/a.pdf'] }], services: [], tasksDone: [] };
    const html = renderSummaryHtml(base);
    expect(html).toContain('&lt;b&gt;Home&lt;/b&gt;');
    expect(html).toContain('Fridge &lt;x&gt;');
    expect(html).toContain('$1000');
    expect(html).not.toContain('Trusted contractors');
    expect(renderSummaryHtml({ ...base, contractors: [{ name: 'Ah Seng', trade: 'Plumber', phone: null, email: null }] })).toContain('Trusted contractors');
  });
  it('lists skipped files in the README', () => expect(packReadme('Home', ['big.pdf'])).toContain(' - big.pdf'));
});
