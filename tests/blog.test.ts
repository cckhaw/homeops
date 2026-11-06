import { describe, expect, it } from 'vitest';
import { blocksText, firstParagraph, outline, parseInline, parseMarkdown, readingMinutes, safeHref, slugify } from '@/lib/markdown-core';
import { isLive, localToUtc, parseTags, postState, slugError, utcToLocal } from '@/lib/blog-core';

describe('markdown', () => {
  it('parses headings, ids and the outline', () => {
    const b = parseMarkdown('# One\n\ntext\n\n### Two & three\n\n## One');
    expect(b.filter((x) => x.t === 'heading').map((x) => x.t === 'heading' && [x.level, x.id])).toEqual([[2, 'one'], [3, 'two-and-three'], [2, 'one-2']]);
    expect(outline(b).map((o) => o.text)).toEqual(['One', 'Two & three', 'One']);
  });
  it('parses inline styles', () => {
    expect(parseInline('a **b** *c* `d` [e](https://x.test)')).toEqual([
      { t: 'text', v: 'a ' }, { t: 'strong', c: [{ t: 'text', v: 'b' }] }, { t: 'text', v: ' ' }, { t: 'em', c: [{ t: 'text', v: 'c' }] }, { t: 'text', v: ' ' },
      { t: 'code', v: 'd' }, { t: 'text', v: ' ' }, { t: 'link', href: 'https://x.test', c: [{ t: 'text', v: 'e' }] },
    ]);
  });
  it('never emits raw HTML or unsafe links', () => {
    expect(parseInline('<script>alert(1)</script>')).toEqual([{ t: 'text', v: '<script>alert(1)</script>' }]);
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,x')).toBeNull();
    expect(safeHref('//evil.test')).toBeNull();
    expect(safeHref('/blog/x')).toBe('/blog/x');
    expect(safeHref('mailto:a@b.co')).toBe('mailto:a@b.co');
    expect(parseInline('[click](javascript:alert(1))')).toEqual([{ t: 'text', v: 'click' }]);
  });
  it('parses lists, checklists, quotes, rules and code', () => {
    const b = parseMarkdown('- a\n- [ ] b\n- [x] c\n\n1. one\n2. two\n\n> **Tip:** quote\n\n---\n\n```\ncode here\n```');
    expect(b[0]).toMatchObject({ t: 'list', ordered: false });
    expect(b[0].t === 'list' && b[0].items.map((i) => i.checked)).toEqual([null, false, true]);
    expect(b[1]).toMatchObject({ t: 'list', ordered: true });
    expect(b[2].t).toBe('quote');
    expect(b[3].t).toBe('hr');
    expect(b[4]).toEqual({ t: 'code', v: 'code here' });
  });
  it('parses tables', () => {
    const b = parseMarkdown('| A | B |\n|---|---|\n| 1 | **2** |\n| 3 | 4 |');
    expect(b).toHaveLength(1);
    expect(b[0].t === 'table' && [b[0].head.length, b[0].rows.length]).toEqual([2, 2]);
  });
  it('joins wrapped paragraph lines and list continuations', () => {
    expect(blocksText(parseMarkdown('one\ntwo\n\n- item\n  more'))).toBe('one two item more');
  });
  it('estimates reading time and summarises', () => {
    expect(readingMinutes('word '.repeat(450))).toBe(2);
    expect(readingMinutes('hi')).toBe(1);
    expect(firstParagraph('# T\n\nFirst **bold** sentence.\n\nSecond.')).toBe('First bold sentence.');
    expect(firstParagraph('x '.repeat(200), 20).length).toBeLessThanOrEqual(20);
  });
  it('slugifies', () => expect(slugify('How often should you service your air-con in Singapore/Malaysia?')).toBe('how-often-should-you-service-your-air-con-in-singapore-malaysia'));
});

describe('blog scheduling', () => {
  const now = new Date('2026-11-06T10:00:00Z');
  it('reads UTC+8 admin input as the right instant, and back', () => {
    expect(localToUtc('2026-11-13T09:00')?.toISOString()).toBe('2026-11-13T01:00:00.000Z');
    expect(utcToLocal(new Date('2026-11-13T01:00:00Z'))).toBe('2026-11-13T09:00');
    expect(localToUtc('2026-02-31T09:00')).toBeNull();
    expect(localToUtc('nope')).toBeNull();
    expect(localToUtc('2026-11-13T25:00')).toBeNull();
  });
  it('is draft, scheduled or published', () => {
    expect(postState({ status: 'draft', publishAt: null }, now)).toBe('draft');
    expect(postState({ status: 'draft', publishAt: new Date('2026-01-01') }, now)).toBe('draft');
    expect(postState({ status: 'published', publishAt: null }, now)).toBe('draft');
    expect(postState({ status: 'published', publishAt: new Date('2026-11-13T01:00:00Z') }, now)).toBe('scheduled');
    expect(postState({ status: 'published', publishAt: new Date('2026-11-06T10:00:00Z') }, now)).toBe('published');
    expect(isLive({ status: 'published', publishAt: new Date('2026-11-01') }, now)).toBe(true);
  });
  it('validates slugs and tags', () => {
    expect(slugError('good-slug-2')).toBeNull();
    for (const bad of ['', 'Bad', 'a--b', '-a', 'a b', 'new', 'x'.repeat(81)]) expect(slugError(bad)).not.toBeNull();
    expect(parseTags(' Aircon, aircon ,  Singapore , ,malaysia')).toEqual(['aircon', 'singapore', 'malaysia']);
  });
});

import { categoryFromSlug, categorySlug, seoChecks, searchDescription, searchTitle } from '@/lib/blog-core';
describe('blog SEO helpers', () => {
  it('maps categories to clean URLs and back', () => {
    expect(categorySlug('Buying & selling')).toBe('buying-selling');
    expect(categorySlug('Maintenance')).toBe('maintenance');
    expect(categoryFromSlug('buying-selling')).toBe('Buying & selling');
    expect(categoryFromSlug('nope')).toBeUndefined();
  });
  it('prefers the dedicated search title/description', () => {
    expect(searchTitle({ title: 'Long title', seoTitle: ' Short ' })).toBe('Short');
    expect(searchTitle({ title: 'Long title', seoTitle: null })).toBe('Long title');
    expect(searchDescription({ excerpt: 'ex', metaDescription: '' })).toBe('ex');
  });
  it('flags weak on-page SEO and passes a good post', () => {
    const good = { title: 'T', seoTitle: 'How Often to Service Aircon in Singapore', metaDescription: 'x'.repeat(120), excerpt: 'e', slug: 'how-often-service-aircon-singapore', body: '', words: 900, h2: 5, hasInternalLink: true };
    expect(seoChecks(good).every((c) => c.ok)).toBe(true);
    const bad = seoChecks({ ...good, seoTitle: 'x'.repeat(80), metaDescription: 'short', slug: 'a-very-long-url-name-with-way-too-many-words-in-it-for-search', words: 100, h2: 1, hasInternalLink: false });
    expect(bad.filter((c) => !c.ok)).toHaveLength(6);
  });
});
