import type { MetadataRoute } from 'next';
import { donationsEnabled, siteBaseUrl } from '@/lib/donate';
import { livePosts } from '@/lib/blog';
import { buildSitemap } from '@/lib/site-pages';

// Regenerated at most once a minute (and a published/scheduled post appears about a minute after its time).
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await livePosts().catch(() => []);
  return buildSitemap({
    base: siteBaseUrl('http://localhost:3000'),
    posts,
    donations: donationsEnabled(),
    buildDate: new Date(process.env.BUILD_DATE ?? Date.now()),
  });
}
