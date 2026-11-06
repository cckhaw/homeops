/** Blog rules that don't need the database (so they are unit-tested). */
export const BLOG_CATEGORIES = ['Maintenance', 'Warranties', 'Money', 'Buying & selling', 'Product updates'] as const;
export const isBlogCategory = (c: string) => (BLOG_CATEGORIES as readonly string[]).includes(c);

/** Admins schedule posts in Singapore / Malaysia time (UTC+8, no daylight saving) — the readers HomeOps is written for. */
export const BLOG_TZ_LABEL = 'Singapore / Malaysia time (UTC+8)';
const OFFSET_MS = 8 * 3_600_000;

/** "2026-11-13T09:00" typed by an admin (UTC+8) → the instant it means. Returns null for anything malformed. */
export function localToUtc(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const t = Date.UTC(y, mo - 1, d, h, mi) - OFFSET_MS;
  const back = new Date(t + OFFSET_MS);
  return back.getUTCMonth() === mo - 1 && back.getUTCDate() === d ? new Date(t) : null; // rejects 31 Feb and friends
}

/** An instant → the value a datetime-local input expects, in UTC+8. */
export function utcToLocal(d: Date): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 16);
}

export type PostStatus = 'draft' | 'published';
export type PostState = 'draft' | 'scheduled' | 'published';

/** What a reader sees: a post is live once it is marked published and its publish time has passed. */
export function postState(p: { status: string; publishAt: Date | null }, now = new Date()): PostState {
  if (p.status !== 'published' || !p.publishAt) return 'draft';
  return p.publishAt.getTime() <= now.getTime() ? 'published' : 'scheduled';
}
export const isLive = (p: { status: string; publishAt: Date | null }, now = new Date()) => postState(p, now) === 'published';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RESERVED_SLUGS = new Set(['rss.xml', 'new', 'admin', 'category', 'tag']);
export function slugError(slug: string): string | null {
  if (!slug) return 'Enter a URL name.';
  if (slug.length > 80) return 'The URL name is too long (80 characters at most).';
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) return 'Use lowercase letters, numbers and single dashes only.';
  return null;
}

export const formatPostDate = (d: Date, long = false) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: long ? 'long' : 'short', year: 'numeric', timeZone: 'Asia/Singapore' }).format(d);
export const formatPostDateTime = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).format(d) + ' SGT';

/** /blog/category/maintenance, /blog/category/buying-selling … */
export const categorySlug = (c: string) => c.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const categoryFromSlug = (s: string) => BLOG_CATEGORIES.find((c) => categorySlug(c) === s);

/** Search-result text: the dedicated SEO title / description when the author wrote one, otherwise the post title / summary. */
export const SEO_TITLE_MAX = 50; // the site adds " · HomeOps", which keeps the full title near Google's ~60-character display limit
export const META_DESC_MAX = 160;
export const searchTitle = (p: { title: string; seoTitle?: string | null }) => (p.seoTitle?.trim() || p.title);
export const searchDescription = (p: { excerpt: string; metaDescription?: string | null }) => (p.metaDescription?.trim() || p.excerpt);

export type SeoCheck = { ok: boolean; label: string; hint: string };
/** A quick on-page checklist shown in the editor (the rules of thumb for content-led SEO). */
export function seoChecks(p: { title: string; seoTitle?: string | null; metaDescription?: string | null; excerpt: string; slug: string; body: string; words: number; h2: number; hasInternalLink: boolean }): SeoCheck[] {
  const t = searchTitle(p);
  const d = searchDescription(p);
  return [
    { ok: t.length > 0 && t.length <= SEO_TITLE_MAX, label: `Search title is ${t.length} characters`, hint: `Aim for ${SEO_TITLE_MAX} or fewer so it isn't cut off in Google (the site adds “· HomeOps”). Put the main keyword near the start.` },
    { ok: d.length >= 70 && d.length <= META_DESC_MAX, label: `Search description is ${d.length} characters`, hint: 'Write 70–160 characters that promise a clear benefit; it is the snippet people read before clicking.' },
    { ok: p.slug.length > 0 && p.slug.length <= 60 && p.slug.split('-').length <= 8, label: `URL is ${p.slug.length} characters`, hint: 'Keep it short and keyword-led (3–6 words). Don’t change it after publishing — links and rankings depend on it.' },
    { ok: p.h2 >= 3, label: `${p.h2} section heading${p.h2 === 1 ? '' : 's'} (##)`, hint: 'Break the article into at least 3 sections with ## headings; use the phrases people actually search for.' },
    { ok: p.words >= 600, label: `${p.words.toLocaleString()} words`, hint: 'In-depth guides (600+ words) tend to rank better than thin posts.' },
    { ok: p.hasInternalLink, label: p.hasInternalLink ? 'Links to another page on the site' : 'No internal links yet', hint: 'Link to a related post or to /register using [text](/path) so readers and search engines can follow.' },
  ];
}

export const parseTags = (raw: string) => [...new Set(raw.split(',').map((t) => t.trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean))].slice(0, 8);
