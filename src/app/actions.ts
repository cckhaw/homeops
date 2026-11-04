'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, count, eq, gt, ne } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  householdInvites,
  householdMembers,
  households,
  loginTokens,
  maintenanceTasks,
  profiles,
  serviceRecords,
} from '@/db/schema';
import { hashToken, requireAdmin, requireHousehold, requireUser } from '@/lib/auth';
import { isMember, newToken } from '@/lib/household';
import { getLimits, setSetting } from '@/lib/settings';
import { uploadFile } from '@/lib/storage';
import {
  CATEGORIES,
  CATEGORY_TASKS,
  FREQUENCIES,
  addDays,
  addFrequency,
  parseCurrencyToCents,
  todayISO,
} from '@/lib/utils';

export type FormState = { error?: string; ok?: string } | undefined;

const str = (fd: FormData, k: string, max = 500): string => String(fd.get(k) ?? '').trim().slice(0, max);
const optStr = (fd: FormData, k: string, max = 500): string | null => str(fd, k, max) || null;
const isoDate = (fd: FormData, k: string): string | null => {
  const v = str(fd, k, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};
const fileOf = (fd: FormData, k: string): File | null => {
  const f = fd.get(k);
  return f instanceof File && f.size > 0 ? f : null;
};

// ------------------------------------------------------------------ Assets

export async function createAsset(_: FormState, fd: FormData): Promise<FormState> {
  const { household } = await requireHousehold();
  const name = str(fd, 'name', 120);
  const category = str(fd, 'category', 60);
  if (!name) return { error: 'Give the asset a name.' };
  if (!(CATEGORIES as readonly string[]).includes(category)) return { error: 'Choose a category.' };

  const limits = await getLimits();
  if (!limits.unlimited) {
    const [{ n }] = await db.select({ n: count() }).from(assets).where(eq(assets.householdId, household.id));
    if (n >= limits.assets) {
      return { error: `The free plan is limited to ${limits.assets} assets per home.` };
    }
  }

  const receipt = await uploadFile(fileOf(fd, 'receipt'), `receipts/${household.id}`);
  if (receipt.error) return { error: receipt.error };
  const manual = await uploadFile(fileOf(fd, 'manual'), `manuals/${household.id}`);
  if (manual.error) return { error: manual.error };

  const [asset] = await db
    .insert(assets)
    .values({
      householdId: household.id,
      name,
      category,
      makeModel: optStr(fd, 'makeModel', 120),
      serialNumber: optStr(fd, 'serialNumber', 120),
      installDate: isoDate(fd, 'installDate'),
      warrantyExpiry: isoDate(fd, 'warrantyExpiry'),
      notes: optStr(fd, 'notes', 2000),
      receiptUrl: receipt.url,
      manualUrl: manual.url,
    })
    .returning();

  const templates = CATEGORY_TASKS[category] ?? [];
  if (templates.length) {
    await db.insert(maintenanceTasks).values(
      templates.map((t) => ({
        householdId: household.id,
        assetId: asset.id,
        title: `${t.title} — ${name}`,
        frequency: t.frequency,
        dueDate: addDays(todayISO(), t.offsetDays),
      })),
    );
  }
  revalidatePath('/dashboard', 'layout');
  redirect(`/dashboard/assets/${asset.id}`);
}

export async function updateAsset(assetId: string, _: FormState, fd: FormData): Promise<FormState> {
  const { household } = await requireHousehold();
  const name = str(fd, 'name', 120);
  const category = str(fd, 'category', 60);
  if (!name) return { error: 'Give the asset a name.' };
  if (!(CATEGORIES as readonly string[]).includes(category)) return { error: 'Choose a category.' };

  const patch: Partial<typeof assets.$inferInsert> = {
    name,
    category,
    makeModel: optStr(fd, 'makeModel', 120),
    serialNumber: optStr(fd, 'serialNumber', 120),
    installDate: isoDate(fd, 'installDate'),
    warrantyExpiry: isoDate(fd, 'warrantyExpiry'),
    notes: optStr(fd, 'notes', 2000),
  };
  const receipt = await uploadFile(fileOf(fd, 'receipt'), `receipts/${household.id}`);
  if (receipt.error) return { error: receipt.error };
  if (receipt.url) patch.receiptUrl = receipt.url;
  const manual = await uploadFile(fileOf(fd, 'manual'), `manuals/${household.id}`);
  if (manual.error) return { error: manual.error };
  if (manual.url) patch.manualUrl = manual.url;

  await db.update(assets).set(patch).where(and(eq(assets.id, assetId), eq(assets.householdId, household.id)));
  revalidatePath('/dashboard', 'layout');
  return { ok: 'Saved.' };
}

export async function deleteAsset(assetId: string) {
  const { household } = await requireHousehold();
  await db.delete(assets).where(and(eq(assets.id, assetId), eq(assets.householdId, household.id)));
  revalidatePath('/dashboard', 'layout');
  redirect('/dashboard/assets');
}

export async function addServiceRecord(assetId: string, _: FormState, fd: FormData): Promise<FormState> {
  const { household } = await requireHousehold();
  const [asset] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.householdId, household.id)));
  if (!asset) return { error: 'Asset not found.' };
  const description = str(fd, 'description', 500);
  if (!description) return { error: 'Describe the service performed.' };
  await db.insert(serviceRecords).values({
    householdId: household.id,
    assetId,
    serviceDate: isoDate(fd, 'serviceDate') ?? todayISO(),
    description,
    provider: optStr(fd, 'provider', 120),
    costCents: parseCurrencyToCents(str(fd, 'cost', 20)),
  });
  revalidatePath(`/dashboard/assets/${assetId}`);
  return { ok: 'Service record added.' };
}

