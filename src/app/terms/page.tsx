import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import LegalLayout, { Callout, Section, SUPPORT_EMAIL, type LegalSection } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'HomeOps is free donationware for personal household use. These friendly terms explain how the service works and what we each agree to.',
};

const sections: LegalSection[] = [
  { id: 'acceptance', title: 'Acceptance of terms' },
  { id: 'service', title: 'What HomeOps is' },
  { id: 'donationware', title: 'The donationware model' },
  { id: 'responsibilities', title: 'Your responsibilities' },
  { id: 'content', title: 'Your content' },
  { id: 'warranty', title: 'No warranty ("as is")' },
  { id: 'liability', title: 'Limitation of liability' },
  { id: 'third-parties', title: 'Third-party services and brands' },
  { id: 'changes', title: 'Modifications and termination' },
  { id: 'contact', title: 'Changes to these terms and contact' },
];

export default async function TermsPage() {
  const user = await getCurrentUser();
  return (
    <LegalLayout
      title="Terms of Service"
      intro="HomeOps is free donationware for personal household use. These terms are short and written in plain English: what you can expect from us, and what we ask of you."
      sections={sections}
      backHref={user ? '/dashboard' : '/'}
      other={{ href: '/privacy', label: 'Privacy Policy' }}
    >
      <Section id="acceptance" title="Acceptance of terms">
        <p>
          By creating an account or otherwise using HomeOps you agree to these Terms and to our <Link href="/privacy">Privacy Policy</Link>.
          If you do not agree, please do not use the service. You are free to stop using it at any time, and you can export your data and
          delete your account whenever you choose.
        </p>
      </Section>

      <Section id="service" title="What HomeOps is">
        <p>
          HomeOps is a productivity and record-keeping tool for your home: it lets you keep a digital passport of appliances and equipment,
          track warranties and service history, follow seasonal maintenance checklists, share a home with family members, and optionally
          publish a read-only Home Service Passport. You must be at least 18 years old, or have a parent or guardian&apos;s permission, to use it.
        </p>
      </Section>

      <Section id="donationware" title="The donationware model">
        <Callout>HomeOps is provided 100% free of charge for personal household use.</Callout>
        <ul>
          <li>There are no paid plans, subscriptions or hidden fees, and using HomeOps never requires a payment.</li>
          <li>
            If you enjoy HomeOps you may choose to support its development with a &ldquo;Buy me a coffee&rdquo; contribution or voluntary tip. Contributions
            are processed securely by Stripe, and are entirely optional.
          </li>
          <li>
            A contribution is a voluntary gift. It is not a purchase, a subscription, a commercial contract, an investment or any form of equity, and it
            does not give you extra features, priority support, ownership or any other right.
          </li>
          <li>Contributions are non-refundable, except where the law requires otherwise or where a payment was made in error. Contact us if that happens. Contributions are not tax-deductible.</li>
        </ul>
        <p>&ldquo;Personal household use&rdquo; means managing your own home and those of your family. Please contact us before using HomeOps for a business, for example a property-management company.</p>
      </Section>

      <Section id="responsibilities" title="Your responsibilities">
        <ul>
          <li><strong>Keep your account secure.</strong> Choose a strong password (at least 12 characters), consider turning on two-factor authentication, keep your recovery codes safe, and tell us promptly if you suspect unauthorised access. You are responsible for activity under your account.</li>
          <li><strong>Keep your data accurate and lawful.</strong> You are responsible for the information, photos and documents you add. Do not upload anything unlawful, infringing, or that contains other people&apos;s private information without their permission.</li>
          <li><strong>Share thoughtfully.</strong> People you invite to a home can see and edit its records. Anything you publish through a Home Service Passport can be seen by anyone with the link (and password, if you set one). You decide what to share and with whom.</li>
          <li><strong>Use the service fairly.</strong> Do not attempt to break, overload, scrape or gain unauthorised access to HomeOps or other people&apos;s data, and do not use it to harm or deceive others.</li>
        </ul>
      </Section>

      <Section id="content" title="Your content">
        <p>
          You own the data you put into HomeOps. You give us only the limited permission needed to store, process and display it back to you
          and to the people and passports you choose, so that the service can work. We do not claim any other rights to it, and how we handle it is
          described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </Section>

      <Section id="warranty" title="No warranty (“as is”)">
        <p>
          HomeOps is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>, without warranties of any kind, express or implied. It is a tracking and
          reminder tool. We do our best to make reminders, warranty dates and health scores helpful, but they depend on the information you enter,
          on e-mail delivery and on third-party services, so they may be late, wrong or missed. Health scores and brand logos are for convenience only
          and are not professional inspections or advice. We do not promise that the service will be uninterrupted, error-free or secure at all times.
        </p>
      </Section>

      <Section id="liability" title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, HomeOps and its owner are not liable for any indirect, incidental or consequential loss, including
          missed maintenance, expired or lost warranties, denied claims, appliance failures or breakdowns, property damage, lost data or lost profit,
          arising from your use of (or inability to use) the service. Because HomeOps is free, our total liability for any claim is limited to the
          greater of the amount you paid us in the 12 months before the claim (which for most people is zero) or US$50. Nothing in these terms limits
          liability that cannot be limited by law, or any rights you have as a consumer that cannot be waived.
        </p>
        <p>Please keep your own copies of anything important, such as original receipts and warranty documents. You can export your HomeOps data at any time.</p>
      </Section>

      <Section id="third-parties" title="Third-party services and brands">
        <p>
          HomeOps relies on third-party services (hosting, database, e-mail, payments, receipt reading and optional Google sign-in) described in the
          Privacy Policy, and is subject to their availability. Brand names and logos shown on assets belong to their respective owners, are used only
          to help you identify your own appliances, and do not imply any affiliation with or endorsement by those companies.
        </p>
      </Section>

      <Section id="changes" title="Modifications and termination">
        <ul>
          <li><strong>You can leave any time.</strong> Export your data and delete your account from <em>Settings → Privacy &amp; data</em>.</li>
          <li><strong>We may change the service.</strong> We may add, change or remove features, or discontinue HomeOps altogether. Where practical we will give advance notice and a chance to export your data first.</li>
          <li><strong>We may suspend accounts</strong> that seriously or repeatedly break these terms, abuse the service or put other users or the service at risk, and will explain why where we can.</li>
        </ul>
      </Section>

      <Section id="contact" title="Changes to these terms and contact">
        <p>
          We may update these terms from time to time. If we make a meaningful change we will update the date at the top and, where practical, let you know in the app or by
          e-mail. Continuing to use HomeOps after a change means you accept the updated terms. Questions? Write to{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
