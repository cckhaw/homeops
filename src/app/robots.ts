import type { MetadataRoute } from 'next';
import { donationsEnabled, siteBaseUrl } from '@/lib/donate';
import { PRIVATE_PATHS, publicPaths } from '@/lib/site-pages';

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl('http://localhost:3000');
  return {
    rules: [{ userAgent: '*', allow: publicPaths(donationsEnabled()), disallow: PRIVATE_PATHS }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
