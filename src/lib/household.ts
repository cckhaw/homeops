import { and, asc, desc, eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { cookies, headers } from 'next/headers';
import { db } from '@/db';
import { households, householdMembers, maintenanceTasks, profiles } from '@/db/schema';
import { templateDueDate, templatesFor } from '@/lib/utils';
import { climateForLocale, currencyForLocale, pickLocale, type Climate } from '@/lib/locale';

export function newToken(bytes = 18): string {
  return randomBytes(bytes).toString('base64url');
}

export async function seedDefaultTasks(householdId: string, climate: Climate | string = 'temperate') {
  await db.insert(maintenanceTasks).values(
    templatesFor(climate).map((t) => ({
      householdId,
      title: t.title,
      frequency: t.frequency,
      dueDate: templateDueDate(t),
    })),
  );
}

/** Adds the suggested tasks for the home's climate that are not on its list yet (matched by title). */
export async function addMissingClimateTasks(householdId: string, climate: string): Promise<number> {
  const existing = new Set((await db.select({ t: maintenanceTasks.title }).from(maintenanceTasks).where(eq(maintenanceTasks.householdId, householdId))).map((r) => r.t.toLowerCase()));
  const missing = templatesFor(climate).filter((t) => !existing.has(t.title.toLowerCase()));
  if (missing.length) {
    await db.insert(maintenanceTasks).values(missing.map((t) => ({ householdId, title: t.title, frequency: t.frequency, dueDate: templateDueDate(t) })));
  }
  return missing.length;
}

/** Defaults for a new home, from the visitor's browser language (e.g. ms-MY → MYR + tropical). */
async function regionalDefaults(): Promise<{ currency: string; climate: Climate }> {
  let locale = 'en-US';
  try {
    locale = pickLocale((await headers()).get('accept-language'));
  } catch {
    // outside a request (scripts): keep the generic defaults
  }
  return { currency: currencyForLocale(locale), climate: climateForLocale(locale) };
}

export async function createHousehold(userId: string, name: string) {
  const { currency, climate } = await regionalDefaults();
  const [h] = await db
    .insert(households)
    // Public Home Passport sharing starts OFF; an owner switches it on from the Passport page.
    .values({ name, ownerId: userId, currency, climate })
    .returning();
  await db.insert(householdMembers).values({ householdId: h.id, userId, role: 'owner' });
  await seedDefaultTasks(h.id, climate);
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
    wanted = (await cookies()).get(HOME_COOKIE)?.value;
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

export const displayName = (p: { fullName: string | null; email: string }) => p.fullName?.trim() || p.email.split('@')[0];

/** Everyone in a home, for assignment menus and "done by" labels. */
export async function listMembers(householdId: string): Promise<{ id: string; name: string }[]> {
  const rows = await db
    .select({ id: profiles.id, fullName: profiles.fullName, email: profiles.email })
    .from(householdMembers)
    .innerJoin(profiles, eq(profiles.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(asc(householdMembers.createdAt));
  return rows.map((r) => ({ id: r.id, name: displayName(r) }));
}
