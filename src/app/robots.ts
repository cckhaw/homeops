import type { MetadataRoute } from 'next';
import { siteBaseUrl } from '@/lib/donate';

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl('http://localhost:3000');
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/blog', '/privacy', '/terms', '/register', '/login'],
        // Private areas, tokens, API and one-off pages are never indexed.
        disallow: ['/dashboard', '/admin', '/api/', '/passport/', '/join/', '/reset-password', '/forgot-password', '/support/thanks'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
