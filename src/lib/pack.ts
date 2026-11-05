import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, documents, maintenanceTasks, serviceRecords, utilityBills } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { resolveHomes } from '@/lib/household';
import { resolvePrefs } from '@/lib/prefs';
import { headers } from 'next/headers';
import { UTILITY_KINDS } from '@/lib/utilities-core';
import { formatCurrency, formatDate, todayISO, FREQUENCY_LABEL } from '@/lib/utils';
import type { PackData } from '@/lib/pack-core';
import { contractorsForHome } from '@/lib/contractors';

export type PackOptions = { documents: boolean; contractors: boolean; bills: boolean };

export const parsePackOptions = (sp: URLSearchParams): PackOptions => ({ documents: sp.get('docs') === '1', contractors: sp.get('contractors') === '1', bills: sp.get('bills') === '1' });

/** The signed-in owner/admin of their active home, or a ready-made refusal. Move-out packs contain everything, so members can't pull them. */
export async function packAccess() {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not signed in', status: 401 as const };
  const { active } = await resolveHomes(user.id, user.fullName);
  if (active.role !== 'owner' && active.role !== 'admin') return { error: 'Only a home owner or admin can create a move-out pack.', status: 403 as const };
  const prefs = resolvePrefs(user, active.household, (await headers()).get('accept-language'));
  return { user, household: active.household, prefs };
}

/** Rows for the pack. File lists are filled in by the caller (the zip route) once it knows what it could include. */
export async function loadPackRows(householdId: string, opts: PackOptions) {
  const [a, s, t, c, d, b] = await Promise.all([
    db.select().from(assets).where(eq(assets.householdId, householdId)).orderBy(asc(assets.name)),
    db.select().from(serviceRecords).where(eq(serviceRecords.householdId, householdId)).orderBy(asc(serviceRecords.serviceDate)),
    db.select().from(maintenanceTasks).where(eq(maintenanceTasks.householdId, householdId)).orderBy(asc(maintenanceTasks.dueDate)),
    opts.contractors ? contractorsForHome(householdId) : Promise.resolve([]),
    opts.documents ? db.select().from(documents).where(eq(documents.householdId, householdId)).orderBy(asc(documents.title)) : Promise.resolve([]),
    opts.bills ? db.select().from(utilityBills).where(eq(utilityBills.householdId, householdId)) : Promise.resolve([]),
  ]);
  return { assets: a, services: s, tasks: t, contractors: c, documents: d, bills: b };
}

export function buildPackData(
  home: { name: string; address: string | null },
  prefs: { locale: string; currency: string },
  rows: Awaited<ReturnType<typeof loadPackRows>>,
  opts: PackOptions,
  filesByAsset: Map<string, string[]>,
  fileByDocument: Map<string, string>,
): PackData {
  const name = new Map(rows.assets.map((x) => [x.id, x.name]));
  const byYear = new Map<number, Map<string, number>>();
  for (const bill of rows.bills) {
    const y = Number(bill.period.slice(0, 4));
    const m = byYear.get(y) ?? new Map<string, number>();
    m.set(bill.kind, (m.get(bill.kind) ?? 0) + bill.amountCents);
    byYear.set(y, m);
  }
  return {
    home,
    generatedOn: todayISO(),
    money: (c) => (c == null ? '' : formatCurrency(c, prefs.currency, prefs.locale)),
    date: (d) => (d ? formatDate(d, undefined, prefs.locale) : ''),
    assets: rows.assets.map((x) => ({ name: x.name, category: x.category, make: x.make, model: x.model ?? x.makeModel, serialNumber: x.serialNumber, installDate: x.installDate, warrantyExpiry: x.warrantyExpiry, purchaseCents: x.purchaseCents, notes: x.notes, files: filesByAsset.get(x.id) ?? [] })),
    services: rows.services.map((x) => ({ assetName: name.get(x.assetId) ?? '', serviceDate: x.serviceDate, description: x.description, provider: x.provider, costCents: x.costCents })),
    tasksDone: rows.tasks.filter((x) => x.status === 'completed').map((x) => ({ title: x.title, completedOn: x.completedAt ? x.completedAt.toISOString().slice(0, 10) : null, frequency: FREQUENCY_LABEL[x.frequency as keyof typeof FREQUENCY_LABEL] ?? x.frequency })),
    contractors: opts.contractors ? rows.contractors.map((x) => ({ name: x.name, trade: x.trade, phone: x.phone, email: x.email })) : undefined,
    documents: opts.documents ? rows.documents.map((x) => ({ title: x.title, category: x.category, expiresOn: x.expiresOn, file: fileByDocument.get(x.id) ?? null })) : undefined,
    bills: opts.bills ? [...byYear].sort((p, q) => q[0] - p[0]).map(([year, m]) => ({ year, totals: [...m].map(([k, cents]) => ({ label: UTILITY_KINDS.find((u) => u.id === k)?.label ?? k, cents })) })) : undefined,
  };
}
