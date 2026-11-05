import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, serviceRecords } from '@/db/schema';

/** Everything the spend report needs for one home. */
export async function loadReportInputs(householdId: string) {
  const [a, s] = await Promise.all([
    db.select({ id: assets.id, name: assets.name, category: assets.category, installDate: assets.installDate, purchaseCents: assets.purchaseCents }).from(assets).where(eq(assets.householdId, householdId)),
    db.select({ assetId: serviceRecords.assetId, serviceDate: serviceRecords.serviceDate, costCents: serviceRecords.costCents }).from(serviceRecords).where(eq(serviceRecords.householdId, householdId)),
  ]);
  return { assets: a, services: s };
}
