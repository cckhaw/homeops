import type { Metadata } from 'next';
import Link from 'next/link';
import AirconPowerCalculator from '@/components/AirconPowerCalculator';
import ToolPage, { type ToolFaq } from '@/components/ToolsChrome';

export const metadata: Metadata = {
  title: 'Air-con electricity cost calculator for Singapore and Malaysia',
  description: 'How much does it cost to run an air-con each month? Estimate the electricity bill for your units in Singapore or Malaysia and see what an inverter could save.',
  alternates: { canonical: '/tools/aircon-electricity-cost' },
  openGraph: { type: 'website', title: 'Air-con electricity cost calculator', description: 'Estimate the monthly running cost of your air-con.', url: '/tools/aircon-electricity-cost' },
};

const FAQS: ToolFaq[] = [
  { q: 'How much electricity does a 1 HP air-con use?', a: 'A typical 1 HP inverter air-con draws about 0.6 kW when working hard, and less once the room is cool. Running 8 hours a day it uses roughly 100 kWh a month. A non-inverter unit of the same size uses about a third more.' },
  { q: 'Is an inverter air-con really cheaper to run?', a: 'Usually yes. An inverter slows its compressor instead of switching it on and off, which saves energy and holds the temperature steadily. The saving is biggest for units that run for many hours a day.' },
  { q: 'Does a lower temperature setting cost more?', a: 'Yes. As a rule of thumb each degree you raise the thermostat saves about 6% of the energy. Many people are comfortable at 25 to 26°C, with a fan helping air move.' },
  { q: 'What price per kWh should I use?', a: 'Use the rate on your latest bill. The defaults here are typical figures for Singapore and Malaysia, but tariffs change and Malaysian rates depend on how much you use, so your own bill is the best source.' },
  { q: 'Why is my real bill higher than the estimate?', a: 'Dirty filters and coils, a low gas level, an oversized or old unit, poor insulation, or sun on the room all raise consumption. Regular servicing is the cheapest fix, and a clean unit also cools faster.' },
];

export default function Page() {
  return (
    <ToolPage slug="aircon-electricity-cost" title="Air-con electricity cost calculator" appName="Air-con electricity cost calculator" faqs={FAQS}
      intro="See roughly what your air-cons cost to run each month in Singapore or Malaysia, and what an inverter model or a slightly warmer setting could save.">
      <AirconPowerCalculator />
      <section className="mt-12 max-w-3xl space-y-3 text-[16px] leading-relaxed text-secondary" aria-labelledby="how-h">
        <h2 id="how-h" className="text-[26px] font-bold tracking-tight text-label">Ways to lower the bill</h2>
        <p>Service the unit regularly, set the thermostat at 25 to 26°C, use the timer or sleep mode, close doors and curtains against afternoon sun, and replace very old non-inverter units. Our guide explains each step: <Link href="/blog/lower-aircon-electricity-bill-singapore-malaysia" className="font-semibold text-tint">how to lower your air-con electricity bill</Link>.</p>
        <p>Servicing has its own cost: see the <Link href="/tools/aircon-service-cost" className="font-semibold text-tint">air-con service cost calculator</Link> for a yearly estimate.</p>
      </section>
    </ToolPage>
  );
}
