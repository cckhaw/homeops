import type { MetadataRoute } from 'next';
import { donationsEnabled, siteBaseUrl } from '@/lib/donate';

const UPDATED = new Date('2026-11-05');

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteBaseUrl('http://localhost:3000');
  const pages: [string, number, MetadataRoute.Sitemap[number]['changeFrequency']][] = [
    ['/', 1, 'monthly'],
    ['/register', 0.8, 'yearly'],
    ['/login', 0.5, 'yearly'],
    ['/privacy', 0.4, 'yearly'],
    ['/terms', 0.4, 'yearly'],
  ];
  if (donationsEnabled()) pages.push(['/support', 0.3, 'yearly']);
  return pages.map(([path, priority, changeFrequency]) => ({ url: `${base}${path === '/' ? '' : path}`, lastModified: UPDATED, changeFrequency, priority }));
}
