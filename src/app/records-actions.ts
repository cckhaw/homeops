'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from '@/db';
import { contractorHomes, contractors, documents, utilityBills } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { listMemberships } from '@/lib/household';
import { coversAny } from '@/lib/contractors';
import { deleteBlobs } from '@/lib/blob';
import { uploadFile } from '@/lib/storage';
import { isDocumentCategory } from '@/lib/documents-core';
import { isUtilityKind, monthStart } from '@/lib/utilities-core';
import { parseCurrencyToCents } from '@/lib/utils';
import { getPrefs } from '@/lib/prefs';

type FormState = { error?: string; ok?: string } | undefined;

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? '').trim().slice(0, max);
const optStr = (fd: FormData, k: string, max = 500) => str(fd, k, max) || null;
const isoDate = (fd: FormData, k: string) => {
  const v = str(fd, k, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};
const fileOf = (fd: FormData, k: string) => {
  const f = fd.get(k);
  return f instanceof File && f.size > 0 ? f : null;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const refresh = () => revalidatePath('/dashboard', 'layout');

// ------------------------------------------------------------------ Contractors

function contractorFields(fd: FormData, currency: string) {
  const phone = optStr(fd, 'phone', 40);
  if (phone && !/^[+\d][\d\s().-]{5,}$/.test(phone)) return { error: 'Enter the phone number using digits (and + for the country code).' } as const;
  const email = optStr(fd, 'email', 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'That e-mail address does not look right.' } as const;
  void currency;
  return { values: { name: str(fd, 'name', 120), trade: str(fd, 'trade', 60), phone, email, notes: optStr(fd, 'notes', 1000) } } as const;
}

/** Homes the signed-in user belongs to that were ticked on the form. Anything else is ignored (you can't attach a contractor to a home you're not in). */
async function pickedHomes(fd: FormData, userId: string) {
  const mine = (await listMemberships(userId)).map((m) => m.household.id);
  const wanted = fd.getAll('homeIds').map(String);
  return { mine, chosen: mine.filter((id) => wanted.includes(id)) };
}

export async function addContractor(_: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireHousehold();
  const { currency } = await getPrefs();
  const f = contractorFields(fd, currency);
  if ('error' in f) return { error: f.error };
  if (!f.values.name) return { error: 'Enter a name.' };
  if (!f.values.trade) return { error: 'Choose or type the trade (plumber, electrician…).' };
  const { chosen } = await pickedHomes(fd, user.id);
  if (!chosen.length) return { error: 'Choose at least one home this contractor covers.' };
  const [c] = await db.insert(contractors).values(f.values).returning({ id: contractors.id });
  await db.insert(contractorHomes).values(chosen.map((householdId) => ({ contractorId: c.id, householdId })));
  refresh();
  return { ok: 'Contractor saved.' };
}

export async function updateContractor(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireHousehold();
  const { currency } = await getPrefs();
  if (!UUID.test(id)) return { error: 'Not found.' };
  const f = contractorFields(fd, currency);
  if ('error' in f) return { error: f.error };
  if (!f.values.name || !f.values.trade) return { error: 'Name and trade are required.' };
  const { mine, chosen } = await pickedHomes(fd, user.id);
  if (!(await coversAny(id, mine))) return { error: 'Not found.' };
  // Links to homes this person isn't a member of belong to other households and are left alone.
  const others = await db.select({ h: contractorHomes.householdId }).from(contractorHomes).where(and(eq(contractorHomes.contractorId, id), mine.length ? notInArray(contractorHomes.householdId, mine) : undefined));
  if (!chosen.length && !others.length) return { error: 'Choose at least one home this contractor covers.' };
  await db.update(contractors).set(f.values).where(eq(contractors.id, id));
  if (mine.length) await db.delete(contractorHomes).where(and(eq(contractorHomes.contractorId, id), inArray(contractorHomes.householdId, mine)));
  if (chosen.length) await db.insert(contractorHomes).values(chosen.map((householdId) => ({ contractorId: id, householdId })));
  refresh();
  return { ok: 'Saved.' };
}

/** Removes the contractor from the home being viewed; the contractor itself goes only when no home covers it any more. */
export async function deleteContractor(id: string) {
  const { household } = await requireHousehold();
  if (!UUID.test(id)) return;
  await db.delete(contractorHomes).where(and(eq(contractorHomes.contractorId, id), eq(contractorHomes.householdId, household.id)));
  const [left] = await db.select({ h: contractorHomes.householdId }).from(contractorHomes).where(eq(contractorHomes.contractorId, id)).limit(1);
  if (!left) await db.delete(contractors).where(eq(contractors.id, id));
  refresh();
}

// ------------------------------------------------------------------ Documents

export async function addDocument(_: FormState, fd: FormData): Promise<FormState> {
  const { user, household } = await requireHousehold();
  const title = str(fd, 'title', 160);
  const category = str(fd, 'category', 60);
  if (!title) return { error: 'Give the document a title.' };
  if (!isDocumentCategory(category)) return { error: 'Choose a category.' };
  const file = await uploadFile(fileOf(fd, 'file'), `documents/${household.id}`);
  if (file.error) return { error: file.error };
  if (!file.url) return { error: 'Choose a file to upload (PDF or photo, up to 10 MB).' };
  await db.insert(documents).values({
    householdId: household.id, title, category, fileUrl: file.url, expiresOn: isoDate(fd, 'expiresOn'), notes: optStr(fd, 'notes', 1000), createdBy: user.id,
  });
  refresh();
  return { ok: 'Document saved to the vault.' };
}

export async function updateDocument(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const { household } = await requireHousehold();
  if (!UUID.test(id)) return { error: 'Not found.' };
  const title = str(fd, 'title', 160);
  const category = str(fd, 'category', 60);
  if (!title) return { error: 'Give the document a title.' };
  if (!isDocumentCategory(category)) return { error: 'Choose a category.' };
  const [before] = await db.select({ f: documents.fileUrl }).from(documents).where(and(eq(documents.id, id), eq(documents.householdId, household.id)));
  if (!before) return { error: 'Not found.' };
  const file = await uploadFile(fileOf(fd, 'file'), `documents/${household.id}`);
  if (file.error) return { error: file.error };
  await db.update(documents).set({ title, category, expiresOn: isoDate(fd, 'expiresOn'), notes: optStr(fd, 'notes', 1000), ...(file.url ? { fileUrl: file.url } : {}) })
    .where(and(eq(documents.id, id), eq(documents.householdId, household.id)));
  if (file.url) await deleteBlobs([before.f]);
  refresh();
  return { ok: 'Saved.' };
}

export async function deleteDocument(id: string) {
  const { household } = await requireHousehold();
  if (!UUID.test(id)) return;
  const [gone] = await db.select({ f: documents.fileUrl }).from(documents).where(and(eq(documents.id, id), eq(documents.householdId, household.id)));
  await db.delete(documents).where(and(eq(documents.id, id), eq(documents.householdId, household.id)));
  await deleteBlobs([gone?.f]);
  refresh();
}

// ------------------------------------------------------------------ Utility bills

/** One bill per utility per month: saving the same month again replaces it. */
export async function saveBill(_: FormState, fd: FormData): Promise<FormState> {
  const { household } = await requireHousehold();
  const kind = str(fd, 'kind', 20);
  const period = monthStart(str(fd, 'period', 10));
  const cents = parseCurrencyToCents(str(fd, 'amount', 20));
  if (!isUtilityKind(kind)) return { error: 'Choose the utility.' };
  if (!period) return { error: 'Choose the month this bill is for.' };
  if (cents == null || cents < 0 || cents > 100_000_000) return { error: 'Enter the amount on the bill.' };
  const usageRaw = str(fd, 'usage', 12);
  const usage = usageRaw ? Math.round(Number(usageRaw.replace(/,/g, ''))) : null;
  if (usageRaw && (usage == null || !Number.isFinite(usage) || usage < 0)) return { error: 'Usage must be a number (e.g. kWh).' };
  const values = { householdId: household.id, kind, period, amountCents: cents, usage, note: optStr(fd, 'note', 200) };
  await db.insert(utilityBills).values(values).onConflictDoUpdate({ target: [utilityBills.householdId, utilityBills.kind, utilityBills.period], set: { amountCents: cents, usage, note: values.note } });
  refresh();
  return { ok: 'Bill saved.' };
}

export async function deleteBill(id: string) {
  const { household } = await requireHousehold();
  if (!UUID.test(id)) return;
  await db.delete(utilityBills).where(and(eq(utilityBills.id, id), eq(utilityBills.householdId, household.id)));
  refresh();
}
