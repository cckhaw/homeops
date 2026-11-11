import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import { and, count, eq, lt } from 'drizzle-orm';
import { db } from '@/db';
import { conditionItems, conditionReports, contractorHomes, contractors, documents, householdMembers, households, maintenanceTasks, profiles, rentPayments, serviceRecords, tenancies, utilityBills, assets } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { safeEqual } from '@/lib/security';
import { demoDataset, demoEmailFor, propertyTasks, tenancyRows, periodForMonthsBack } from '@/lib/demo-core';
import { DEFAULT_CHECKLIST } from '@/lib/rental-core';
import { addDays, templateDueDate, templatesFor, todayISO } from '@/lib/utils';

/** The demo: an admin-chosen e-mail and password open a private, throw-away copy of a fully populated Wodejia account. */
export type DemoConfig = { enabled: boolean; email: string; password: string; showHint: boolean; hours: number };

export async function getDemoConfig(): Promise<DemoConfig> {
  const s = await getSettings();
  const hours = Math.max(1, Math.min(168, Number.parseInt(s.demo_hours, 10) || 24));
  return { enabled: s.demo_enabled === 'true' && !!s.demo_email && s.demo_password.length >= 8, email: s.demo_email.trim().toLowerCase(), password: s.demo_password, showHint: s.demo_show_hint !== 'false', hours };
}

/** What the sign-in page and homepage may show: the credentials only when the admin turned the hint on. */
export async function getDemoPublic(): Promise<{ email: string; password: string } | null> {
  try {
    const c = await getDemoConfig();
    return c.enabled && c.showHint ? { email: c.email, password: c.password } : null;
  } catch {
    return null;
  }
}

export const MAX_ACTIVE_SANDBOXES = 150;

export const activeSandboxes = async () => Number((await db.select({ n: count() }).from(profiles).where(and(eq(profiles.isDemo, true), eq(profiles.fullName, DEMO_OWNER_NAME)))).at(0)?.n ?? 0);
const DEMO_OWNER_NAME = 'Alex Tan (Demo)';

/** True when `email`/`password` are the configured demo credentials. Constant-time on the password. */
export async function isDemoLogin(email: string, password: string): Promise<boolean> {
  const c = await getDemoConfig();
  if (!c.enabled || email !== c.email) return false;
  return safeEqual(password.padEnd(128).slice(0, 128), c.password.padEnd(128).slice(0, 128)) && password.length === c.password.length;
}

/** Signed-in user is a demo visitor? Used to switch off anything that costs money, sends messages or changes the account itself. */
export async function demoGuard(what = 'This'): Promise<{ error: string } | null> {
  const u = await getCurrentUser().catch(() => null);
  return u?.isDemo ? { error: `${what} is switched off in the demo. Create your free account to use it.` } : null;
}

const chunks = <T,>(xs: T[], n = 400) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
async function insertAll<T extends Record<string, unknown>>(table: Parameters<typeof db.insert>[0], rows: T[]) {
  for (const part of chunks(rows)) if (part.length) await db.insert(table).values(part as never);
}

/**
 * Creates a fresh demo account (owner, four team members and twelve populated homes) that expires after `hours`.
 * Every date is relative to today so the data always looks current. Returns the owner to sign in as.
 */
