import { cookies } from 'next/headers';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { assets, households, maintenanceTasks, serviceRecords } from '@/db/schema';
import { daysUntil, healthScore } from '@/lib/utils';
import { safeEqual, sign } from '@/lib/security';

export const passportCookieName = (householdId: string) => `hp_${householdId.slice(0, 8)}`;

/** Cookie value is bound to the current password hash, so changing/removing the password revokes all unlocks. */
export const passportCookieValue = (home: { id: string; passportPasswordHash: string | null }) => sign(`passport:${home.id}:${home.passportPasswordHash ?? ''}`);

export async function findPassportHome(token: string) {
  if (!token || token.length < 10) return null;
  const [home] = await db.select().from(households).where(eq(households.passportToken, token));
  return home ?? null;
}

/** True when the passport has no password, or the visitor has unlocked it. */
export function isPassportUnlocked(home: { id: string; passportPasswordHash: string | null }): boolean {
  if (!home.passportPasswordHash) return true;
  const v = cookies().get(passportCookieName(home.id))?.value;
  return !!v && safeEqual(v, passportCookieValue(home));
}

/** Everything the read-only Home Service Passport exposes. No personal data (owner e-mail etc.). */
export async function loadPassport(token: string) {
  if (!token || token.length < 10) return null;
  const [home] = await db.select().from(households).where(eq(households.passportToken, token));
  if (!home) return null;

  const homeAssets = await db.select().from(assets).where(eq(assets.householdId, home.id)).orderBy(asc(assets.name));
  const ids = homeAssets.map((a) => a.id);
  const [records, done, pending] = await Promise.all([
    ids.length
      ? db.select().from(serviceRecords).where(inArray(serviceRecords.assetId, ids)).orderBy(desc(serviceRecords.serviceDate))
      : Promise.resolve([]),
    db
      .select()
      .from(maintenanceTasks)
      .where(and(eq(maintenanceTasks.householdId, home.id), eq(maintenanceTasks.status, 'completed')))
      .orderBy(desc(maintenanceTasks.completedAt))
      .limit(200),
    db
      .select()
      .from(maintenanceTasks)
      .where(and(eq(maintenanceTasks.householdId, home.id), eq(maintenanceTasks.status, 'pending'))),
  ]);

  const overdueByAsset = new Map<string, number>();
  for (const t of pending) {
    if (t.assetId && (daysUntil(t.dueDate) ?? 0) < 0) overdueByAsset.set(t.assetId, (overdueByAsset.get(t.assetId) ?? 0) + 1);
  }
  // Whitelist only what a public passport may show. Serial numbers, notes, receipt/manual links, and
  // internal ids of the household are deliberately NOT included.
  const scored = homeAssets.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    make: a.make,
    model: a.model,
    makeModel: a.makeModel,
    installDate: a.installDate,
    warrantyExpiry: a.warrantyExpiry,
    health: healthScore({ installDate: a.installDate, warrantyExpiry: a.warrantyExpiry, overdueTasks: overdueByAsset.get(a.id) ?? 0 }).score,
  }));
  const overall = scored.length ? Math.round(scored.reduce((s, a) => s + a.health, 0) / scored.length) : null;
  const overdueTotal = pending.filter((t) => (daysUntil(t.dueDate) ?? 0) < 0).length;

  return {
    home: { name: home.name, address: home.address, since: home.createdAt },
    assets: scored,
    records: records.map((r) => ({ id: r.id, assetId: r.assetId, serviceDate: r.serviceDate, description: r.description, costCents: r.costCents })),
    completed: done.map((t) => ({ id: t.id, title: t.title, completedAt: t.completedAt })),
    stats: { assets: scored.length, completed: done.length, overdue: overdueTotal, overall },
  };
}
