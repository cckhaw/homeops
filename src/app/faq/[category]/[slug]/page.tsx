import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allFaqItems, answerSnippet, faqItem, faqPageLd, faqUrl, relatedFaqs } from '@/lib/faq';
import { siteBaseUrl } from '@/lib/donate';
import Markdown from '@/components/Markdown';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { Crumbs, Cta } from '@/components/FaqPublic';

export const dynamicParams = false;
export const generateStaticParams = () => allFaqItems().map(({ category, item }) => ({ category: category.slug, slug: item.slug }));

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }): Promise<Metadata> {
  const { category, slug } = await params;
  const hit = faqItem(category, slug);
  if (!hit) return {};
  const description = answerSnippet(hit.item.a);
  return {
    title: hit.item.q,
    description,
    alternates: { canonical: faqUrl(category, slug) },
    openGraph: { type: 'article', title: hit.item.q, description, url: faqUrl(category, slug) },
  };
}

export default async function FaqQuestionPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  const hit = faqItem(category, slug);
  if (!hit) notFound();
  const { category: c, item } = hit;
  const base = siteBaseUrl('http://localhost:3000');
  const url = `${base}${faqUrl(c.slug, item.slug)}`;
  const related = relatedFaqs(c.slug, item.slug);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { ...faqPageLd([item]), '@id': `${url}#faq`, url, name: item.q, inLanguage: 'en', isPartOf: { '@type': 'WebPage', url: `${base}${faqUrl(c.slug)}` } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: base },
        { '@type': 'ListItem', position: 2, name: 'FAQ', item: `${base}/faq` },
        { '@type': 'ListItem', position: 3, name: c.title, item: `${base}${faqUrl(c.slug)}` },
        { '@type': 'ListItem', position: 4, name: item.q, item: url },
      ] },
    ],
  };
  return (
    <div className="min-h-dvh">
      <SiteHeader active="faq" />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[{ name: 'Help centre', href: '/faq' }, { name: c.title, href: faqUrl(c.slug) }, { name: item.q }]} />
        <h1 className="text-balance text-[32px] font-bold leading-[1.15] tracking-tight sm:text-[42px]">{item.q}</h1>
        <Markdown source={item.a} className="mt-5" />

        <section aria-labelledby="related" className="mt-12">
          <h2 id="related" className="mb-3 text-[20px] font-bold tracking-tight">Related questions</h2>
          <ul className="divide-y rounded-2xl border bg-surface hairline [&>li]:border-inherit">
            {related.map(({ category: rc, item: ri }) => (
              <li key={`${rc.slug}/${ri.slug}`}><Link href={faqUrl(rc.slug, ri.slug)} className="flex min-h-[52px] items-center justify-between gap-3 px-5 py-3 text-[16px] font-medium transition hover:text-tint">{ri.q}<span aria-hidden className="text-secondary">›</span></Link></li>
            ))}
          </ul>
          <p className="mt-4 text-[15px]"><Link href={faqUrl(c.slug)} className="font-semibold text-tint">More about {c.title.toLowerCase()}</Link> · <Link href="/faq" className="font-semibold text-tint">All help topics</Link></p>
        </section>
        <Cta />
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </div>
  );
}
