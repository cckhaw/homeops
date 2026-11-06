import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { CalendarClock, ExternalLink, Eye, FilePen, Globe, Plus } from 'lucide-react';
import { db } from '@/db';
import { blogPosts } from '@/db/schema';
import { formatPostDateTime, postState, type PostState } from '@/lib/blog-core';
import { readingMinutes } from '@/lib/markdown-core';
import { cn } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Blog · Admin' };

const BADGE: Record<PostState, string> = { published: 'bg-ok/15 text-ok', scheduled: 'bg-tint/15 text-tint', draft: 'bg-label/10 text-secondary' };
const LABEL: Record<PostState, string> = { published: 'Published', scheduled: 'Scheduled', draft: 'Draft' };

export default async function AdminBlog({ searchParams: sp }: { searchParams: Promise<{ state?: string; deleted?: string }> }) {
  const { state: filter, deleted } = await sp;
  const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt));
  const now = new Date();
  const withState = rows.map((p) => ({ p, s: postState(p, now) }));
  const count = (s: PostState) => withState.filter((x) => x.s === s).length;
  const shown = withState.filter((x) => !filter || x.s === filter).sort((a, b) => (b.p.publishAt?.getTime() ?? b.p.updatedAt.getTime()) - (a.p.publishAt?.getTime() ?? a.p.updatedAt.getTime()));
  const tiles: { s: PostState; icon: typeof Globe }[] = [{ s: 'published', icon: Globe }, { s: 'scheduled', icon: CalendarClock }, { s: 'draft', icon: FilePen }];

  return (
    <>
      <PageHeader
        title="Blog"
        subtitle="Write, schedule and publish articles"
        action={<Link href="/admin/blog/new" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-tint px-5 text-[16px] font-semibold text-ontint transition active:scale-[0.97]"><Plus className="h-5 w-5" aria-hidden />New post</Link>}
      />
      {deleted && <p role="status" className="mb-4 rounded-xl bg-ok/10 px-4 py-3 text-[15px] font-medium text-ok">Post deleted.</p>}

      <div className="mb-5 grid grid-cols-3 gap-3">
        {tiles.map(({ s, icon: Icon }) => (
          <Link key={s} href={filter === s ? '/admin/blog' : `/admin/blog?state=${s}`} aria-current={filter === s ? 'true' : undefined} className={cn('glass rounded-apple p-4 transition hover:shadow-md', filter === s && 'ring-2 ring-tint/50')}>
            <Icon className="mb-2 h-5 w-5 text-secondary" aria-hidden />
            <p className="text-[26px] font-bold leading-none" data-testid={`count-${s}`}>{count(s)}</p>
            <p className="mt-1 text-[13px] text-secondary">{LABEL[s]}</p>
          </Link>
        ))}
      </div>

      <GlassCard className="py-1" padded={false}>
        {shown.length === 0 ? (
          <p className="px-5 py-10 text-center text-[15px] text-secondary">{rows.length ? 'No posts match this filter.' : 'No posts yet — write the first one.'}</p>
        ) : (
          <ul className="divide-y hairline [&>li]:border-inherit">
            {shown.map(({ p, s }) => (
              <li key={p.id} data-testid="admin-post" className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/blog/${p.id}`} className="block truncate text-[17px] font-semibold hover:text-tint">{p.title}</Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-secondary">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', BADGE[s])}>{LABEL[s]}</span>
                    <span>{p.category}</span><span aria-hidden>·</span>
                    <span>{s === 'scheduled' && p.publishAt ? `Goes live ${formatPostDateTime(p.publishAt)}` : s === 'published' && p.publishAt ? `Published ${formatPostDateTime(p.publishAt)}` : `Edited ${formatPostDateTime(p.updatedAt)}`}</span><span aria-hidden>·</span>
                    <span>{readingMinutes(p.body)} min read</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link href={`/admin/blog/${p.id}/preview`} target="_blank" aria-label={`Preview ${p.title}`} className="grid h-11 w-11 place-items-center rounded-xl text-secondary hover:bg-label/5 hover:text-label"><Eye className="h-5 w-5" aria-hidden /></Link>
                  {s === 'published' && <Link href={`/blog/${p.slug}`} target="_blank" aria-label={`View ${p.title} on the site`} className="grid h-11 w-11 place-items-center rounded-xl text-secondary hover:bg-label/5 hover:text-label"><ExternalLink className="h-5 w-5" aria-hidden /></Link>}
                  <Link href={`/admin/blog/${p.id}`} className="inline-flex min-h-[44px] items-center rounded-xl bg-tint/10 px-4 text-[15px] font-semibold text-tint">Edit</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </>
  );
}
