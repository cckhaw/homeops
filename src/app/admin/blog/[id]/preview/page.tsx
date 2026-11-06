import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { blogPosts } from '@/db/schema';
import { formatPostDateTime, postState } from '@/lib/blog-core';
import BlogArticle from '@/components/BlogArticle';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Preview · Admin', robots: { index: false } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shows the saved version exactly as readers will see it — including drafts and scheduled posts. Admin only (the admin layout guards it). */
export default async function PreviewPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [p] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!p) notFound();
  const s = postState(p);
  return (
    <>
      <p role="status" className="mb-4 rounded-xl bg-warn/10 px-4 py-3 text-center text-[14px] font-medium text-warn">
        Preview — {s === 'draft' ? 'this draft is not visible to readers' : s === 'scheduled' && p.publishAt ? `goes live ${formatPostDateTime(p.publishAt)}` : 'this post is live'}
      </p>
      <div className="-mx-4 sm:-mx-6 md:mx-0"><BlogArticle post={p} preview /></div>
    </>
  );
}