export async function deleteServiceRecord(recordId: string, assetId: string) {
  const { household } = await requireHousehold();
  await db
    .delete(serviceRecords)
    .where(and(eq(serviceRecords.id, recordId), eq(serviceRecords.householdId, household.id)));
  revalidatePath(`/dashboard/assets/${assetId}`);
}

// ------------------------------------------------------------------ Maintenance

/** Completes a task and schedules its next occurrence; un-completes if already done. */
export async function toggleTask(taskId: string) {
  const { household } = await requireHousehold();
  const [task] = await db
    .select()
    .from(maintenanceTasks)
    .where(and(eq(maintenanceTasks.id, taskId), eq(maintenanceTasks.householdId, household.id)));
  if (!task) return;

  if (task.status === 'completed') {
    await db
      .update(maintenanceTasks)
      .set({ status: 'pending', completedAt: null })
      .where(eq(maintenanceTasks.id, taskId));
  } else {
    await db
      .update(maintenanceTasks)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(maintenanceTasks.id, taskId));
    // Roll the schedule forward from the later of due date / today so it never lands in the past.
    const base = task.dueDate > todayISO() ? task.dueDate : todayISO();
    await db.insert(maintenanceTasks).values({
      householdId: household.id,
      assetId: task.assetId,
      title: task.title,
      frequency: task.frequency,
      dueDate: addFrequency(base, task.frequency),
    });
  }
  revalidatePath('/dashboard', 'layout');
}

export async function createTask(_: FormState, fd: FormData): Promise<FormState> {
  const { household } = await requireHousehold();
  const title = str(fd, 'title', 160);
  const frequency = str(fd, 'frequency', 20);
  const dueDate = isoDate(fd, 'dueDate');
  const assetId = optStr(fd, 'assetId', 40);
  if (!title) return { error: 'Give the task a title.' };
  if (!(FREQUENCIES as readonly string[]).includes(frequency)) return { error: 'Choose how often it repeats.' };
  if (!dueDate) return { error: 'Pick a due date.' };
  if (assetId) {
    const [a] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.householdId, household.id)));
    if (!a) return { error: 'Asset not found.' };
  }
  await db.insert(maintenanceTasks).values({ householdId: household.id, assetId, title, frequency, dueDate });
  revalidatePath('/dashboard', 'layout');
  return { ok: 'Task added.' };
}

