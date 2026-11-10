import type { Metadata } from 'next';
import Link from 'next/link';
import { Calculator, Hourglass } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import NewsletterForm from '@/components/NewsletterForm';
import { TOOLS, toolUrl } from '@/lib/tools-pages';
import { siteBaseUrl } from '@/lib/donate';

export const metadata: Metadata = {
  title: 'Free home tools: air-con cost calculator and lifespan guide',
  description: 'Free, no sign-up tools for home owners in Singapore and Malaysia: estimate air-con servicing cost and check how long your appliances should last.',
  alternates: { canonical: '/tools' },
  openGraph: { type: 'website', title: 'Free home tools by Wodejia', description: 'Air-con cost calculator and appliance lifespan checker.', url: '/tools' },
};

const ICONS = { 'aircon-service-cost': Calculator, 'appliance-lifespan': Hourglass } as const;

export default function ToolsIndex() {
  const base = siteBaseUrl('http://localhost:3000');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', name: 'Free home tools', url: `${base}/tools`, inLanguage: 'en' },
      { '@type': 'ItemList', itemListElement: TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.title, url: `${base}${toolUrl(t.slug)}` })) },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: base }, { '@type': 'ListItem', position: 2, name: 'Free tools', item: `${base}/tools` }] },
    ],
  };
  return (
    <div className="min-h-dvh">
      <SiteHeader active="tools" />
      <main>
        <section className="bg-[radial-gradient(60rem_26rem_at_50%_-10rem,rgb(var(--brand)/0.14),transparent)] px-5 pb-10 pt-14 text-center sm:pt-20">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-tint">Free tools</p>
          <h1 className="mx-auto max-w-3xl text-balance text-[38px] font-bold leading-[1.08] tracking-tight sm:text-[54px]">Smarter decisions for your home</h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-[18px] leading-snug text-secondary">Quick calculators for home owners in Singapore and Malaysia. No sign-up, no e-mail needed.</p>
        </section>
        <section className="mx-auto grid max-w-5xl gap-4 px-5 pb-12 sm:grid-cols-2">
          {TOOLS.map((t) => { const Icon = ICONS[t.slug]; return (
            <Link key={t.slug} href={toolUrl(t.slug)} className="group rounded-2xl border bg-surface p-6 transition hover:-translate-y-0.5 hover:shadow-lg hairline">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-tint/10 text-tint"><Icon className="h-6 w-6" aria-hidden /></span>
              <h2 className="mt-4 text-[22px] font-bold tracking-tight">{t.title}</h2>
              <p className="mt-1 text-[15px] leading-snug text-secondary">{t.blurb}</p>
              <span className="mt-3 inline-block text-[15px] font-semibold text-tint">Open the tool →</span>
            </Link>); })}
        </section>
        <section className="mx-auto max-w-5xl px-5 pb-20"><NewsletterForm source="tools" /></section>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </div>
  );
}
