import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from './SiteChrome';
import NewsletterForm from './NewsletterForm';
import { TOOLS, toolUrl } from '@/lib/tools-pages';
import { siteBaseUrl } from '@/lib/donate';

export type ToolFaq = { q: string; a: string };

/** Shared layout for a tool page: breadcrumb, title, the tool, an explanation, FAQ (with structured data), related tools, sign-up bands. */
export default function ToolPage({ slug, title, intro, children, faqs, appName }: { slug: string; title: string; intro: string; children: React.ReactNode; faqs: ToolFaq[]; appName: string }) {
  const base = siteBaseUrl('http://localhost:3000');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebApplication', '@id': `${base}${toolUrl(slug)}#app`, name: appName, url: `${base}${toolUrl(slug)}`, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', inLanguage: 'en', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: 'Wodejia', url: base } },
      { '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: base }, { '@type': 'ListItem', position: 2, name: 'Free tools', item: `${base}/tools` }, { '@type': 'ListItem', position: 3, name: title, item: `${base}${toolUrl(slug)}` }] },
    ],
  };
  return (
    <div className="min-h-dvh">
      <SiteHeader active="tools" />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:pt-14">
        <nav aria-label="Breadcrumb" className="mb-6 text-[14px] text-secondary"><ol className="flex flex-wrap items-center gap-1.5"><li><Link href="/tools" className="font-medium text-tint hover:underline">Free tools</Link></li><li className="flex items-center gap-1.5"><ChevronRight className="h-3.5 w-3.5" aria-hidden /><span aria-current="page">{title}</span></li></ol></nav>
        <h1 className="text-balance text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[46px]">{title}</h1>
        <p className="mt-3 max-w-3xl text-[18px] leading-snug text-secondary">{intro}</p>
        <div className="mt-8">{children}</div>
        <section aria-labelledby="faq-h" className="mt-14">
          <h2 id="faq-h" className="mb-4 text-[26px] font-bold tracking-tight">Frequently asked questions</h2>
          <div className="space-y-3">{faqs.map((f) => <details key={f.q} className="group rounded-2xl border bg-surface p-5 hairline"><summary className="cursor-pointer list-none text-[17px] font-semibold [&::-webkit-details-marker]:hidden">{f.q}</summary><p className="mt-2 text-[16px] leading-relaxed text-secondary">{f.a}</p></details>)}</div>
        </section>
        <section className="mt-14 rounded-[28px] bg-tint px-6 py-10 text-center text-ontint sm:px-10" aria-label="Track your appliances">
          <h2 className="text-balance text-[26px] font-bold tracking-tight">Never forget a service or a warranty again</h2>
          <p className="mx-auto mt-2 max-w-xl text-[16px] opacity-90">Wodejia keeps your appliances, receipts and warranties in one place and reminds you when servicing is due.</p>
          <Link href="/register" className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-6 text-[17px] font-semibold text-black shadow-lg transition active:scale-[0.97]">Get started, it&apos;s free</Link>
        </section>
        <div className="mt-10"><NewsletterForm source="tools" /></div>
        <nav aria-label="More free tools" className="mt-10"><h2 className="mb-3 text-[20px] font-bold">More free tools</h2><ul className="grid gap-3 sm:grid-cols-2">{TOOLS.filter((t) => t.slug !== slug).map((t) => <li key={t.slug}><Link href={toolUrl(t.slug)} className="block rounded-2xl border bg-surface p-4 hairline transition hover:-translate-y-0.5 hover:shadow-lg"><span className="block text-[17px] font-semibold">{t.title}</span><span className="mt-1 block text-[14px] text-secondary">{t.blurb}</span></Link></li>)}</ul></nav>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </div>
  );
}
