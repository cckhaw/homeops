import { describe, expect, it } from 'vitest';
import { PRIVATE_PATHS, PUBLIC_PAGES, buildSitemap, publicPaths } from '@/lib/site-pages';
import { FAQ_CATEGORIES } from '@/lib/faq-data';

const base = 'https://wodejia.example';
const buildDate = new Date('2026-11-10T00:00:00Z');
const posts = [
  { slug: 'a-post', category: 'Maintenance', updatedAt: new Date('2026-11-05T10:00:00Z') },
  { slug: 'newer-post', category: 'Maintenance', updatedAt: new Date('2026-11-08T10:00:00Z') },
  { slug: 'money-post', category: 'Money', updatedAt: new Date('2026-11-06T10:00:00Z') },
];
const map = (donations = false, p = posts) => buildSitemap({ base, posts: p, donations, buildDate });
const path = (u: string) => u.replace(base, '') || '/';

describe('sitemap', () => {
  it('lists every page exactly once with absolute URLs', () => {
    const urls = map().map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    urls.forEach((u) => expect(u.startsWith(base)).toBe(true));
    expect(urls).toContain(base); // the home page has no trailing slash
  });

  it('includes static pages, the blog, and every FAQ topic and question', () => {
    const paths = map().map((e) => path(e.url));
    for (const p of ['/', '/blog', '/faq', '/register', '/login', '/privacy', '/terms', '/blog/a-post', '/blog/category/maintenance', '/blog/category/money']) expect(paths).toContain(p);
    for (const c of FAQ_CATEGORIES) { expect(paths).toContain(`/faq/${c.slug}`); for (const i of c.items) expect(paths).toContain(`/faq/${c.slug}/${i.slug}`); }
  });

  it('only lists the donation page when donations are on', () => {
    expect(map(false).map((e) => path(e.url))).not.toContain('/support');
    expect(map(true).map((e) => path(e.url))).toContain('/support');
  });

  it('uses real last-modified dates', () => {
    const e = (p: string) => map().find((x) => path(x.url) === p)!;
    expect(e('/blog/a-post').lastModified).toEqual(posts[0].updatedAt);
    expect(e('/blog/category/maintenance').lastModified).toEqual(posts[1].updatedAt); // newest post in the category
    expect(e('/blog').lastModified).toEqual(posts[1].updatedAt); // newest post overall
    expect(e('/').lastModified).toEqual(buildDate);
    expect(e('/privacy').lastModified.toISOString().slice(0, 7)).toBe('2026-11');
    for (const x of map()) expect(Number.isNaN(x.lastModified.getTime())).toBe(false);
    expect(buildSitemap({ base, posts: [], donations: false, buildDate }).find((x) => path(x.url) === '/blog')!.lastModified).toEqual(buildDate);
  });

  it('never lists a private path, and robots allows everything it lists', () => {
    const allow = publicPaths(true);
    for (const e of map(true)) {
      const p = path(e.url);
      expect(PRIVATE_PATHS.some((d) => p === d || p.startsWith(d.endsWith('/') ? d : d + '/'))).toBe(false);
      expect(allow.some((a) => p === a || (a !== '/' && p.startsWith(a + '/')))).toBe(true);
    }
  });

  it('has sane priorities and every public page entry is unique', () => {
    const ps = PUBLIC_PAGES.map((p) => p.path);
    expect(new Set(ps).size).toBe(ps.length);
    for (const e of map(true)) { expect(e.priority).toBeGreaterThan(0); expect(e.priority).toBeLessThanOrEqual(1); }
  });
});
