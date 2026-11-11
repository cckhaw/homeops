import { FAQ_CATEGORIES, FAQ_UPDATED } from './faq-data';
import { LEGAL_UPDATED_ISO } from './legal-meta';
import { categorySlug } from './blog-core';

/**
 * Every public, indexable page of the site, in one place. sitemap.xml and robots.txt are both built from this list,
 * so a new public page needs one entry here (and nothing else) to be discovered by search engines.
 * Pages generated from data (blog posts, FAQ topics and questions) are added by `buildSitemap` below.
 */
export type PublicPage = { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' | 'yearly'; updated: 'build' | 'legal' | 'faq' | 'blog'; donationsOnly?: boolean };

export const PUBLIC_PAGES: PublicPage[] = [
  { path: '/', priority: 1, changeFrequency: 'monthly', updated: 'build' },
  { path: '/blog', priority: 0.7, changeFrequency: 'weekly', updated: 'blog' },
  { path: '/faq', priority: 0.8, changeFrequency: 'monthly', updated: 'faq' },
  { path: '/tools', priority: 0.7, changeFrequency: 'monthly', updated: 'build' },
  { path: '/tools/aircon-service-cost', priority: 0.7, changeFrequency: 'monthly', updated: 'build' },
  { path: '/tools/appliance-lifespan', priority: 0.7, changeFrequency: 'monthly', updated: 'build' },
  { path: '/tools/warranty-expiry-calculator', priority: 0.7, changeFrequency: 'monthly', updated: 'build' },
  { path: '/tools/repair-or-replace', priority: 0.7, changeFrequency: 'monthly', updated: 'build' },
  { path: '/tools/aircon-electricity-cost', priority: 0.7, changeFrequency: 'monthly', updated: 'build' },
  { path: '/register', priority: 0.8, changeFrequency: 'yearly', updated: 'build' },
  { path: '/login', priority: 0.5, changeFrequency: 'yearly', updated: 'build' },
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly', updated: 'legal' },
  { path: '/terms', priority: 0.4, changeFrequency: 'yearly', updated: 'legal' },
  { path: '/support', priority: 0.3, changeFrequency: 'yearly', updated: 'build', donationsOnly: true },
];

/** Paths search engines must never crawl: signed-in areas, tokens, APIs and one-off pages. */
export const PRIVATE_PATHS = ['/dashboard', '/admin', '/api/', '/passport/', '/join/', '/reset-password', '/forgot-password', '/support/thanks', '/brand-asset/', '/newsletter/'];

export const publicPaths = (donations: boolean) => PUBLIC_PAGES.filter((p) => !p.donationsOnly || donations).map((p) => p.path);

export type SitemapPost = { slug: string; category: string; updatedAt: Date };
export type SitemapEntry = { url: string; lastModified: Date; changeFrequency: PublicPage['changeFrequency']; priority: number };

/**
 * The full sitemap. `posts` must already be only the *published* posts (scheduled and draft ones never appear).
 * `lastModified` is the real date of the content: the post's last edit, the FAQ / legal content dates, or the build date.
 */
export function buildSitemap({ base, posts, donations, buildDate }: { base: string; posts: SitemapPost[]; donations: boolean; buildDate: Date }): SitemapEntry[] {
  const newest = (xs: SitemapPost[]) => (xs.length ? new Date(Math.max(...xs.map((p) => p.updatedAt.getTime()))) : buildDate);
  const dates = { build: buildDate, legal: new Date(LEGAL_UPDATED_ISO), faq: new Date(FAQ_UPDATED), blog: newest(posts) };
  const abs = (path: string) => `${base}${path === '/' ? '' : path}`;
  const faqDate = dates.faq;
  const categories = [...new Set(posts.map((p) => p.category))];
  return [
    ...PUBLIC_PAGES.filter((p) => !p.donationsOnly || donations).map((p) => ({ url: abs(p.path), lastModified: dates[p.updated], changeFrequency: p.changeFrequency, priority: p.priority })),
    ...categories.map((c) => ({ url: abs(`/blog/category/${categorySlug(c)}`), lastModified: newest(posts.filter((p) => p.category === c)), changeFrequency: 'weekly' as const, priority: 0.5 })),
    ...posts.map((p) => ({ url: abs(`/blog/${p.slug}`), lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...FAQ_CATEGORIES.flatMap((c) => [
      { url: abs(`/faq/${c.slug}`), lastModified: faqDate, changeFrequency: 'monthly' as const, priority: 0.6 },
      ...c.items.map((i) => ({ url: abs(`/faq/${c.slug}/${i.slug}`), lastModified: faqDate, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ]),
  ];
}
