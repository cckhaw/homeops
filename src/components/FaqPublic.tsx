import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { faqUrl, type Faq, type FaqCategory } from '@/lib/faq';
import Markdown from './Markdown';

export function Crumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-[14px] text-secondary">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={c.name} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            {c.href ? <Link href={c.href} className="font-medium text-tint hover:underline">{c.name}</Link> : <span aria-current="page">{c.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Cta() {
  return (
    <div className="mt-14 rounded-[28px] bg-tint px-6 py-10 text-center text-ontint sm:px-10">
      <h2 className="text-balance text-[26px] font-bold leading-tight tracking-tight">Ready to organise your home?</h2>
      <p className="mx-auto mt-2 max-w-lg text-[16px] opacity-90">Appliances, warranties, documents and maintenance in one place, with reminders before anything slips.</p>
      <Link href="/register" className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-6 text-[17px] font-semibold text-black shadow-lg transition active:scale-[0.97]">Get started, it&apos;s free</Link>
    </div>
  );
}

/** A question with its full answer, open on the page (good for readers and for search engines). */
export function QA({ cat, item, heading = 'h2' }: { cat: string; item: Faq; heading?: 'h2' | 'h3' }) {
  const H = heading;
  return (
    <article id={item.slug} data-faq-item className="scroll-mt-24 rounded-2xl border bg-surface p-5 hairline sm:p-6">
      <H className="text-[20px] font-bold leading-snug tracking-tight">
        <Link href={faqUrl(cat, item.slug)} className="hover:text-tint">{item.q}</Link>
      </H>
      <Markdown source={item.a} className="mt-2 !text-[16.5px] !leading-[1.7]" />
    </article>
  );
}

export function CategoryCard({ c }: { c: FaqCategory }) {
  return (
    <Link href={faqUrl(c.slug)} className="group flex flex-col rounded-2xl border bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-lg hairline">
      <h2 className="text-[19px] font-bold tracking-tight">{c.title}</h2>
      <p className="mt-1 flex-1 text-[15px] leading-snug text-secondary">{c.blurb}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-tint">{c.items.length} questions <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden /></span>
    </Link>
  );
}
