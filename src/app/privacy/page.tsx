import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import LegalLayout, { Callout, Section, SUPPORT_EMAIL, type LegalSection } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'HomeOps is privacy-first: we do not sell your data, run ads or use third-party trackers. Here is exactly what we collect and why.',
};

const sections: LegalSection[] = [
  { id: 'pledge', title: 'Our privacy pledge' },
  { id: 'collect', title: 'What data we collect' },
  { id: 'use', title: 'How we use your data' },
  { id: 'providers', title: 'Service providers we rely on' },
  { id: 'cookies', title: 'Cookies and local storage' },
  { id: 'security', title: 'Storage and security' },
  { id: 'passports', title: 'Public Home Passports' },
  { id: 'retention', title: 'How long we keep data' },
  { id: 'rights', title: 'Your rights' },
  { id: 'children', title: 'Children' },
  { id: 'changes', title: 'Changes and contact' },
];

export default async function PrivacyPage() {
  const user = await getCurrentUser();
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="HomeOps is built privacy-first. This page explains in plain English what we collect, why, who helps us run the service, and how you stay in control."
      sections={sections}
      backHref={user ? '/dashboard' : '/'}
      other={{ href: '/terms', label: 'Terms of Service' }}
    >
      <Section id="pledge" title="Our privacy pledge">
        <Callout>We do not sell your data. We do not show ads. We do not use third-party trackers or analytics.</Callout>
        <p>
          HomeOps exists to help you look after your home. We only collect what is needed to do that, we never share it for marketing, and
          you can export or erase it whenever you like. This policy is written to follow the spirit of data-protection principles such as
          Malaysia&apos;s Personal Data Protection Act 2010 and Singapore&apos;s Personal Data Protection Act 2012: collect only what is necessary,
          use it only for the purpose you gave it, keep it secure, and let you access, correct and delete it.
        </p>
      </Section>

      <Section id="collect" title="What data we collect">
        <p><strong>Account information</strong></p>
        <ul>
          <li>Your e-mail address and, optionally, a display name.</li>
          <li>Your sign-in credentials. Passwords are never stored in readable form: we keep only a salted one-way hash. If you turn on two-factor authentication we store its secret in encrypted form and your recovery codes as hashes.</li>
          <li>If you choose to sign in with Google or Apple (optional features): your name and e-mail address (and, for Google, profile picture) as provided by them.</li>
          <li>If you turn on WhatsApp reminders (optional): your WhatsApp number, kept until you remove it, and the reminder messages we send you. If you turn on push notifications (optional): a technical address for each device you allow, used only to deliver your reminders.</li>
          <li>Abuse protection and diagnostics: short-lived request counters (keyed by a one-way hash of your IP address or e-mail, deleted automatically) to limit repeated attempts, and technical error reports (message, page route, stack trace, never your personal data) stored in our own database to fix bugs.</li>
          <li>Your preferences, such as reminder e-mail settings.</li>
        </ul>
        <p><strong>Household data you choose to add</strong></p>
        <ul>
          <li>Your home&apos;s name and, optionally, its address.</li>
          <li>Asset records: names, categories, make, model, serial numbers, install and warranty dates, notes, and service history including provider names and costs.</li>
          <li>Files you upload: receipt photos or PDFs, appliance manuals and photos of your items.</li>
          <li>Maintenance tasks, their schedules and completion dates, and the members you invite to share a home.</li>
        </ul>
        <p><strong>Technical data</strong></p>
        <ul>
          <li>Standard server and security logs kept by our hosting provider (for example IP address, browser type and the pages requested). We use these only to run, secure and debug the service.</li>
        </ul>
        <p><strong>Donations</strong></p>
        <ul>
          <li>If you donate, payment is handled entirely by Stripe. HomeOps never sees or stores your card details. Stripe may share the donor name, e-mail address and amount with the HomeOps owner through the Stripe dashboard, which is used to say thank you and for accounting.</li>
        </ul>
      </Section>

      <Section id="use" title="How we use your data">
        <p>We use your data solely to:</p>
        <ul>
          <li>provide, maintain and secure your household dashboard and shared homes;</li>
          <li>send account e-mails you ask for (confirming your address, resetting your password) and maintenance reminders, but only if you turn reminders on;</li>
          <li>generate your Home Passport link, which you control;</li>
          <li>read a receipt when you press <em>Scan receipt</em> (the file is sent to our AI provider, Anthropic, solely to extract details such as the product name and dates. Nothing is scanned unless you choose to);</li>
          <li>detect and prevent abuse, and meet legal obligations.</li>
        </ul>
        <p>We do not use your data for advertising, profiling, or to train our own models, and we do not sell or rent it to anyone.</p>
      </Section>

      <Section id="providers" title="Service providers we rely on">
        <p>HomeOps is run on a small number of trusted services. They process data on our behalf, only to provide their service to us:</p>
        <ul>
          <li><strong>Vercel</strong>: website hosting and file storage (Vercel Blob) for uploaded receipts and manuals.</li>
          <li><strong>Neon</strong>: the encrypted Postgres database that stores your account and household records.</li>
          <li><strong>Resend</strong>: delivers account and reminder e-mails (receives your e-mail address and the message).</li>
          <li><strong>Stripe</strong>: processes optional donations.</li>
          <li><strong>Anthropic</strong>: reads receipts on request (see above).</li>
          <li><strong>Apple</strong>: optional &ldquo;Sign in with Apple&rdquo;. Apple tells us your name (first time only) and an e-mail address, which may be Apple&apos;s private relay address if you choose to hide yours.</li>
          <li><strong>Meta (WhatsApp Business)</strong>: only if you turn on WhatsApp reminders. Meta receives your number and the text of each reminder in order to deliver it.</li>
          <li><strong>Your browser&apos;s push service</strong> (Google, Apple or Mozilla): only if you turn on push notifications. It carries the notification to your device.</li>
          <li><strong>Cloudflare Turnstile</strong>: when enabled by the site owner, a privacy-friendly security check on sign-up, sign-in and password-reset forms, used to block automated abuse. It receives your IP address and basic browser signals; there is no advertising or tracking.</li>
          <li><strong>Google</strong>: optional sign-in. In addition, to show brand logos on your assets, your browser asks Google&apos;s public favicon service for the logo of the brand&apos;s website. This tells Google that your browser requested that logo, together with your IP address, but nothing from your account. If a logo can&apos;t load, a letter tile is shown instead.</li>
        </ul>
        <p>
          These providers may process data in countries other than Malaysia or Singapore, including the United States. By using HomeOps you
          understand your data may be transferred there; we choose providers that protect data in line with recognised industry standards.
        </p>
      </Section>

      <Section id="cookies" title="Cookies and local storage">
        <p>HomeOps uses only the cookies and browser storage it needs to work. There are no advertising or tracking cookies.</p>
        <ul>
          <li><strong>Session cookie</strong>: keeps you signed in.</li>
          <li><strong>Active-home cookie</strong>: remembers which of your homes you are viewing.</li>
          <li><strong>Passport access cookie</strong>: remembers that a visitor entered a password-protected passport&apos;s password, for 7 days.</li>
          <li><strong>Local storage</strong>: your theme (day or night), accent colour and sidebar choice, kept on your device only.</li>
          <li><strong>Offline cache</strong>: the installable app stores a few static files so it loads quickly.</li>
        </ul>
      </Section>

      <Section id="security" title="Storage and security">
        <ul>
          <li>Data is transmitted over encrypted connections (HTTPS) and stored in a managed Neon Postgres database that is encrypted at rest by the provider.</li>
          <li>Passwords are hashed with scrypt; two-factor secrets are encrypted; accounts lock temporarily after repeated failed sign-ins; changing your password signs out every other session.</li>
          <li>Uploaded receipts, manuals and item photos are stored in a <strong>private</strong> Vercel Blob bucket. They have no public web address: a file can only be opened by a signed-in member of the household it belongs to. Files are removed when you replace them, delete the asset or home, or delete your account (see &ldquo;Your rights&rdquo;). The only uploads that are publicly viewable are brand logos added by the site owner.</li>
          <li>No online service can be guaranteed perfectly secure. If a breach affecting your data occurs, we will tell affected users and the relevant authorities where the law requires.</li>
        </ul>
      </Section>

      <Section id="passports" title="Public Home Passports">
        <p>
          A Home Service Passport is a read-only page you can share with a buyer, agent or tenant. You decide whether it exists: you can protect
          it with a password, replace its link, or switch sharing off at any time from <em>Dashboard → Passport</em>.
        </p>
        <p><strong>It shows:</strong> your home&apos;s name, the address only if you entered one, each asset&apos;s name, category, make, model, install and warranty dates and health score, service descriptions with dates and costs, and the completed maintenance log.</p>
        <p><strong>It never shows:</strong> your e-mail address, your name, other members, serial numbers, notes, receipts, manuals, item photos or any account details.</p>
      </Section>

      <Section id="retention" title="How long we keep data">
        <p>
          We keep your data for as long as your account is open. When you delete your account, your records are erased from our live systems
          immediately. Copies may persist for a short, limited period in our database provider&apos;s automatic backups before they are overwritten.
          Sign-in and reset links expire within an hour, and hosting providers keep routine security logs for a limited time under their own policies.
        </p>
      </Section>

      <Section id="rights" title="Your rights">
        <ul>
          <li><strong>Access and export.</strong> Download everything you can see, as JSON or a spreadsheet of your assets, any time in <Link href="/dashboard/settings">Settings → Privacy &amp; data</Link>.</li>
          <li><strong>Correction.</strong> Edit your profile, homes, assets and tasks directly in the app.</li>
          <li><strong>Withdraw consent.</strong> Turn reminder e-mails off in Settings, or switch off Home Passport sharing.</li>
          <li>
            <strong>Deletion.</strong> <em>Settings → Privacy &amp; data → Delete my account</em> permanently erases your account and personal data right away.
            Homes only you belong to, with their assets, receipts and history, are erased completely. If you share a home with other people, it is
            not destroyed: ownership passes to another member and only your own membership and account are removed.
          </li>
          <li><strong>Questions or complaints.</strong> Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We will respond promptly, and you may also contact your local data-protection authority.</li>
        </ul>
        <p>Remember that everyone you invite to a shared home can see that home&apos;s records, so only invite people you trust.</p>
      </Section>

      <Section id="children" title="Children">
        <p>HomeOps is meant for adults managing a household. It is not directed at anyone under 18, and we do not knowingly collect their data. If you believe a child has given us personal data, contact us and we will delete it.</p>
      </Section>

      <Section id="changes" title="Changes and contact">
        <p>
          If we change this policy in a meaningful way we will update the date at the top and, where practical, tell you in the app or by e-mail.
          Questions about privacy? Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. See also our <Link href="/terms">Terms of Service</Link>.
        </p>
      </Section>
    </LegalLayout>
  );
}
