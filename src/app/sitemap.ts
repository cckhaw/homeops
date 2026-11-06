import type { MetadataRoute } from 'next';
import { donationsEnabled, siteBaseUrl } from '@/lib/donate';
import { livePosts } from '@/lib/blog';

const UPDATED = new Date('2026-11-05');

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl('http://localhost:3000');
  const pages: [string, number, MetadataRoute.Sitemap[number]['changeFrequency']][] = [
    ['/', 1, 'monthly'],
    ['/blog', 0.7, 'weekly'],
    ['/register', 0.8, 'yearly'],
    ['/login', 0.5, 'yearly'],
    ['/privacy', 0.4, 'yearly'],
    ['/terms', 0.4, 'yearly'],
  ];
  if (donationsEnabled()) pages.push(['/support', 0.3, 'yearly']);
  const posts = await livePosts().catch(() => []);
  return [
    ...pages.map(([path, priority, changeFrequency]) => ({ url: `${base}${path === '/' ? '' : path}`, lastModified: UPDATED, changeFrequency, priority })),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
