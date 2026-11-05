import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, maintenanceTasks } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { getPrefs } from '@/lib/prefs';
import { daysUntil } from '@/lib/utils';
import AssetList from '@/components/AssetList';
import PageHeader from '@/components/PageHeader';
import { AddAssetSheet } from '@/components/forms';

export const metadata = { title: 'Assets' };

export default async function AssetsPage() {
  const { household } = await requireHousehold();
  const { locale } = await getPrefs();
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
      <AssetList assets={list} overdue={Object.fromEntries(overdue)} locale={locale} />
    </>
  );
}
