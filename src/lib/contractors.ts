import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { contractorHomes, contractors } from '@/db/schema';

/** Contractors that cover `householdId`, each with the ids of every home it covers (callers must not show names of homes the viewer isn't in). */
export async function contractorsForHome(householdId: string) {
  const rows = await db
    .select({ c: contractors })
    .from(contractorHomes)
    .innerJoin(contractors, eq(contractors.id, contractorHomes.contractorId))
    .where(eq(contractorHomes.householdId, householdId))
    .orderBy(asc(contractors.trade), asc(contractors.name));
  const ids = rows.map((r) => r.c.id);
  const links = ids.length ? await db.select().from(contractorHomes).where(inArray(contractorHomes.contractorId, ids)) : [];
  const homesOf = new Map<string, string[]>();
  for (const l of links) homesOf.set(l.contractorId, [...(homesOf.get(l.contractorId) ?? []), l.householdId]);
  return rows.map((r) => ({ ...r.c, homeIds: homesOf.get(r.c.id) ?? [] }));
}

/** True if the contractor covers at least one of the given homes. */
export async function coversAny(contractorId: string, householdIds: string[]) {
  if (!householdIds.length) return false;
  const [row] = await db.select({ id: contractorHomes.contractorId }).from(contractorHomes).where(and(eq(contractorHomes.contractorId, contractorId), inArray(contractorHomes.householdId, householdIds))).limit(1);
  return !!row;
}
