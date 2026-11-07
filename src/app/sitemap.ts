import type { MetadataRoute } from 'next';
import { donationsEnabled, siteBaseUrl } from '@/lib/donate';
import { livePosts } from '@/lib/blog';
import { categorySlug } from '@/lib/blog-core';
import { FAQ_CATEGORIES, faqUrl } from '@/lib/faq';

const UPDATED = new Date('2026-11-07');

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl('http://localhost:3000');
  const pages: [string, number, MetadataRoute.Sitemap[number]['changeFrequency']][] = [
    ['/', 1, 'monthly'],
    ['/blog', 0.7, 'weekly'],
    ['/faq', 0.8, 'monthly'],
    ['/register', 0.8, 'yearly'],
    ['/login', 0.5, 'yearly'],
    ['/privacy', 0.4, 'yearly'],
    ['/terms', 0.4, 'yearly'],
  ];
  if (donationsEnabled()) pages.push(['/support', 0.3, 'yearly']);
  const posts = await livePosts().catch(() => []);
  return [
    ...pages.map(([path, priority, changeFrequency]) => ({ url: `${base}${path === '/' ? '' : path}`, lastModified: UPDATED, changeFrequency, priority })),
    ...[...new Set(posts.map((p) => p.category))].map((c) => ({ url: `${base}/blog/category/${categorySlug(c)}`, lastModified: new Date(Math.max(...posts.filter((p) => p.category === c).map((p) => p.updatedAt.getTime()))), changeFrequency: 'weekly' as const, priority: 0.5 })),
    ...FAQ_CATEGORIES.flatMap((c) => [
      { url: `${base}${faqUrl(c.slug)}`, lastModified: UPDATED, changeFrequency: 'monthly' as const, priority: 0.6 },
      ...c.items.map((i) => ({ url: `${base}${faqUrl(c.slug, i.slug)}`, lastModified: UPDATED, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ]),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
