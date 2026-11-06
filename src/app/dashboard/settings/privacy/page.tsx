import Link from 'next/link';
import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { DeleteAccountForm } from '@/components/security-forms';

export const metadata = { title: 'Privacy & data · Settings' };

export default async function PrivacyPage() {
  const { user } = await requireHousehold();
  return (
    <>
      <PageHeader title="Privacy & data" subtitle="Your data is yours." />
      <GlassCard className="space-y-4">
        <p className="text-[14px] text-secondary">Download a copy any time, or read our <Link href="/privacy" className="font-semibold text-tint">Privacy Policy</Link> and <Link href="/terms" className="font-semibold text-tint">Terms</Link>.</p>
        <div className="flex flex-wrap gap-3">
          <a href="/api/export" download className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-tint/10 px-5 text-[17px] font-semibold text-tint">Download my data (JSON)</a>
          <a href="/api/export?format=csv" download className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-tint/10 px-5 text-[17px] font-semibold text-tint">Assets (CSV)</a>
        </div>
        <details className="rounded-xl border p-3 hairline">
          <summary className="min-h-[44px] cursor-pointer py-2.5 text-[17px] font-semibold text-bad">Delete my account…</summary>
          <div className="pt-3"><DeleteAccountForm hasPassword={!!user.passwordHash} needsCode={user.totpEnabled} /></div>
        </details>
      </GlassCard>
    </>
  );
}
