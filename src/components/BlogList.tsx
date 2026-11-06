import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { livePosts } from '@/lib/blog';
import { BLOG_CATEGORIES, categorySlug, formatPostDate } from '@/lib/blog-core';
import { readingMinutes } from '@/lib/markdown-core';
import { cn } from '@/lib/utils';
import BlogCover from './BlogCover';

/** The hero, category chips and post grid shared by /blog and /blog/category/[category]. Category pages have their own URL so search engines can index them. */
export default async function BlogList({ category }: { category?: string }) {
  const all = await livePosts();
  const posts = category ? all.filter((p) => p.category === category) : all;
  const cats = BLOG_CATEGORIES.filter((c) => all.some((p) => p.category === c));
  const [lead, ...rest] = posts;
  return (
    <>
      <section className="bg-[radial-gradient(60rem_26rem_at_50%_-10rem,rgb(var(--brand)/0.14),transparent)] px-5 pb-10 pt-14 text-center sm:pt-20">
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-tint">{category ? 'Category' : 'The HomeOps blog'}</p>
        <h1 className="mx-auto max-w-3xl text-balance text-[38px] font-bold leading-[1.08] tracking-tight sm:text-[56px]">
          {category ? `${category} guides` : 'Smarter ways to look after your home.'}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-[18px] leading-snug text-secondary">
          {category ? `Practical ${category.toLowerCase()} advice for homes in Singapore, Malaysia and beyond.` : 'Practical guides on maintenance, warranties and keeping everything organised — written for homes in Singapore, Malaysia and beyond.'}
        </p>
        {cats.length > 1 && (
          <nav aria-label="Categories" className="mt-8 flex flex-wrap justify-center gap-2">
            {[undefined, ...cats].map((c) => (
              <Link key={c ?? 'all'} href={c ? `/blog/category/${categorySlug(c)}` : '/blog'} aria-current={category === c ? 'page' : undefined}
                className={cn('flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-semibold transition', category === c ? 'bg-tint text-ontint' : 'bg-label/5 text-secondary hover:bg-label/10')}>
                {c ?? 'All posts'}
              </Link>
            ))}
          </nav>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        {!lead ? (
          <p className="rounded-3xl bg-label/5 px-6 py-14 text-center text-[17px] text-secondary">No posts here yet — check back soon.</p>
        ) : (
          <>
            <Link href={`/blog/${lead.slug}`} data-testid="post-card" className="group glass mb-6 grid overflow-hidden rounded-[28px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-xl md:grid-cols-[1.1fr_1fr]">
              <BlogCover category={lead.category} large className="min-h-[220px] md:min-h-[340px]" />
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-tint">{lead.category}</p>
                <h2 className="mt-2 text-balance text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">{lead.title}</h2>
                <p className="mt-3 text-[17px] leading-snug text-secondary">{lead.excerpt}</p>
                <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-secondary">
                  <time dateTime={lead.publishAt?.toISOString()}>{lead.publishAt && formatPostDate(lead.publishAt)}</time><span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{readingMinutes(lead.body)} min read</span>
                </p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[16px] font-semibold text-tint">Read the article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden /></span>
              </div>
            </Link>
            {rest.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <Link key={p.id} href={`/blog/${p.slug}`} data-testid="post-card" className="group glass flex flex-col overflow-hidden rounded-[24px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-xl">
                    <BlogCover category={p.category} className="h-40" />
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-[12px] font-semibold uppercase tracking-wide text-tint">{p.category}</p>
                      <h3 className="mt-1.5 text-[20px] font-bold leading-snug">{p.title}</h3>
                      <p className="mt-2 line-clamp-3 text-[15px] leading-snug text-secondary">{p.excerpt}</p>
                      <p className="mt-auto pt-4 text-[13px] text-secondary"><time dateTime={p.publishAt?.toISOString()}>{p.publishAt && formatPostDate(p.publishAt)}</time> · {readingMinutes(p.body)} min read</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
