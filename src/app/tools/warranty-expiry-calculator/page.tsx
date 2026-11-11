import type { Metadata } from 'next';
import Link from 'next/link';
import WarrantyChecker from '@/components/WarrantyChecker';
import ToolPage, { type ToolFaq } from '@/components/ToolsChrome';

export const metadata: Metadata = {
  title: 'Warranty expiry calculator: when does my warranty end?',
  description: 'Free warranty expiry calculator. Enter the purchase date and warranty length to see the end date, the days left, and what to do before it runs out.',
  alternates: { canonical: '/tools/warranty-expiry-calculator' },
  openGraph: { type: 'website', title: 'Warranty expiry calculator', description: 'Find out exactly when your warranty ends and how many days are left.', url: '/tools/warranty-expiry-calculator' },
};

const FAQS: ToolFaq[] = [
  { q: 'When does a warranty start?', a: 'Usually on the purchase date or the delivery date shown on your receipt or invoice. Some brands start it when the product is installed or registered, so check your warranty card. When in doubt, the date on the receipt is the safest one to use.' },
  { q: 'Is the last day of the warranty still covered?', a: 'Yes. A 12-month warranty bought on 1 March 2026 runs through 1 March 2027, so a fault reported that day is within the warranty. This calculator counts that last day as covered.' },
  { q: 'What do I need to make a warranty claim?', a: 'The receipt or invoice, the warranty card if there is one, the model and serial number (often on the nameplate), and a clear description of the fault with photos or a short video. Report the fault in writing before the end date.' },
  { q: 'What is not covered by a normal warranty?', a: 'Typically accidental damage, misuse, unauthorised repairs, consumables such as filters and bulbs, and cosmetic wear. Read the exact terms, as some brands cover parts but not labour, or the compressor for longer than the rest of the unit.' },
  { q: 'Can I get a free check before the warranty ends?', a: 'There is no rule that entitles you to one, but it is smart to test every function and report faults in the last two months. Many owners set a reminder 60 days before expiry for exactly this reason.' },
];

export default function Page() {
  return (
    <ToolPage slug="warranty-expiry-calculator" title="Warranty expiry calculator" appName="Warranty expiry calculator" faqs={FAQS}
      intro="Find out exactly when a warranty ends and how many days you have left to make a claim. Works for any appliance, phone or gadget.">
      <WarrantyChecker />
      <section className="mt-12 max-w-3xl space-y-3 text-[16px] leading-relaxed text-secondary" aria-labelledby="how-h">
        <h2 id="how-h" className="text-[26px] font-bold tracking-tight text-label">How to use your warranty well</h2>
        <p>Most warranties are lost not because the product is bad but because nobody remembered the date or kept the receipt. Put the end date in your calendar, keep a photo of the receipt, and test everything about two months before the end.</p>
        <p>If something fails, read our guide to <Link href="/blog/how-to-claim-appliance-warranty-singapore-malaysia" className="font-semibold text-tint">claiming an appliance warranty in Singapore and Malaysia</Link>. Wodejia can also <Link href="/faq/assets-and-warranties" className="font-semibold text-tint">track every warranty for you</Link> and remind you before each one ends.</p>
      </section>
    </ToolPage>
  );
}
