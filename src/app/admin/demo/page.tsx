import { and, count, eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { getDemoConfig } from '@/lib/demo';
import { getSettings } from '@/lib/settings';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import DemoAdmin from '@/components/DemoAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Demo · Admin' };

export default async function AdminDemo() {
  const [s, cfg, [n]] = await Promise.all([getSettings(), getDemoConfig(), db.select({ n: count() }).from(profiles).where(and(eq(profiles.isDemo, true), eq(profiles.fullName, 'Alex Tan (Demo)')))]);
  return (
    <>
      <PageHeader title="Demo" subtitle="A showcase account for prospects: sign in with the details below and explore twelve fully populated sample homes" />
      <GlassCard className="mb-6"><DemoAdmin enabled={s.demo_enabled === 'true'} email={s.demo_email} password={s.demo_password} showHint={s.demo_show_hint !== 'false'} hours={cfg.hours} active={Number(n?.n ?? 0)} /></GlassCard>
      <h2 className="mb-2 px-1 text-[22px] font-bold">What visitors get</h2>
      <GlassCard className="space-y-2 text-[15px]">
        <p>Every sign-in creates a <b>private copy</b> of the sample data, so visitors never see each other&apos;s changes. Twelve homes of different types in Singapore, Malaysia, the US and Japan, covering every part of Wodejia:</p>
        <ul className="list-disc space-y-1 pl-5 text-secondary">
          <li>Assets with warranties in every state, service history across three years, QR labels and the spending report</li>
          <li>A schedule with overdue, due-soon and completed tasks, climate-aware starter tasks and Singapore/Malaysia property dates</li>
          <li>Contractors covering several homes, a document vault with expiring papers, and a year of utility bills with a spike</li>
          <li>Rentals: tenants, rent history with unpaid months, a lease ending soon, and move-in / move-out condition reports with a comparison</li>
          <li>Household members and roles, shared Home Service Passports, the move-out pack and calendar feed</li>
        </ul>
        <p className="text-secondary">Switched off for demo visitors: changing the password, two-factor sign-in, deleting the account, inviting people, file uploads, receipt and sticker scanning, and notifications. Demo accounts never get e-mails and are left out of Analytics and Users.</p>
      </GlassCard>
    </>
  );
}
