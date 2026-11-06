import 'server-only';
import { and, desc, eq, lte, ne } from 'drizzle-orm';
import { db } from '@/db';
import { blogPosts } from '@/db/schema';
import { parseTags } from '@/lib/blog-core';

export type Post = typeof blogPosts.$inferSelect;

/** During `next build` without a database (CI) the blog pages render empty instead of failing; at runtime a real error is never hidden. */
async function readable<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (process.env.NEXT_PHASE === 'phase-production-build') return fallback;
    throw e;
  }
}

const liveWhere = () => and(eq(blogPosts.status, 'published'), lte(blogPosts.publishAt, new Date()));

/** Posts readers can see: marked published and past their publish time. Scheduled posts appear on their own once the time passes. */
export async function livePosts(limit = 100): Promise<Post[]> {
  return readable(() => db.select().from(blogPosts).where(liveWhere()).orderBy(desc(blogPosts.publishAt)).limit(limit), [] as Post[]);
}

export async function livePostBySlug(slug: string): Promise<Post | null> {
  const [p] = await db.select().from(blogPosts).where(and(eq(blogPosts.slug, slug), liveWhere()));
  return p ?? null;
}

/** Up to `n` other live posts, preferring the same category, then shared tags, then the newest. */
export async function relatedPosts(post: Post, n = 2): Promise<Post[]> {
  const others = await db.select().from(blogPosts).where(and(liveWhere(), ne(blogPosts.id, post.id))).orderBy(desc(blogPosts.publishAt)).limit(30);
  const mine = new Set(parseTags(post.tags));
  const score = (p: Post) => (p.category === post.category ? 10 : 0) + parseTags(p.tags).filter((t) => mine.has(t)).length;
  return others.sort((a, b) => score(b) - score(a)).slice(0, n);
}
