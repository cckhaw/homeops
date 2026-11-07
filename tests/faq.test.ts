import { describe, expect, it } from 'vitest';
import { FAQ_CATEGORIES, allFaqItems, answerSnippet, faqCategory, faqItem, faqPageLd, faqUrl, plainAnswer, relatedFaqs } from '@/lib/faq';

const ROUTES = ['/privacy', '/terms', '/register', '/login'];

describe('FAQ content', () => {
  it('has unique, URL-safe slugs', () => {
    const cats = FAQ_CATEGORIES.map((c) => c.slug);
    expect(new Set(cats).size).toBe(cats.length);
    for (const c of FAQ_CATEGORIES) {
      expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      const slugs = c.items.map((i) => i.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      slugs.forEach((s) => expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
      expect(c.items.length).toBeGreaterThanOrEqual(4);
    }
    expect(allFaqItems().length).toBeGreaterThanOrEqual(35);
  });

  it('keeps titles and descriptions inside search-result limits', () => {
    for (const c of FAQ_CATEGORIES) {
      expect(c.seoTitle.length).toBeLessThanOrEqual(60);
      expect(c.seoDescription.length).toBeGreaterThanOrEqual(90);
      expect(c.seoDescription.length).toBeLessThanOrEqual(165);
      for (const i of c.items) {
        expect(i.q.length).toBeLessThanOrEqual(75);
        expect(i.q.endsWith('?') || i.q.endsWith('.')).toBe(true);
        expect(plainAnswer(i.a).length).toBeGreaterThan(60);
        expect(answerSnippet(i.a).length).toBeLessThanOrEqual(158);
      }
    }
  });

  it('only links to pages that exist', () => {
    for (const { item } of allFaqItems()) for (const m of item.a.matchAll(/\]\((\/[^)]*)\)/g)) expect(ROUTES).toContain(m[1]);
  });

  it('does not promise things that are not built', () => {
    const all = allFaqItems().map((x) => x.item.a).join(' ');
    expect(all).not.toMatch(/telegram|sms reminder/i);
    expect(all).not.toMatch(/HomeOps/);
  });
});

describe('FAQ helpers', () => {
  it('looks things up', () => {
    expect(faqCategory('troubleshooting')?.title).toBe('Troubleshooting');
    expect(faqCategory('nope')).toBeUndefined();
    expect(faqItem('getting-started', 'what-is-wodejia')?.item.q).toBe('What is Wodejia?');
    expect(faqItem('getting-started', 'nope')).toBeUndefined();
    expect(faqItem('nope', 'what-is-wodejia')).toBeUndefined();
  });
  it('builds URLs', () => {
    expect(faqUrl('')).toBe('/faq');
    expect(faqUrl('troubleshooting')).toBe('/faq/troubleshooting');
    expect(faqUrl('troubleshooting', 'contact-support')).toBe('/faq/troubleshooting/contact-support');
  });
  it('strips markdown for structured data', () => {
    const ld = faqPageLd([{ slug: 'x', q: 'Q?', a: 'See **bold** and [link](/privacy).' }]);
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity[0]).toEqual({ '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'See bold and link.' } });
  });
  it('cuts snippets at a sentence or word', () => {
    const long = 'First sentence is here and it is quite long indeed to make the point. ' + 'Another words '.repeat(20);
    const s = answerSnippet(long);
    expect(s.length).toBeLessThanOrEqual(158);
    expect(s.endsWith('.') || s.endsWith('…')).toBe(true);
  });
  it('suggests related questions without the page itself', () => {
    const r = relatedFaqs('getting-started', 'what-is-wodejia', 4);
    expect(r).toHaveLength(4);
    expect(r.some((x) => x.item.slug === 'what-is-wodejia' && x.category.slug === 'getting-started')).toBe(false);
  });
});