export async function createDemoSandbox(hours: number) {
  const today = todayISO();
  const now = new Date();
  const expires = new Date(now.getTime() + hours * 3_600_000);
  const data = demoDataset();
  const ownerId = randomUUID();
  const person = new Map(data.people.map((p) => [p.key, randomUUID()]));

  await db.insert(profiles).values([
    { id: ownerId, email: demoEmailFor(ownerId), fullName: DEMO_OWNER_NAME, emailVerifiedAt: now, isDemo: true, demoExpiresAt: expires, locale: 'en-SG', calendarToken: randomBytes(18).toString('base64url') },
    ...data.people.map((p) => ({ id: person.get(p.key)!, email: demoEmailFor(person.get(p.key)!), fullName: p.name, emailVerifiedAt: now, isDemo: true, demoExpiresAt: expires })),
  ]);

  const home = new Map<string, string>();
  const homeRows = data.homes.map((h) => { const id = randomUUID(); home.set(h.key, id); return { id, name: h.name, address: h.address, ownerId, currency: h.currency, climate: h.climate, icon: h.icon, passportToken: h.passport ? randomBytes(18).toString('base64url') : null }; });
  await insertAll(households, homeRows);
  // the first home is the one most recently joined, so it is the one shown first
  await insertAll(householdMembers, data.homes.flatMap((h, i) => [
    { householdId: home.get(h.key)!, userId: ownerId, role: 'owner', createdAt: new Date(now.getTime() - (data.homes.length - i) * -1000 - 60_000) },
    ...h.members.map((m) => ({ householdId: home.get(h.key)!, userId: person.get(m.person)!, role: m.role, createdAt: new Date(now.getTime() - 120_000) })),
  ]));

  const con = new Map<string, string>();
  await insertAll(contractors, data.contractors.map((c) => { const id = randomUUID(); con.set(c.key, id); return { id, name: c.name, trade: c.trade, phone: c.phone, email: c.email, notes: c.notes }; }));
  await insertAll(contractorHomes, data.contractors.flatMap((c) => c.homes.map((k) => ({ contractorId: con.get(c.key)!, householdId: home.get(k)! }))));

  const asset = new Map<string, string>(); // "home|asset" → id
  const assetRows: (typeof assets.$inferInsert)[] = [];
  for (const h of data.homes) for (const x of h.assets) {
    const id = randomUUID(); asset.set(`${h.key}|${x.key}`, id);
    assetRows.push({ id, householdId: home.get(h.key)!, name: x.name, category: x.category, make: x.make, model: x.model, serialNumber: x.serial, installDate: addDays(today, -x.installedDaysAgo), warrantyExpiry: x.warrantyDays === null ? null : addDays(today, x.warrantyDays), purchaseCents: x.priceCents, notes: x.notes ?? null });
  }
  await insertAll(assets, assetRows);

  const taskRows: (typeof maintenanceTasks.$inferInsert)[] = [];
  for (const h of data.homes) {
    const hid = home.get(h.key)!;
    for (const t of templatesFor(h.climate)) taskRows.push({ householdId: hid, title: t.title, frequency: t.frequency, dueDate: templateDueDate(t) }); // the climate-aware starter schedule
    for (const t of h.tasks) taskRows.push({ householdId: hid, title: t.title, frequency: t.frequency, dueDate: addDays(today, t.dueInDays), assetId: t.asset ? asset.get(`${h.key}|${t.asset}`) ?? null : null, assignedTo: t.who ? person.get(t.who) ?? null : null, ...(t.doneDaysAgo ? { status: 'completed', completedAt: new Date(now.getTime() - t.doneDaysAgo * 86_400_000), completedBy: ownerId } : {}) });
    for (const p of propertyTasks(h, today)) taskRows.push({ householdId: hid, title: p.title, frequency: p.frequency, dueDate: p.dueDate });
  }

  const tenancyIds = new Map<string, string>();
  const tenancyRowsOut: (typeof tenancies.$inferInsert)[] = [], paymentRows: (typeof rentPayments.$inferInsert)[] = [];
  for (const h of data.homes) for (const t of h.tenancies ?? []) {
    const r = tenancyRows(t, today); const id = randomUUID(); tenancyIds.set(`${h.key}|${t.key}`, id); const hid = home.get(h.key)!;
    tenancyRowsOut.push({ id, householdId: hid, tenantName: t.tenant, tenantPhone: t.phone, tenantEmail: t.email, startDate: r.startDate, endDate: r.endDate, rentCents: t.rentCents, dueDay: t.dueDay, depositCents: t.depositCents, notes: t.notes ?? null, status: r.status, endedOn: r.endedOn });
    for (const period of r.paid) paymentRows.push({ tenancyId: id, period, amountCents: t.rentCents, paidOn: `${period}-${String(Math.min(t.dueDay + 1, 28)).padStart(2, '0')}` });
    if (r.status === 'active') {
      taskRows.push({ householdId: hid, tenancyId: id, title: `Collect rent: ${t.tenant}`, frequency: 'monthly', dueDate: r.nextDue });
      if (r.renewalDue) taskRows.push({ householdId: hid, tenancyId: id, title: `Lease ends ${r.endDate}: ${t.tenant}. Renew or plan the move-out`, frequency: 'yearly', dueDate: r.renewalDue });
    }
  }
  await insertAll(tenancies, tenancyRowsOut);
  await insertAll(rentPayments, paymentRows);
  await insertAll(maintenanceTasks, taskRows);

  await insertAll(serviceRecords, data.homes.flatMap((h) => h.services.map((s) => ({ householdId: home.get(h.key)!, assetId: asset.get(`${h.key}|${s.asset}`)!, serviceDate: addDays(today, -s.daysAgo), description: s.what, provider: s.provider ?? (s.contractor ? data.contractors.find((c) => c.key === s.contractor)!.name : null), contractorId: s.contractor ? con.get(s.contractor)! : null, costCents: s.costCents ?? null }))));
  await insertAll(documents, data.homes.flatMap((h) => h.docs.map((d) => ({ householdId: home.get(h.key)!, title: d.title, category: d.category, fileUrl: null, expiresOn: d.expiresInDays === null ? null : addDays(today, d.expiresInDays), notes: d.notes ?? null, createdBy: ownerId }))));
  await insertAll(utilityBills, data.homes.flatMap((h) => h.bills.map((b) => ({ householdId: home.get(h.key)!, kind: b.kind, period: periodForMonthsBack(today, b.monthsBack), amountCents: b.amountCents, usage: b.usage ?? null, note: b.note ?? null }))));

  // condition reports
  const reportRows: (typeof conditionReports.$inferInsert)[] = [], itemRows: (typeof conditionItems.$inferInsert)[] = [];
  for (const h of data.homes) for (const r of h.reports ?? []) {
    const id = randomUUID();
    reportRows.push({ id, householdId: home.get(h.key)!, tenancyId: tenancyIds.get(`${h.key}|${r.tenancy}`) ?? null, kind: r.kind, inspectedOn: addDays(today, -r.daysAgo), notes: r.notes, createdBy: ownerId });
    let sort = 0;
    for (const room of DEFAULT_CHECKLIST) for (const item of room.items) { const k = `${room.room}|${item}`; itemRows.push({ reportId: id, room: room.room, item, condition: r.ratings[k] ?? 'good', notes: r.itemNotes[k] ?? null, sort: sort++ }); }
  }
  await insertAll(conditionReports, reportRows);
  await insertAll(conditionItems, itemRows);

  return { id: ownerId, email: demoEmailFor(ownerId), name: DEMO_OWNER_NAME };
}

/** Deletes demo accounts (and with them their homes and data) whose time is up. Called by the daily job and from Admin. */
export async function purgeExpiredDemos(all = false): Promise<number> {
  const gone = await db.delete(profiles).where(and(eq(profiles.isDemo, true), all ? undefined : lt(profiles.demoExpiresAt, new Date()))).returning({ id: profiles.id });
  return gone.length;
}