export async function deleteTask(taskId: string) {
  const { household } = await requireHousehold();
  await db
    .delete(maintenanceTasks)
    .where(and(eq(maintenanceTasks.id, taskId), eq(maintenanceTasks.householdId, household.id)));
  revalidatePath('/dashboard', 'layout');
}

// ------------------------------------------------------------------ Household

const canManage = (role: string) => role === 'owner' || role === 'admin';

export async function createInvite() {
  const { user, household, role } = await requireHousehold();
  if (!canManage(role)) return;
  await db.insert(householdInvites).values({
    householdId: household.id,
    token: newToken(24),
    createdBy: user.id,
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
  });
  revalidatePath('/dashboard/household');
}

export async function revokeInvite(inviteId: string) {
  const { household, role } = await requireHousehold();
  if (!canManage(role)) return;
  await db
    .delete(householdInvites)
    .where(and(eq(householdInvites.id, inviteId), eq(householdInvites.householdId, household.id)));
  revalidatePath('/dashboard/household');
}

export async function acceptInvite(token: string): Promise<FormState> {
  const user = await requireUser();
  const [invite] = await db
    .select()
    .from(householdInvites)
    .where(and(eq(householdInvites.token, token), gt(householdInvites.expiresAt, new Date())));
  if (!invite) return { error: 'This invite link is invalid or has expired.' };

  if (!(await isMember(user.id, invite.householdId))) {
    const limits = await getLimits();
    if (!limits.unlimited) {
      const [{ n }] = await db
        .select({ n: count() })
        .from(householdMembers)
        .where(eq(householdMembers.householdId, invite.householdId));
      if (n >= limits.members) return { error: `This home has reached the ${limits.members}-member limit.` };
    }
    // Drop the auto-created personal home if it is still empty and only theirs.
    const mine = await db
      .select({ h: households })
      .from(householdMembers)
      .innerJoin(households, eq(households.id, householdMembers.householdId))
      .where(and(eq(householdMembers.userId, user.id), eq(households.ownerId, user.id)));
    for (const { h } of mine) {
      const [{ a }] = await db.select({ a: count() }).from(assets).where(eq(assets.householdId, h.id));
      const [{ m }] = await db
        .select({ m: count() })
        .from(householdMembers)
        .where(eq(householdMembers.householdId, h.id));
      if (a === 0 && m === 1) await db.delete(households).where(eq(households.id, h.id));
    }
    await db
      .insert(householdMembers)
      .values({ householdId: invite.householdId, userId: user.id, role: 'member' })
      .onConflictDoNothing();
  }
  revalidatePath('/dashboard', 'layout');
  redirect('/dashboard');
}

export async function removeMember(memberId: string) {
  const { user, household, role } = await requireHousehold();
  const [target] = await db
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.id, memberId), eq(householdMembers.householdId, household.id)));
  if (!target || target.role === 'owner') return;
  const self = target.userId === user.id;
  if (!self && !canManage(role)) return;
  await db.delete(householdMembers).where(eq(householdMembers.id, memberId));
  revalidatePath('/dashboard', 'layout');
  if (self) redirect('/dashboard');
}

export async function setMemberRole(memberId: string, newRole: 'admin' | 'member') {
  const { household, role } = await requireHousehold();
  if (role !== 'owner') return;
  await db
    .update(householdMembers)
    .set({ role: newRole })
    .where(
      and(
        eq(householdMembers.id, memberId),
        eq(householdMembers.householdId, household.id),
        ne(householdMembers.role, 'owner'),
      ),
    );
  revalidatePath('/dashboard/household');
}

// ------------------------------------------------------------------ Passport

export async function regeneratePassport() {
  const { household, role } = await requireHousehold();
  if (!canManage(role)) return;
  await db.update(households).set({ passportToken: newToken() }).where(eq(households.id, household.id));
  revalidatePath('/dashboard/passport');
}

export async function enablePassport() {
  const { household, role } = await requireHousehold();
  if (!canManage(role)) return;
  if (!household.passportToken) {
    await db.update(households).set({ passportToken: newToken() }).where(eq(households.id, household.id));
  }
  revalidatePath('/dashboard/passport');
}

