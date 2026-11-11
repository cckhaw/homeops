import type { Metadata } from 'next';
import Link from 'next/link';
import RepairReplaceChecker from '@/components/RepairReplaceChecker';
import ToolPage, { type ToolFaq } from '@/components/ToolsChrome';

export const metadata: Metadata = {
  title: 'Repair or replace calculator: is the repair worth it?',
  description: 'Free repair-or-replace calculator for home appliances. Compare the repair quote with the price of a new one, adjusted for age and warranty.',
  alternates: { canonical: '/tools/repair-or-replace' },
  openGraph: { type: 'website', title: 'Repair or replace calculator', description: 'Is that repair quote worth it? Get a clear recommendation.', url: '/tools/repair-or-replace' },
};

const FAQS: ToolFaq[] = [
  { q: 'What is the 50% rule for repairing appliances?', a: 'If a repair costs half or more of the price of a new appliance, replacing it is usually the better buy. This calculator uses that rule and adjusts it for the age of the appliance, so an old unit gets replaced earlier than a young one.' },
  { q: 'When should I always repair?', a: 'When the appliance is still under warranty, when it is young and the fault is small, or when the part is cheap and easy to fit. Claim under warranty first before you pay for anything.' },
  { q: 'When should I replace even if the repair is cheaper?', a: 'When the appliance is past its typical lifespan and the repair is a large share of a new price, since the next fault is likely soon. Also consider energy use: a much more efficient new model, especially an inverter air-con or fridge, can pay back part of its price in lower bills.' },
  { q: 'Should I include installation and disposal in the new price?', a: 'Yes. Add delivery, installation and the cost of removing the old unit to the new price for a fair comparison. For a quote, ask whether the labour and parts have their own warranty.' },
  { q: 'Is a second opinion worth getting?', a: 'For any repair above a few hundred dollars, yes. A second quote, ideally from the brand service centre and one independent technician, takes a day and can change the decision.' },
];

export default function Page() {
  return (
    <ToolPage slug="repair-or-replace" title="Repair or replace calculator" appName="Repair or replace calculator" faqs={FAQS}
      intro="Got a repair quote? Compare it with the price of a new appliance, adjusted for the appliance's age and warranty, and get a clear recommendation.">
      <RepairReplaceChecker />
      <section className="mt-12 max-w-3xl space-y-3 text-[16px] leading-relaxed text-secondary" aria-labelledby="how-h">
        <h2 id="how-h" className="text-[26px] font-bold tracking-tight text-label">How the recommendation works</h2>
        <p>We compare the repair quote with the price of a new appliance, then look at how much of the typical lifespan is used. Cheap repairs on younger appliances are worth doing. Repairs at half the price of a new one, or large repairs on old appliances, usually are not.</p>
        <p>See our full guide: <Link href="/blog/repair-or-replace-appliance-guide" className="font-semibold text-tint">repair or replace? How to decide in five minutes</Link>. Not sure how old your appliance is? Use the <Link href="/tools/appliance-lifespan" className="font-semibold text-tint">appliance lifespan checker</Link>.</p>
      </section>
    </ToolPage>
  );
}
