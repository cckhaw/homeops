import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/db';
import { blogPosts } from '@/db/schema';
import { formatPostDateTime, postState, utcToLocal } from '@/lib/blog-core';
import PageHeader from '@/components/PageHeader';
import BlogEditor from '@/components/BlogEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit post · Admin' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  if (!UUID.test(id)) notFound();
  const [p] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!p) notFound();
  const state = postState(p);
  const note = state === 'scheduled' && p.publishAt ? `Scheduled — goes live ${formatPostDateTime(p.publishAt)}` : state === 'published' && p.publishAt ? `Live since ${formatPostDateTime(p.publishAt)}` : 'Draft — not visible to readers';
  return (
    <>
      <Link href="/admin/blog" className="mb-3 -ml-2 flex min-h-[44px] w-fit items-center gap-1 px-2 text-[17px] text-tint"><ArrowLeft className="h-5 w-5" aria-hidden /> Blog</Link>
      <PageHeader title="Edit post" subtitle={note} />
      {saved && <p role="status" className="mb-4 rounded-xl bg-ok/10 px-4 py-3 text-[15px] font-medium text-ok">Post created.</p>}
      <BlogEditor
        minLocal={utcToLocal(new Date())}
        post={{ id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body, category: p.category, tags: p.tags, authorName: p.authorName, state, publishAtLocal: p.publishAt ? utcToLocal(p.publishAt) : '' }}
      />
    </>
  );
}