export async function disablePassport() {
  const { household, role } = await requireHousehold();
  if (!canManage(role)) return;
  await db.update(households).set({ passportToken: null }).where(eq(households.id, household.id));
  revalidatePath('/dashboard/passport');
}

// ------------------------------------------------------------------ Settings

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  await db.update(profiles).set({ fullName: optStr(fd, 'fullName', 120) }).where(eq(profiles.id, user.id));
  revalidatePath('/dashboard', 'layout');
  return { ok: 'Profile updated.' };
}

export async function updateHousehold(_: FormState, fd: FormData): Promise<FormState> {
  const { household, role } = await requireHousehold();
  if (!canManage(role)) return { error: 'Only owners and admins can edit the home.' };
  const name = str(fd, 'name', 120);
  if (!name) return { error: 'The home needs a name.' };
  await db
    .update(households)
    .set({ name, address: optStr(fd, 'address', 240) })
    .where(eq(households.id, household.id));
  revalidatePath('/dashboard', 'layout');
  return { ok: 'Home updated.' };
}

// ------------------------------------------------------------------ Admin

export async function saveSiteSettings(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const clamp = (k: string, fallback: string) => {
    const n = Number.parseInt(str(fd, k, 6), 10);
    return String(Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : fallback);
  };
  await setSetting('unlimited_free_tier', fd.get('unlimited_free_tier') === 'on' ? 'true' : 'false');
  await setSetting('free_asset_limit', clamp('free_asset_limit', '10'));
  await setSetting('free_member_limit', clamp('free_member_limit', '3'));
  revalidatePath('/admin', 'layout');
  return { ok: 'Settings saved — live immediately.' };
}

export async function toggleUnlimitedTier(next: boolean) {
  await requireAdmin();
  await setSetting('unlimited_free_tier', next ? 'true' : 'false');
  revalidatePath('/admin', 'layout');
}

export async function setUserAdmin(userId: string, makeAdmin: boolean) {
  const me = await requireAdmin();
  if (me.id === userId) return; // cannot change your own role (prevents locking everyone out)
  await db.update(profiles).set({ isAdmin: makeAdmin }).where(eq(profiles.id, userId));
  revalidatePath('/admin/users');
}

// ------------------------------------------------------------------ Magic link

export async function requestMagicLink(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email', 200).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid e-mail address.' };
  const key = process.env.RESEND_API_KEY;
  if (!key && process.env.NODE_ENV === 'production') {
    return { error: 'E-mail sign-in is not set up yet (missing RESEND_API_KEY). Please contact the site owner.' };
  }

  const recent = await db
    .select({ id: loginTokens.id })
    .from(loginTokens)
    .where(and(eq(loginTokens.email, email), gt(loginTokens.createdAt, new Date(Date.now() - 3_600_000))));
  if (recent.length >= 5) return { error: 'Too many requests. Try again in an hour.' };

  const token = newToken(32);
  await db.insert(loginTokens).values({
    email,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 15 * 60_000),
  });
  const base =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
  const link = `${base}/login/verify?token=${encodeURIComponent(token)}`;

  if (!key) {
    // Local development only: no e-mail provider, so print the link instead.
    console.log(`\n[magic link] ${email}: ${link}\n`);
    return { ok: 'Dev mode: the sign-in link was printed to the server console.' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'HomeOps <onboarding@resend.dev>',
      to: email,
      subject: 'Your HomeOps sign-in link',
      html: `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:420px;margin:auto"><h2>Sign in to HomeOps</h2><p>Tap the button to sign in. This link works once and expires in 15 minutes.</p><p><a href="${link}" style="display:inline-block;background:#0071e3;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:600">Sign in</a></p><p style="color:#86868b;font-size:12px">If you didn't request this, you can ignore this e-mail.</p></div>`,
    }),
  });
  if (!res.ok) return { error: 'We could not send the e-mail. Please try again.' };
  return { ok: 'Check your inbox for a sign-in link.' };
}
