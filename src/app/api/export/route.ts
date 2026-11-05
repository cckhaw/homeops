import { NextResponse } from 'next/server';
import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { assets, householdMembers, maintenanceTasks, profiles, pushSubscriptions, serviceRecords } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { listMemberships } from '@/lib/household';
import { siteBaseUrl } from '@/lib/donate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** CSV cells starting with = + - @ are prefixed so spreadsheets don't execute them as formulas. */
const cell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Download everything the signed-in user can see: their profile preferences and every home they belong to
 * (assets, service history, maintenance tasks). `?format=csv` returns the asset ledger as a spreadsheet.
 * Other members' e-mail addresses are never included. Secrets (password hash, 2FA secret) are never included.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const memberships = await listMemberships(user.id);
  const pushDevices = await db.select({ label: pushSubscriptions.label, createdAt: pushSubscriptions.createdAt }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id));
  const ids = memberships.map((m) => m.household.id);
  const [homeAssets, tasks, records, memberCounts] = ids.length
    ? await Promise.all([
        db.select().from(assets).where(inArray(assets.householdId, ids)).orderBy(asc(assets.name)),
        db.select().from(maintenanceTasks).where(inArray(maintenanceTasks.householdId, ids)).orderBy(asc(maintenanceTasks.dueDate)),
        db.select().from(serviceRecords).where(inArray(serviceRecords.householdId, ids)).orderBy(asc(serviceRecords.serviceDate)),
        db.select({ householdId: householdMembers.householdId }).from(householdMembers).where(inArray(householdMembers.householdId, ids)),
      ])
    : [[], [], [], []];

  const base = siteBaseUrl(new URL(req.url).origin);
  const dl = (id: string, kind: 'receipt' | 'manual' | 'photo', has: string | null) => (has ? `${base}/api/files/${id}/${kind}` : null);
  // Members of the user's homes, by id → display name (assignments are exported as names, never as account ids or e-mails).
  const memberRows = ids.length
    ? await db.select({ id: profiles.id, fullName: profiles.fullName, email: profiles.email }).from(householdMembers).innerJoin(profiles, eq(profiles.id, householdMembers.userId)).where(inArray(householdMembers.householdId, ids))
    : [];
  const people = new Map(memberRows.map((m) => [m.id, m.fullName?.trim() || m.email.split('@')[0]]));
  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { 'Cache-Control': 'private, no-store' };
  const homeName = new Map(memberships.map((m) => [m.household.id, m.household.name]));

  if (new URL(req.url).searchParams.get('format') === 'csv') {
    const cols = ['home', 'name', 'category', 'make', 'model', 'serial_number', 'install_date', 'warranty_expiry', 'notes', 'receipt_download', 'manual_download'];
    const lines = [cols.join(',')].concat(
      homeAssets.map((a) =>
        [homeName.get(a.householdId), a.name, a.category, a.make ?? a.makeModel, a.model, a.serialNumber, a.installDate, a.warrantyExpiry, a.notes, dl(a.id, 'receipt', a.receiptUrl), dl(a.id, 'manual', a.manualUrl)].map(cell).join(','),
      ),
    );
    return new NextResponse('﻿' + lines.join('\r\n') + '\r\n', {
      headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="homeops-assets-${stamp}.csv"` },
    });
  }

  const body = {
    exportedAt: new Date().toISOString(),
    account: {
      email: user.email,
      name: user.fullName,
      createdAt: user.createdAt,
      twoFactorEnabled: user.totpEnabled,
      reminderEmails: { enabled: user.notifyReminders, leadDays: user.reminderLeadDays },
      whatsappReminders: { enabled: user.notifyWhatsapp, number: user.whatsappVerifiedAt ? user.whatsappNumber : null },
      pushDevices: pushDevices.map((d) => ({ label: d.label, addedAt: d.createdAt })),
    },
    homes: memberships.map(({ household: h, role }) => ({
      id: h.id,
      name: h.name,
      address: h.address,
      yourRole: role,
      createdAt: h.createdAt,
      memberCount: memberCounts.filter((m) => m.householdId === h.id).length,
      assets: homeAssets
        .filter((a) => a.householdId === h.id)
        .map(({ householdId: _h, receiptUrl, manualUrl, photoUrl, ...a }) => ({ ...a, receiptDownload: dl(a.id, 'receipt', receiptUrl), manualDownload: dl(a.id, 'manual', manualUrl), photoDownload: dl(a.id, 'photo', photoUrl) })),
      serviceRecords: records.filter((r) => r.householdId === h.id).map(({ householdId: _h, ...r }) => r),
      maintenanceTasks: tasks
        .filter((t) => t.householdId === h.id)
        .map(({ householdId: _h, assignedTo, completedBy, ...t }) => ({ ...t, assignedTo: assignedTo ? people.get(assignedTo) ?? null : null, completedBy: completedBy ? people.get(completedBy) ?? null : null })),
    })),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="homeops-export-${stamp}.json"` },
  });
}
