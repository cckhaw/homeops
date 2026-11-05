import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BadgeCheck, BellRing, ReceiptText, Users, Share2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import AppleButton from '@/components/AppleButton';
import { donationsEnabled } from '@/lib/donate';
import GlassCard from '@/components/GlassCard';
import Logo, { LogoMark } from '@/components/Logo';

export const dynamic = 'force-dynamic';

const features = [
  { icon: ReceiptText, title: 'Snap a receipt, done', body: 'Photograph a receipt and HomeOps reads the model, serial number and warranty dates for you.' },
  { icon: BellRing, title: 'Maintenance on autopilot', body: 'Seasonal checklists for filters, gutters, furnaces and more — they reschedule themselves when you check them off.' },
  { icon: Users, title: 'Built for the whole household', body: 'Invite your partner or co-owners with a private link. Everyone sees the same live checklist.' },
  { icon: BadgeCheck, title: 'A passport buyers trust', body: 'Share a read-only Home Service Passport that proves how well the home has been cared for.' },
];

export default async function Landing() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-20 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-2.5">
          <Link href="/" aria-label="HomeOps"><Logo size={36} /></Link>
          <AppleButton href="/login" variant="plain">Sign in</AppleButton>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:pt-24">
          <LogoMark size={88} className="mx-auto mb-5" />
          <p className="mb-4 text-[15px] font-semibold text-tint">Your home, documented.</p>
          <h1 className="text-[44px] font-bold leading-[1.05] tracking-tight sm:text-[64px]">
            The digital passport<br />for your home.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[19px] leading-snug text-secondary">
            Every appliance, warranty and service record in one place — with seasonal reminders so small jobs never become expensive repairs.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <AppleButton href="/register" className="min-w-[220px]">Get started — it&apos;s free</AppleButton>
            <AppleButton href="#how" variant="plain">See how it works</AppleButton>
          </div>
        </section>

        <section id="how" className="mx-auto grid max-w-5xl gap-4 px-5 pb-16 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, body }) => (
            <GlassCard key={title} className="p-6">
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-tint/10 text-tint"><Icon className="h-6 w-6" aria-hidden /></span>
              <h2 className="text-[21px] font-bold">{title}</h2>
              <p className="mt-1.5 text-[16px] leading-snug text-secondary">{body}</p>
            </GlassCard>
          ))}
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-20">
          <GlassCard className="flex flex-col items-center gap-4 p-8 text-center sm:p-12">
            <Share2 className="h-9 w-9 text-tint" aria-hidden />
            <h2 className="text-[30px] font-bold leading-tight">Selling or renting? Share your Home Service Passport.</h2>
            <p className="max-w-xl text-[17px] text-secondary">
              One link shows every appliance, every service and every completed check-up. Buyers and tenants see a well-kept home — and discover HomeOps for theirs.
            </p>
            <AppleButton href="/register">Create my passport</AppleButton>
          </GlassCard>
        </section>
      </main>

      <footer className="px-5 pb-10 text-center text-[13px] text-secondary">
        © {new Date().getFullYear()} HomeOps
        {donationsEnabled() && (
          <>
            {' · '}
            <Link href="/support" className="font-semibold text-tint">☕ Buy me a coffee</Link>
          </>
        )}
      </footer>
    </div>
  );
}
