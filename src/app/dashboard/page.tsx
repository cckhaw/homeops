import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';
import { AlertTriangle, CalendarClock, Package, ShieldAlert } from 'lucide-react';
import { db } from '@/db';
import { assets, maintenanceTasks } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { daysUntil, warrantyState } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import AssetCard from '@/components/AssetCard';
import MaintenanceRow from '@/components/MaintenanceRow';
import PageHeader from '@/components/PageHeader';
import AppleButton from '@/components/AppleButton';

export const metadata = { title: 'Home' };

export default async function DashboardPage() {
  const { user, household } = await requireHousehold();
  const [homeAssets, pending] = await Promise.all([
    db.select().from(assets).where(eq(assets.householdId, household.id)).orderBy(asc(assets.name)),
    db
      .select()
      .from(maintenanceTasks)
      .where(and(eq(maintenanceTasks.householdId, household.id), eq(maintenanceTasks.status, 'pending')))
      .orderBy(asc(maintenanceTasks.dueDate)),
  ]);

  const assetName = new Map(homeAssets.map((a) => [a.id, a.name]));
  const overdue = pending.filter((t) => (daysUntil(t.dueDate) ?? 0) < 0);
  const urgent = pending.filter((t) => (daysUntil(t.dueDate) ?? 0) <= 14).slice(0, 6);
  const overdueByAsset = new Map<string, number>();
  for (const t of overdue) if (t.assetId) overdueByAsset.set(t.assetId, (overdueByAsset.get(t.assetId) ?? 0) + 1);
  const expiring = homeAssets.filter((a) => {
    const w = warrantyState(a.warrantyExpiry);
    return w.tone === 'warn';
  });
  const greeting = user.fullName?.split(' ')[0];

  return (
    <>
      <PageHeader title={greeting ? `Hi, ${greeting}` : 'Welcome'} subtitle={household.name} />

      <section className="mb-6 grid grid-cols-3 gap-3" aria-label="Summary">
        <Stat icon={Package} label="Assets" value={homeAssets.length} />
        <Stat icon={AlertTriangle} label="Overdue" value={overdue.length} tone={overdue.length ? 'bad' : undefined} />
        <Stat icon={ShieldAlert} label="Warranties ending" value={expiring.length} tone={expiring.length ? 'warn' : undefined} />
      </section>

      <section className="mb-8" aria-labelledby="urgent">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 id="urgent" className="text-[22px] font-bold">Up next</h2>
          <Link href="/dashboard/schedule" className="flex min-h-[44px] items-center text-[15px] text-tint">See all</Link>
        </div>
        <GlassCard className="py-2">
          {urgent.length === 0 ? (
            <p className="flex items-center gap-2 py-4 text-[15px] text-secondary">
              <CalendarClock className="h-5 w-5" aria-hidden /> Nothing due in the next two weeks. 🎉
            </p>
          ) : (
            <ul className="divide-y hairline [&>li]:border-inherit">
              {urgent.map((t) => (
                <MaintenanceRow key={t.id} id={t.id} title={t.title} dueDate={t.dueDate} frequency={t.frequency} completed={false} assetName={t.assetId ? assetName.get(t.assetId) : null} canDelete={false} />
              ))}
            </ul>
          )}
        </GlassCard>
      </section>

      <section aria-labelledby="assets">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 id="assets" className="text-[22px] font-bold">Active assets</h2>
          <Link href="/dashboard/assets" className="flex min-h-[44px] items-center text-[15px] text-tint">Manage</Link>
        </div>
        {homeAssets.length === 0 ? (
          <GlassCard className="space-y-3 text-center">
            <p className="text-[17px] font-semibold">Start your home passport</p>
            <p className="text-[15px] text-secondary">Add your first appliance — snap the receipt and we&apos;ll fill in the details.</p>
            <AppleButton href="/dashboard/assets">Add an asset</AppleButton>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {homeAssets.slice(0, 5).map((a) => (
              <AssetCard key={a.id} asset={a} overdueTasks={overdueByAsset.get(a.id) ?? 0} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone?: 'bad' | 'warn' }) {
  return (
    <GlassCard className="p-4">
      <Icon className={`mb-2 h-5 w-5 ${tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-tint'}`} aria-hidden />
      <p className="text-[28px] font-bold leading-none">{value}</p>
      <p className="mt-1 text-[12px] text-secondary">{label}</p>
    </GlassCard>
  );
}
