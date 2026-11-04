import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, maintenanceTasks } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { daysUntil } from '@/lib/utils';
import AssetCard from '@/components/AssetCard';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import { AddAssetSheet } from '@/components/forms';

export const metadata = { title: 'Assets' };

export default async function AssetsPage() {
  const { household } = await requireHousehold();
  const [list, pending] = await Promise.all([
    db.select().from(assets).where(eq(assets.householdId, household.id)).orderBy(asc(assets.name)),
    db
      .select()
      .from(maintenanceTasks)
      .where(and(eq(maintenanceTasks.householdId, household.id), eq(maintenanceTasks.status, 'pending'))),
  ]);
  const overdue = new Map<string, number>();
  for (const t of pending) if (t.assetId && (daysUntil(t.dueDate) ?? 0) < 0) overdue.set(t.assetId, (overdue.get(t.assetId) ?? 0) + 1);

  return (
    <>
      <PageHeader title="Assets" subtitle="Your digital asset passport" action={<AddAssetSheet />} />
      {list.length === 0 ? (
        <GlassCard className="py-10 text-center text-secondary">No assets yet. Tap “Add asset” to create your first passport entry.</GlassCard>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <AssetCard key={a.id} asset={a} overdueTasks={overdue.get(a.id) ?? 0} />
          ))}
        </div>
      )}
    </>
  );
}
