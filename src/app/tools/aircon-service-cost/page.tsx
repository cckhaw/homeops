import type { Metadata } from 'next';
import Link from 'next/link';
import AirconCalculator from '@/components/AirconCalculator';
import ToolPage, { type ToolFaq } from '@/components/ToolsChrome';

export const metadata: Metadata = {
  title: 'Air-con service cost calculator: Singapore and Malaysia',
  description: 'Free calculator: how much does air-con servicing cost per year in Singapore or Malaysia? Estimate general servicing, chemical wash and overhaul for your units.',
  alternates: { canonical: '/tools/aircon-service-cost' },
  openGraph: { type: 'website', title: 'Air-con service cost calculator', description: 'Estimate your yearly air-con servicing cost in Singapore or Malaysia.', url: '/tools/aircon-service-cost' },
};

const FAQS: ToolFaq[] = [
  { q: 'How much does air-con servicing cost in Singapore?', a: 'Typical market prices are roughly S$25 to S$45 per wall unit for general servicing, S$60 to S$100 for a chemical wash and S$150 to S$250 for a chemical overhaul, with discounts when several units are done together. Quotes vary by company and unit type.' },
  { q: 'How much does air-con servicing cost in Malaysia?', a: 'Typical ranges are around RM40 to RM80 per wall unit for general servicing, RM100 to RM180 for a chemical wash and RM250 to RM400 for a chemical overhaul. Prices differ between cities and companies, so ask for two or three quotes.' },
  { q: 'How often should I service my air-con in the tropics?', a: 'In hot, humid homes most technicians recommend a general service every three to four months, a chemical wash about once a year and a chemical overhaul every two to three years. Heavy use shortens these gaps.' },
  { q: 'Is a chemical wash the same as general servicing?', a: 'No. General servicing cleans the filters and the surface of the indoor coil. A chemical wash uses cleaning chemicals on the indoor unit, and a chemical overhaul also cleans the outdoor unit and fan parts. That is why they cost more.' },
  { q: 'How accurate is this calculator?', a: 'It gives a realistic range based on typical market prices for 2026, not a quote. Use it to judge whether a quote looks fair and to budget for the year. Always confirm what is included before you book.' },
];

export default function Page() {
  return (
    <ToolPage slug="aircon-service-cost" title="Air-con service cost calculator" appName="Air-con service cost calculator" faqs={FAQS}
      intro="Find out what a sensible yearly air-con servicing budget looks like for your home in Singapore or Malaysia, and whether the quote in front of you is fair.">
      <AirconCalculator />
      <section className="mt-12 max-w-3xl space-y-4 text-[17px] leading-relaxed">
        <h2 className="text-[26px] font-bold tracking-tight">How the estimate works</h2>
        <p>Prices are typical market ranges per unit for each type of visit. Chemical washes replace one general service that year, so you are not charged twice, and technicians usually discount jobs of three or more units, which is included. The number of visits follows how heavily you use your air-cons: light, normal or heavy.</p>
        <p>Want the full reasoning behind the visit schedule? Read <Link href="/blog/how-often-service-aircon-singapore-malaysia" className="font-semibold text-tint">How often should you service your air-con in Singapore/Malaysia?</Link> and our <Link href="/faq/maintenance-and-reminders" className="font-semibold text-tint">maintenance reminders FAQ</Link>.</p>
      </section>
    </ToolPage>
  );
}
