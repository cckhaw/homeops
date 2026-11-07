import { FAQ_CATEGORIES, type Faq, type FaqCategory } from './faq-data';
import { blocksText, parseMarkdown } from './markdown-core';

export { FAQ_CATEGORIES };
export type { Faq, FaqCategory };

export const faqCategory = (slug: string) => FAQ_CATEGORIES.find((c) => c.slug === slug);
export const faqItem = (cat: string, slug: string) => {
  const c = faqCategory(cat);
  const item = c?.items.find((i) => i.slug === slug);
  return c && item ? { category: c, item } : undefined;
};
export const allFaqItems = () => FAQ_CATEGORIES.flatMap((c) => c.items.map((item) => ({ category: c, item })));

/** Markdown → plain text, for meta descriptions and the FAQPage structured data. */
export const plainAnswer = (md: string) => blocksText(parseMarkdown(md)).replace(/\s+/g, ' ').trim();

/** A search-result-sized description (≤ 158 chars) from an answer, cut at a sentence or word. */
export function answerSnippet(md: string, max = 158): string {
  const t = plainAnswer(md);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  return (stop > 70 ? cut.slice(0, stop + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…').trim();
}

/** schema.org FAQPage for a set of questions (Google reads the plain-text answers). */
export function faqPageLd(items: Faq[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: plainAnswer(i.a) } })),
  };
}

export const faqUrl = (cat: string, slug?: string) => (slug ? `/faq/${cat}/${slug}` : cat ? `/faq/${cat}` : '/faq');

/** Questions related to `item`: the rest of its category first, then the start of the other categories. */
export function relatedFaqs(cat: string, slug: string, n = 4) {
  const same = (faqCategory(cat)?.items ?? []).filter((i) => i.slug !== slug).map((item) => ({ category: faqCategory(cat)!, item }));
  const others = allFaqItems().filter((x) => x.category.slug !== cat);
  return [...same, ...others].slice(0, n);
}
