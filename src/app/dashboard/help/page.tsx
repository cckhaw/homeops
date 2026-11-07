import Link from 'next/link';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { requireHousehold } from '@/lib/auth';
import { FAQ_CATEGORIES, faqUrl } from '@/lib/faq';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import Markdown from '@/components/Markdown';
import FaqSearch from '@/components/FaqSearch';

export const metadata = { title: 'Help & FAQ', robots: { index: false, follow: false } };

/** The same help content as the public /faq pages, inside the app (with the menu). */
export default async function HelpPage() {
  await requireHousehold();
  return (
    <>
      <PageHeader title="Help & FAQ" subtitle="Quick answers about using Wodejia" />
      <div className="max-w-3xl">
        <div className="mb-6"><FaqSearch scope="help-all" /></div>
        <div id="help-all" className="space-y-8">
          {FAQ_CATEGORIES.map((c) => (
            <section key={c.slug} data-faq-group aria-labelledby={`h-${c.slug}`}>
              <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                <h2 id={`h-${c.slug}`} className="text-[20px] font-bold">{c.title}</h2>
                <Link href={faqUrl(c.slug)} className="inline-flex items-center gap-1 text-[13px] font-medium text-secondary hover:text-tint">On the web <ExternalLink className="h-3 w-3" aria-hidden /></Link>
              </div>
              <GlassCard className="py-1">
                <div className="divide-y hairline [&>details]:border-inherit">
                  {c.items.map((i) => (
                    <details key={i.slug} data-faq-item data-faq-text={`${i.q} ${i.a}`} className="group">
                      <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-3 text-[16.5px] font-semibold [&::-webkit-details-marker]:hidden">
                        {i.q}
                        <ChevronDown className="h-4 w-4 shrink-0 text-secondary transition-transform group-open:rotate-180" aria-hidden />
                      </summary>
                      <Markdown source={i.a} className="pb-4 !text-[15.5px] !leading-[1.65]" />
                    </details>
                  ))}
                </div>
              </GlassCard>
            </section>
          ))}
        </div>
        <p className="mt-8 text-[14px] text-secondary">Still stuck? See the contact details in our <Link href="/privacy" className="font-semibold text-tint">Privacy Policy</Link>.</p>
      </div>
    </>
  );
}
