import type { Metadata } from 'next';
import Link from 'next/link';
import LifespanChecker from '@/components/LifespanChecker';
import ToolPage, { type ToolFaq } from '@/components/ToolsChrome';
import { LIFESPANS } from '@/lib/tools-core';

export const metadata: Metadata = {
  title: 'Appliance lifespan guide: how long do home appliances last?',
  description: 'How long do fridges, washing machines, air-cons and water heaters last? Typical lifespans, warning signs, and a free age checker for your appliances.',
  alternates: { canonical: '/tools/appliance-lifespan' },
  openGraph: { type: 'website', title: 'Appliance lifespan guide and age checker', description: 'Typical lifespans for home appliances and a free age checker.', url: '/tools/appliance-lifespan' },
};

const FAQS: ToolFaq[] = [
  { q: 'How long does a refrigerator last?', a: 'Most refrigerators last 10 to 15 years. In warm, humid homes the compressor works harder, so expect the lower end, and keep the coils and door seals clean.' },
  { q: 'How long does an air conditioner last?', a: 'A split air conditioner typically lasts 8 to 12 years. Regular servicing, a clean outdoor unit and avoiding constant all-day use help it reach the top of that range.' },
  { q: 'Should I repair or replace an old appliance?', a: 'A common rule of thumb: if the appliance is past its typical lifespan and the repair costs about half the price of a new one, replace it. If it is young, repair it, especially while the warranty still covers parts.' },
  { q: 'Does the tropical climate shorten appliance life?', a: 'Heat and humidity do add wear to cooling, laundry and electronics. Appliances that run all day, such as air-cons and fridges, tend to reach the lower end of their range unless they are kept clean and serviced.' },
  { q: 'Where do these lifespans come from?', a: 'They are widely used rules of thumb from manufacturers, repair trades and consumer guides, shown as ranges. Individual appliances vary with brand, use and care, so treat them as guidance, not a guarantee.' },
];

export default function Page() {
  return (
    <ToolPage slug="appliance-lifespan" title="Appliance lifespan guide and age checker" appName="Appliance lifespan checker" faqs={FAQS}
      intro="See how long common home appliances usually last, check where yours stands, and learn the warning signs that it is time to plan a replacement.">
      <LifespanChecker />
      <section className="mt-12" aria-labelledby="table-h">
        <h2 id="table-h" className="mb-4 text-[26px] font-bold tracking-tight">Typical lifespan of home appliances</h2>
        <div className="overflow-x-auto rounded-2xl border bg-surface hairline">
          <table className="w-full text-left text-[15px]" data-testid="lifespan-table">
            <thead className="text-secondary"><tr><th className="p-3 font-medium">Appliance</th><th className="p-3 font-medium">Typical lifespan</th><th className="p-3 font-medium">Signs it is time to replace</th></tr></thead>
            <tbody className="divide-y hairline [&>tr]:border-inherit">{LIFESPANS.map((l) => <tr key={l.id}><th scope="row" className="p-3 font-semibold">{l.name}</th><td className="whitespace-nowrap p-3">{l.min} to {l.max} years</td><td className="p-3 text-secondary">{l.signs}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-[16px] text-secondary">Keeping receipts, warranty dates and service history together makes the repair-or-replace decision easier. See our <Link href="/blog/home-appliance-warranty-checklist" className="font-semibold text-tint">home appliance warranty checklist</Link> and how <Link href="/faq/assets-and-warranties" className="font-semibold text-tint">Wodejia tracks warranties</Link>.</p>
      </section>
    </ToolPage>
  );
}
