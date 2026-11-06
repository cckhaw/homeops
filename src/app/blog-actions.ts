'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { blogPosts } from '@/db/schema';
import { audit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { isBlogCategory, localToUtc, parseTags, slugError } from '@/lib/blog-core';
import { firstParagraph, slugify } from '@/lib/markdown-core';

type FormState = { error?: string; ok?: string } | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? '').trim().slice(0, max);

function refresh(slug: string) {
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);
  revalidatePath('/blog/rss.xml');
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin/blog');
}

/**
 * Creates or updates a post. `mode` decides visibility:
 *  - draft: not public
 *  - publish: public now (keeps the original publish time if it was already live)
 *  - schedule: becomes public by itself at the chosen time (entered in Singapore/Malaysia time)
 */
export async function saveBlogPost(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const title = str(fd, 'title', 160);
  const body = String(fd.get('body') ?? '').replace(/\r\n?/g, '\n').trim();
  const category = str(fd, 'category', 40);
  const mode = str(fd, 'mode', 10);
  if (!title) return { error: 'Give the post a title.' };
  if (!isBlogCategory(category)) return { error: 'Choose a category.' };
  if (body.length < 20) return { error: 'Write the post body (Markdown) before saving.' };
  if (body.length > 100_000) return { error: 'The post is too long (100,000 characters at most).' };
  const slug = str(fd, 'slug', 100) || slugify(title);
  const bad = slugError(slug);
  if (bad) return { error: bad };
  if (!['draft', 'publish', 'schedule'].includes(mode)) return { error: 'Choose whether to save a draft, publish now or schedule.' };
  const seoTitle = str(fd, 'seoTitle', 90) || null;
  const metaDescription = str(fd, 'metaDescription', 220) || null;
  const excerpt = str(fd, 'excerpt', 300) || firstParagraph(body, 220);
  if (!excerpt) return { error: 'Add a short summary (excerpt) for the blog list and search results.' };

  const clash = await db.select({ id: blogPosts.id }).from(blogPosts).where(id ? and(eq(blogPosts.slug, slug), ne(blogPosts.id, id)) : eq(blogPosts.slug, slug));
  if (clash.length) return { error: 'Another post already uses that URL name. Change the URL name.' };

  const [before] = id && UUID.test(id) ? await db.select().from(blogPosts).where(eq(blogPosts.id, id)) : [];
  if (id && !before) return { error: 'That post no longer exists.' };

  let status: 'draft' | 'published' = 'draft';
  let publishAt: Date | null = before?.publishAt ?? null;
  const now = new Date();
  if (mode === 'draft') {
    status = 'draft';
  } else if (mode === 'publish') {
    status = 'published';
    publishAt = before?.status === 'published' && before.publishAt && before.publishAt <= now ? before.publishAt : now;
  } else {
    const at = localToUtc(str(fd, 'publishAt', 16));
    if (!at) return { error: 'Choose the date and time to publish.' };
    if (at.getTime() <= now.getTime() + 30_000) return { error: 'The scheduled time must be in the future. To publish immediately choose “Publish now”.' };
    status = 'published';
    publishAt = at;
  }

  const values = { slug, title, excerpt, seoTitle, metaDescription, body, category, tags: parseTags(str(fd, 'tags', 300)).join(','), authorName: str(fd, 'author', 80) || 'HomeOps Team', status, publishAt, updatedAt: now };
  let postId = id;
  if (before) {
    await db.update(blogPosts).set(values).where(eq(blogPosts.id, before.id));
    if (before.slug !== slug) revalidatePath(`/blog/${before.slug}`);
  } else {
    const [created] = await db.insert(blogPosts).values({ ...values, createdBy: admin.id }).returning({ id: blogPosts.id });
    postId = created.id;
  }
  await audit({ id: admin.id, email: admin.email }, before ? 'blog.update' : 'blog.create', `${before ? 'Updated' : 'Created'} blog post “${title}” (${mode === 'schedule' ? `scheduled for ${publishAt?.toISOString()}` : mode})`);
  refresh(slug);
  if (!before) redirect(`/admin/blog/${postId}?saved=1`);
  revalidatePath(`/admin/blog/${postId}`);
  return { ok: mode === 'draft' ? 'Saved as a draft.' : mode === 'publish' ? 'Published.' : 'Scheduled.' };
}

export async function deleteBlogPost(id: string) {
  const admin = await requireAdmin();
  if (!UUID.test(id)) return;
  const [p] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!p) redirect('/admin/blog');
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  await audit({ id: admin.id, email: admin.email }, 'blog.delete', `Deleted blog post “${p.title}”`);
  refresh(p.slug);
  redirect('/admin/blog?deleted=1');
}

/** Takes a live or scheduled post back to a draft. */
export async function unpublishBlogPost(id: string) {
  const admin = await requireAdmin();
  if (!UUID.test(id)) return;
  const [p] = await db.update(blogPosts).set({ status: 'draft', updatedAt: new Date() }).where(eq(blogPosts.id, id)).returning();
  if (p) {
    await audit({ id: admin.id, email: admin.email }, 'blog.unpublish', `Moved blog post “${p.title}” back to draft`);
    refresh(p.slug);
  }
}
