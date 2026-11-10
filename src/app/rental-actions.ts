'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { conditionItems, conditionReports, maintenanceTasks, rentPayments, tenancies } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { deleteBlobs } from '@/lib/blob';
import { uploadFile } from '@/lib/storage';
import { DEFAULT_CHECKLIST, duePeriods, arrears, isCondition, isReportKind, nextRentDue, oldestUnpaid, renewalReminderDate, validateTenancy } from '@/lib/rental-core';
import { addDays, parseCurrencyToCents, todayISO } from '@/lib/utils';

type FormState = { error?: string; ok?: string } | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? '').trim().slice(0, max);
const optStr = (fd: FormData, k: string, max = 500) => str(fd, k, max) || null;
const iso = (fd: FormData, k: string) => { const v = str(fd, k, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; };
const refresh = () => revalidatePath('/dashboard', 'layout');

/** Rentals hold tenants' personal details, so only a home's owner or admins may use them. */
async function landlord() {
  const ctx = await requireHousehold();
  if (ctx.role !== 'owner' && ctx.role !== 'admin') return { error: 'Only a home owner or admin can manage rentals.' as const };
  return ctx;
}

function readTenancy(fd: FormData) {
  const input = {
    tenantName: str(fd, 'tenantName', 120), startDate: iso(fd, 'startDate') ?? '', endDate: iso(fd, 'endDate'),
    rentCents: parseCurrencyToCents(str(fd, 'rent', 20)), dueDay: Number.parseInt(str(fd, 'dueDay', 3), 10), depositCents: parseCurrencyToCents(str(fd, 'deposit', 20)),
  };
  const phone = optStr(fd, 'tenantPhone', 40);
  const email = optStr(fd, 'tenantEmail', 200);
  const error = validateTenancy(input) ?? (phone && !/^[+\d][\d\s().-]{5,}$/.test(phone) ? 'Enter the phone number using digits (and + for the country code).' : null) ?? (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? 'That e-mail address does not look right.' : null);
  return { input, phone, email, notes: optStr(fd, 'notes', 1000), error };
}

/** (Re)creates the reminders for a tenancy: rent every month on the due day, and a renewal nudge ahead of the lease end. */
async function syncTasks(householdId: string, t: { id: string; tenantName: string; startDate: string; endDate: string | null; dueDay: number }) {
  await db.delete(maintenanceTasks).where(and(eq(maintenanceTasks.tenancyId, t.id), eq(maintenanceTasks.status, 'pending')));
  const today = todayISO();
  const first = nextRentDue(t.dueDay, t.startDate > today ? t.startDate : today);
  const rows: { householdId: string; tenancyId: string; title: string; frequency: string; dueDate: string }[] = [];
  if (!t.endDate || first <= t.endDate) rows.push({ householdId, tenancyId: t.id, title: `Collect rent: ${t.tenantName}`, frequency: 'monthly', dueDate: first });
  if (t.endDate && t.endDate > today) rows.push({ householdId, tenancyId: t.id, title: `Lease ends ${t.endDate}: ${t.tenantName}. Renew or plan the move-out`, frequency: 'yearly', dueDate: renewalReminderDate(t.endDate, today) });
  if (rows.length) await db.insert(maintenanceTasks).values(rows);
}

export async function addTenancy(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await landlord();
  if ('error' in ctx) return ctx;
  const r = readTenancy(fd);
  if (r.error) return { error: r.error };
  const [row] = await db.insert(tenancies).values({ householdId: ctx.household.id, tenantName: r.input.tenantName, tenantPhone: r.phone, tenantEmail: r.email, startDate: r.input.startDate, endDate: r.input.endDate, rentCents: r.input.rentCents!, dueDay: r.input.dueDay, depositCents: r.input.depositCents, notes: r.notes }).returning();
  await syncTasks(ctx.household.id, row);
  refresh();
  return { ok: 'Tenancy saved. Rent reminders are on your schedule.' };
}

export async function updateTenancy(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const ctx = await landlord();
  if ('error' in ctx) return ctx;
  if (!UUID.test(id)) return { error: 'Not found.' };
  const r = readTenancy(fd);
  if (r.error) return { error: r.error };
  const [row] = await db.update(tenancies).set({ tenantName: r.input.tenantName, tenantPhone: r.phone, tenantEmail: r.email, startDate: r.input.startDate, endDate: r.input.endDate, rentCents: r.input.rentCents!, dueDay: r.input.dueDay, depositCents: r.input.depositCents, notes: r.notes })
    .where(and(eq(tenancies.id, id), eq(tenancies.householdId, ctx.household.id), eq(tenancies.status, 'active'))).returning();
  if (!row) return { error: 'Not found.' };
  await syncTasks(ctx.household.id, row);
  refresh();
  return { ok: 'Saved. Reminders updated.' };
}

/** Ends the tenancy today: reminders stop, history stays. */
export async function endTenancy(id: string): Promise<FormState> {
  const ctx = await landlord();
  if ('error' in ctx) return ctx;
  if (!UUID.test(id)) return { error: 'Not found.' };
  const [row] = await db.update(tenancies).set({ status: 'ended', endedOn: todayISO() }).where(and(eq(tenancies.id, id), eq(tenancies.householdId, ctx.household.id))).returning({ id: tenancies.id });
  if (!row) return { error: 'Not found.' };
  await db.delete(maintenanceTasks).where(and(eq(maintenanceTasks.tenancyId, id), eq(maintenanceTasks.status, 'pending')));
  refresh();
  return { ok: 'Tenancy ended. You can now create a move-out report.' };
}

export async function deleteTenancy(id: string) {
  const ctx = await landlord();
  if ('error' in ctx || !UUID.test(id)) return;
  await db.delete(tenancies).where(and(eq(tenancies.id, id), eq(tenancies.householdId, ctx.household.id)));
  refresh();
}

/** Records the oldest unpaid month as received today, and moves the rent reminder on to the next due date. */
export async function markRentReceived(id: string): Promise<FormState> {
  const ctx = await landlord();
  if ('error' in ctx) return ctx;
  if (!UUID.test(id)) return { error: 'Not found.' };
  const [t] = await db.select().from(tenancies).where(and(eq(tenancies.id, id), eq(tenancies.householdId, ctx.household.id), eq(tenancies.status, 'active')));
  if (!t) return { error: 'Not found.' };
  const paid = await db.select({ period: rentPayments.period, amountCents: rentPayments.amountCents }).from(rentPayments).where(eq(rentPayments.tenancyId, id));
  const owed = arrears(duePeriods(t.startDate, t.endDate, t.dueDay, todayISO()), paid, t.rentCents);
  const period = oldestUnpaid(owed);
  if (!period) return { ok: 'Nothing is outstanding. Rent is up to date.' };
  await db.insert(rentPayments).values({ tenancyId: id, period, amountCents: t.rentCents, paidOn: todayISO() }).onConflictDoNothing();
  // settle the reminder for that month (the next one is created for the following due date)
  const [task] = await db.select().from(maintenanceTasks).where(and(eq(maintenanceTasks.tenancyId, id), eq(maintenanceTasks.status, 'pending'), eq(maintenanceTasks.frequency, 'monthly'))).orderBy(asc(maintenanceTasks.dueDate)).limit(1);
  if (task && task.dueDate.slice(0, 7) <= period) {
    await db.update(maintenanceTasks).set({ status: 'completed', completedAt: new Date(), completedBy: ctx.user.id }).where(eq(maintenanceTasks.id, task.id));
    const next = nextRentDue(t.dueDay, addDays(task.dueDate, 1));
    if (!t.endDate || next <= t.endDate) await db.insert(maintenanceTasks).values({ householdId: ctx.household.id, tenancyId: id, title: task.title, frequency: 'monthly', dueDate: next });
  }
  refresh();
  return { ok: `Rent for ${period} marked as received.` };
}

// ------------------------------------------------------------------ condition reports

export async function createReport(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await landlord();
  if ('error' in ctx) return ctx;
  const kind = str(fd, 'kind', 20);
  if (!isReportKind(kind)) return { error: 'Choose the type of report.' };
  const tenancyId = optStr(fd, 'tenancyId', 40);
  let moveIn: { room: string; item: string; condition: string; sort: number }[] = [];
  if (tenancyId) {
    const [t] = UUID.test(tenancyId) ? await db.select({ id: tenancies.id }).from(tenancies).where(and(eq(tenancies.id, tenancyId), eq(tenancies.householdId, ctx.household.id))) : [];
    if (!t) return { error: 'That tenancy was not found.' };
    if (kind === 'move_out') {
      const [mi] = await db.select({ id: conditionReports.id }).from(conditionReports).where(and(eq(conditionReports.tenancyId, tenancyId), eq(conditionReports.kind, 'move_in'))).limit(1);
      if (mi) moveIn = await db.select({ room: conditionItems.room, item: conditionItems.item, condition: conditionItems.condition, sort: conditionItems.sort }).from(conditionItems).where(eq(conditionItems.reportId, mi.id)).orderBy(asc(conditionItems.sort));
    }
  }
  const [rep] = await db.insert(conditionReports).values({ householdId: ctx.household.id, tenancyId, kind, inspectedOn: iso(fd, 'inspectedOn') ?? todayISO(), createdBy: ctx.user.id }).returning({ id: conditionReports.id });
  // a move-out report starts from the move-in report (same rooms and items, same ratings) so only the changes need editing
  const seed = moveIn.length ? moveIn : DEFAULT_CHECKLIST.flatMap((r) => r.items.map((item) => ({ room: r.room, item, condition: 'good', sort: 0 })));
  await db.insert(conditionItems).values(seed.map((s, i) => ({ reportId: rep.id, room: s.room, item: s.item, condition: s.condition, sort: i })));
  refresh();
  redirect(`/dashboard/rentals/reports/${rep.id}`);
}

/** Saves the whole report page: date, notes, each item's rating / notes / photo, removals and one optional new item. */
export async function saveReport(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const ctx = await landlord();
  if ('error' in ctx) return ctx;
  if (!UUID.test(id)) return { error: 'Not found.' };
  const [rep] = await db.select().from(conditionReports).where(and(eq(conditionReports.id, id), eq(conditionReports.householdId, ctx.household.id)));
  if (!rep) return { error: 'Not found.' };
  const items = await db.select().from(conditionItems).where(eq(conditionItems.reportId, id));
  const oldPhotos: (string | null)[] = [];
  for (const it of items) {
    if (fd.get(`del_${it.id}`) === 'on') { oldPhotos.push(it.photoUrl); await db.delete(conditionItems).where(eq(conditionItems.id, it.id)); continue; }
    const cond = str(fd, `cond_${it.id}`, 12);
    const file = fd.get(`photo_${it.id}`);
    let photoUrl = it.photoUrl;
    if (file instanceof File && file.size > 0) {
      const up = await uploadFile(file, `condition/${ctx.household.id}`);
      if (up.error) return { error: `${it.item}: ${up.error}` };
      photoUrl = up.url;
      oldPhotos.push(it.photoUrl);
    } else if (fd.get(`rmphoto_${it.id}`) === 'on' && it.photoUrl) { oldPhotos.push(it.photoUrl); photoUrl = null; }
    await db.update(conditionItems).set({ condition: isCondition(cond) ? cond : it.condition, notes: optStr(fd, `notes_${it.id}`, 500), photoUrl }).where(eq(conditionItems.id, it.id));
  }
  const newRoom = str(fd, 'newRoom', 60), newItem = str(fd, 'newItem', 80);
  if (newRoom && newItem) await db.insert(conditionItems).values({ reportId: id, room: newRoom, item: newItem, condition: isCondition(str(fd, 'newCondition', 12)) ? str(fd, 'newCondition', 12) : 'good', notes: optStr(fd, 'newNotes', 500), sort: items.length + 1 });
  await db.update(conditionReports).set({ inspectedOn: iso(fd, 'inspectedOn') ?? rep.inspectedOn, notes: optStr(fd, 'reportNotes', 2000) }).where(eq(conditionReports.id, id));
  await deleteBlobs(oldPhotos);
  refresh();
  return { ok: 'Report saved.' };
}

export async function deleteReport(id: string) {
  const ctx = await landlord();
  if ('error' in ctx || !UUID.test(id)) return;
  const photos = await db.select({ u: conditionItems.photoUrl }).from(conditionItems).innerJoin(conditionReports, eq(conditionReports.id, conditionItems.reportId)).where(and(eq(conditionReports.id, id), eq(conditionReports.householdId, ctx.household.id)));
  await db.delete(conditionReports).where(and(eq(conditionReports.id, id), eq(conditionReports.householdId, ctx.household.id)));
  await deleteBlobs(photos.map((p) => p.u));
  refresh();
  redirect('/dashboard/rentals');
}

