import type { Metadata } from 'next';
import Link from 'next/link';
import { FAQ_CATEGORIES, faqUrl } from '@/lib/faq';
import { siteBaseUrl } from '@/lib/donate';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import FaqSearch from '@/components/FaqSearch';
import { CategoryCard, Cta } from '@/components/FaqPublic';
import NewsletterForm from '@/components/NewsletterForm';

export const metadata: Metadata = {
  title: 'Help centre & FAQ: home maintenance, warranties, reminders',
  description: 'Answers about Wodejia: tracking appliances and warranties, receipt scanning, maintenance reminders, the Home Service Passport, privacy and your account.',
  alternates: { canonical: '/faq' },
  openGraph: { type: 'website', title: 'Wodejia help centre and FAQ', description: 'Answers about tracking appliances and warranties, reminders, sharing and privacy.', url: '/faq' },
};

export default function FaqIndex() {
  const base = siteBaseUrl('http://localhost:3000');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${base}/faq#page`, url: `${base}/faq`, name: 'Wodejia help centre and FAQ', inLanguage: 'en', isPartOf: { '@type': 'WebSite', name: 'Wodejia', url: base } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: base }, { '@type': 'ListItem', position: 2, name: 'FAQ', item: `${base}/faq` }] },
      { '@type': 'ItemList', itemListElement: FAQ_CATEGORIES.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: `${base}${faqUrl(c.slug)}` })) },
    ],
  };
  return (
    <div className="min-h-dvh">
      <SiteHeader active="faq" />
      <main>
        <section className="bg-[radial-gradient(60rem_26rem_at_50%_-10rem,rgb(var(--brand)/0.14),transparent)] px-5 pb-8 pt-14 text-center sm:pt-20">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-tint">Help centre</p>
          <h1 className="mx-auto max-w-3xl text-balance text-[38px] font-bold leading-[1.08] tracking-tight sm:text-[54px]">How can we help?</h1>
          <p className="mx-auto mb-8 mt-4 max-w-2xl text-balance text-[18px] leading-snug text-secondary">Answers about tracking appliances and warranties, reminders, sharing your home and keeping your data safe.</p>
          <FaqSearch scope="faq-all" />
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{FAQ_CATEGORIES.map((c) => <CategoryCard key={c.slug} c={c} />)}</div>
        </section>

        <section id="faq-all" className="mx-auto max-w-3xl px-5 pb-20 pt-10">
          {FAQ_CATEGORIES.map((c) => (
            <div key={c.slug} data-faq-group className="mb-10">
              <h2 className="mb-3 text-[24px] font-bold tracking-tight"><Link href={faqUrl(c.slug)} className="hover:text-tint">{c.title}</Link></h2>
              <ul className="divide-y rounded-2xl border bg-surface hairline [&>li]:border-inherit">
                {c.items.map((i) => (
                  <li key={i.slug} data-faq-item data-faq-text={`${i.q} ${i.a}`}>
                    <Link href={faqUrl(c.slug, i.slug)} className="flex min-h-[52px] items-center justify-between gap-3 px-5 py-3 text-[16.5px] font-medium transition hover:text-tint">{i.q}<span aria-hidden className="text-secondary">›</span></Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Cta />
          <div className="mt-10"><NewsletterForm source="faq" /></div>
        </section>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </div>
  );
}
