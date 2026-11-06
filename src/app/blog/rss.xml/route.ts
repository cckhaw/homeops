import { livePosts } from '@/lib/blog';
import { siteBaseUrl } from '@/lib/donate';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

/** RSS feed of live posts. Scheduled posts appear on their own once their time has passed. */
export async function GET() {
  const base = siteBaseUrl('http://localhost:3000');
  const posts = await livePosts(30).catch(() => []);
  const items = posts
    .map((p) => `<item><title>${esc(p.title)}</title><link>${base}/blog/${p.slug}</link><guid isPermaLink="true">${base}/blog/${p.slug}</guid><pubDate>${(p.publishAt ?? p.createdAt).toUTCString()}</pubDate><category>${esc(p.category)}</category><description>${esc(p.metaDescription?.trim() || p.excerpt)}</description></item>`)
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>HomeOps blog</title><link>${base}/blog</link><description>Practical guides on home maintenance, warranties and keeping your home organised.</description><language>en</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
