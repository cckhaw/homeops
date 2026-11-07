import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FAQ_CATEGORIES, faqCategory, faqPageLd, faqUrl } from '@/lib/faq';
import { siteBaseUrl } from '@/lib/donate';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { Crumbs, Cta, QA } from '@/components/FaqPublic';
import { cn } from '@/lib/utils';

export const dynamicParams = false;
export const generateStaticParams = () => FAQ_CATEGORIES.map((c) => ({ category: c.slug }));

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const c = faqCategory((await params).category);
  if (!c) return {};
  return {
    title: c.seoTitle,
    description: c.seoDescription,
    alternates: { canonical: faqUrl(c.slug) },
    openGraph: { type: 'website', title: c.seoTitle, description: c.seoDescription, url: faqUrl(c.slug) },
  };
}

export default async function FaqCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const c = faqCategory((await params).category);
  if (!c) notFound();
  const base = siteBaseUrl('http://localhost:3000');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { ...faqPageLd(c.items), '@id': `${base}${faqUrl(c.slug)}#faq`, name: c.seoTitle, url: `${base}${faqUrl(c.slug)}`, inLanguage: 'en' },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: base },
        { '@type': 'ListItem', position: 2, name: 'FAQ', item: `${base}/faq` },
        { '@type': 'ListItem', position: 3, name: c.title, item: `${base}${faqUrl(c.slug)}` },
      ] },
    ],
  };
  return (
    <div className="min-h-dvh">
      <SiteHeader active="faq" />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[{ name: 'Help centre', href: '/faq' }, { name: c.title }]} />
        <h1 className="text-balance text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[44px]">{c.title}: frequently asked questions</h1>
        <p className="mt-3 text-[18px] leading-snug text-secondary">{c.blurb}</p>

        <nav aria-label="Topics" className="mt-6 flex flex-wrap gap-2">
          {FAQ_CATEGORIES.map((x) => (
            <Link key={x.slug} href={faqUrl(x.slug)} aria-current={x.slug === c.slug ? 'page' : undefined} className={cn('flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-semibold transition', x.slug === c.slug ? 'bg-tint text-ontint' : 'bg-label/5 text-secondary hover:bg-label/10')}>{x.title}</Link>
          ))}
        </nav>

        <div className="mt-8 space-y-4">{c.items.map((i) => <QA key={i.slug} cat={c.slug} item={i} />)}</div>
        <Cta />
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </div>
  );
}
