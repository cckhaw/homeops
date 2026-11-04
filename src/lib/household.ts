import { and, desc, eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { db } from '@/db';
import { households, householdMembers, maintenanceTasks } from '@/db/schema';
import { SEASONAL_TEMPLATES, nextOccurrence } from '@/lib/utils';

export function newToken(bytes = 18): string {
  return randomBytes(bytes).toString('base64url');
}

export async function seedDefaultTasks(householdId: string) {
  await db.insert(maintenanceTasks).values(
    SEASONAL_TEMPLATES.map((t) => ({
      householdId,
      title: t.title,
      frequency: t.frequency,
      dueDate: nextOccurrence(t.month, t.day),
    })),
  );
}

export async function createHousehold(userId: string, name: string) {
  const [h] = await db
    .insert(households)
    .values({ name, ownerId: userId, passportToken: newToken() })
    .returning();
  await db.insert(householdMembers).values({ householdId: h.id, userId, role: 'owner' });
  await seedDefaultTasks(h.id);
  return h;
}

/** The household a user is currently working in: their most recently joined one. */
export async function getActiveMembership(userId: string) {
  const [row] = await db
    .select({ household: households, role: householdMembers.role })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, userId))
    .orderBy(desc(householdMembers.createdAt))
    .limit(1);
  return row ?? null;
}

export async function ensureMembership(userId: string, displayName: string | null) {
  const existing = await getActiveMembership(userId);
  if (existing) return existing;
  const first = displayName?.split(' ')[0];
  const h = await createHousehold(userId, first ? `${first}'s Home` : 'My Home');
  return { household: h, role: 'owner' as string | null };
}

export async function isMember(userId: string, householdId: string) {
  const [m] = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), eq(householdMembers.householdId, householdId)));
  return !!m;
}
