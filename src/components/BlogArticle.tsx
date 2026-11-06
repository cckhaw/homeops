import Link from 'next/link';
import { ArrowLeft, Clock, ListTree } from 'lucide-react';
import type { Post } from '@/lib/blog';
import { formatPostDate, parseTags } from '@/lib/blog-core';
import { outline, parseMarkdown, readingMinutes } from '@/lib/markdown-core';
import BlogCover from './BlogCover';
import Markdown from './Markdown';
import { CopyButton, ShareButton } from './misc';

/** The article layout, shared by the public page and the admin preview (which can show drafts). */
export default function BlogArticle({ post, related = [], preview }: { post: Post; related?: Post[]; preview?: boolean }) {
  const toc = outline(parseMarkdown(post.body)).filter((h) => h.level === 2);
  const tags = parseTags(post.tags);
  const path = `/blog/${post.slug}`;
  return (
    <article>
      <header className="bg-[radial-gradient(60rem_22rem_at_50%_-8rem,rgb(var(--brand)/0.12),transparent)] px-5 pb-10 pt-10 sm:pt-14">
        <div className="mx-auto max-w-3xl">
          <Link href="/blog" className="mb-6 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-medium text-secondary transition hover:text-label"><ArrowLeft className="h-4 w-4" aria-hidden /> All posts</Link>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-tint">{post.category}</p>
          <h1 className="mt-3 text-balance text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[48px]">{post.title}</h1>
          <p className="mt-4 text-pretty text-[19px] leading-snug text-secondary">{post.excerpt}</p>
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-secondary">
            <span className="font-semibold text-label">{post.authorName}</span><span aria-hidden>·</span>
            <time dateTime={post.publishAt?.toISOString()}>{post.publishAt ? formatPostDate(post.publishAt, true) : 'Unscheduled'}</time><span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{readingMinutes(post.body)} min read</span>
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5">
        <BlogCover category={post.category} large className="h-48 rounded-[28px] sm:h-64" />

        {toc.length > 2 && (
          <nav aria-label="In this article" className="mt-8 rounded-2xl border bg-surface/60 p-5 hairline">
            <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-secondary"><ListTree className="h-4 w-4" aria-hidden />In this article</p>
            <ol className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
              {toc.map((h, i) => (
                <li key={h.id}><a href={`#${h.id}`} className="flex min-h-[40px] items-center gap-2 text-[15px] text-secondary transition hover:text-tint"><span className="w-5 shrink-0 tabular-nums text-secondary/60">{i + 1}.</span>{h.text.replace(/^\d+\.\s*/, '')}</a></li>
              ))}
            </ol>
          </nav>
        )}

        <Markdown source={post.body} className="mt-6" />

        {tags.length > 0 && (
          <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
            {tags.map((t) => <li key={t} className="rounded-full bg-label/5 px-3 py-1 text-[13px] font-medium text-secondary">#{t}</li>)}
          </ul>
        )}

        {!preview && (
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t pt-6 hairline">
            <span className="text-[15px] font-semibold">Share this guide</span>
            <CopyButton path={path} />
            <ShareButton path={path} title={post.title} />
          </div>
        )}

        <aside className="mt-12 overflow-hidden rounded-[28px] bg-tint px-6 py-10 text-center text-ontint sm:px-10" aria-label="Try HomeOps">
          <h2 className="text-balance text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">Keep your whole home on schedule.</h2>
          <p className="mx-auto mt-2 max-w-md text-[16px] opacity-90">Track appliances, warranties and maintenance — and get reminded before anything slips.</p>
          <Link href="/register" className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-6 text-[16px] font-semibold text-black shadow-lg transition active:scale-[0.97]">Create your free account</Link>
        </aside>

        {related.length > 0 && (
          <section className="mt-14 pb-4" aria-labelledby="more-posts">
            <h2 id="more-posts" className="mb-4 text-[22px] font-bold">Keep reading</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.map((p) => (
                <Link key={p.id} href={`/blog/${p.slug}`} className="group glass overflow-hidden rounded-[22px] transition hover:shadow-lg">
                  <BlogCover category={p.category} className="h-28" />
                  <div className="p-5">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-tint">{p.category}</p>
                    <h3 className="mt-1 text-[17px] font-bold leading-snug">{p.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
