import { and, desc, eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
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

export const HOME_COOKIE = 'homeops_home';

/** Every home the user belongs to, most recently joined first. */
export async function listMemberships(userId: string) {
  return db
    .select({ household: households, role: householdMembers.role })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, userId))
    .orderBy(desc(householdMembers.createdAt));
}

/**
 * Resolves the home the user is working in: the one chosen via cookie (if they are
 * still a member), otherwise their most recently joined home. Creates a first home if none exist.
 */
export async function resolveHomes(userId: string, displayName: string | null) {
  let all = await listMemberships(userId);
  if (all.length === 0) {
    const first = displayName?.split(' ')[0];
    await createHousehold(userId, first ? `${first}'s Home` : 'My Home');
    all = await listMemberships(userId);
  }
  let wanted: string | undefined;
  try {
    wanted = cookies().get(HOME_COOKIE)?.value;
  } catch {
    // outside a request scope (e.g. scripts): fall back to the most recent home
  }
  const active = all.find((m) => m.household.id === wanted) ?? all[0];
  return { all, active };
}

/** Used at sign-in: guarantees at least one home exists. */
export async function ensureMembership(userId: string, displayName: string | null) {
  const { active } = await resolveHomes(userId, displayName);
  return active;
}

export async function isMember(userId: string, householdId: string) {
  const [m] = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), eq(householdMembers.householdId, householdId)));
  return !!m;
}
