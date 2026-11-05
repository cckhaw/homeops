import 'server-only';
import { and, eq, gte, inArray, isNotNull, lte, or } from 'drizzle-orm';
import { db } from '@/db';
import { assetReminders, assets, documentReminders, documents, households, householdMembers, maintenanceTasks, profiles, pushSubscriptions, taskReminders } from '@/db/schema';
import { emailConfigured, emailLayout, escapeHtml, sendEmail } from '@/lib/email';
import { digestOneLine, pushPayload, whenExpiry, whenTask, type DigestItem } from '@/lib/digest-core';
import { pushConfigured, sendPushToUser } from '@/lib/push';
import { sendWhatsappTemplate, whatsappConfigured } from '@/lib/whatsapp';
import { siteBaseUrl } from '@/lib/donate';
import { DEFAULT_LOCALE, isSupportedLocale } from '@/lib/locale';
import { pickWarranties, shouldRemindTask, type WarrantyCandidate } from '@/lib/reminder-rules';
import { addDays, daysUntil, formatDate, todayISO } from '@/lib/utils';

/**
 * Sends one digest e-mail per opted-in user: maintenance tasks coming due (or overdue) and warranties about to
 * expire, across all their homes. Each task / warranty notice is mailed once (overdue tasks weekly).
 * `force` ignores the sent-log (used by "Send me a test").
 */
export async function sendReminderDigests(opts: { onlyUserId?: string; force?: boolean } = {}) {
  // Anyone with at least one channel on: e-mail, WhatsApp (verified), or a device registered for push.
  const pushUsers = pushConfigured() ? [...new Set((await db.select({ id: pushSubscriptions.userId }).from(pushSubscriptions)).map((r) => r.id))] : [];
  const users = await db
    .select()
    .from(profiles)
    .where(
      opts.onlyUserId
        ? eq(profiles.id, opts.onlyUserId)
        : or(eq(profiles.notifyReminders, true), and(eq(profiles.notifyWhatsapp, true), isNotNull(profiles.whatsappVerifiedAt)), pushUsers.length ? inArray(profiles.id, pushUsers) : undefined),
    );
  let emails = 0;
  let pushes = 0;
  let whatsapps = 0;
  let totalItems = 0;
  let totalTasks = 0;
  let totalWarranties = 0;
  let totalDocs = 0;
  const base = siteBaseUrl('http://localhost:3000');
  const today = todayISO();

  for (const user of users) {
    const locale = isSupportedLocale(user.locale) ? user.locale : DEFAULT_LOCALE;
    const homes = await db
      .select({ id: households.id, name: households.name })
      .from(householdMembers)
      .innerJoin(households, eq(households.id, householdMembers.householdId))
      .where(eq(householdMembers.userId, user.id));
    if (!homes.length) continue;
    const homeIds = homes.map((h) => h.id);
    const homeName = new Map(homes.map((h) => [h.id, h.name]));
    const multi = homes.length > 1;
    const where = (id: string) => (multi ? ` <span style="color:#86868b">(${escapeHtml(homeName.get(id) ?? '')})</span>` : '');

    // ---- maintenance tasks
    const tasks = await db
      .select()
      .from(maintenanceTasks)
      .where(and(inArray(maintenanceTasks.householdId, homeIds), eq(maintenanceTasks.status, 'pending'), lte(maintenanceTasks.dueDate, addDays(today, user.reminderLeadDays))));
    const sentTasks = new Map((await db.select().from(taskReminders).where(eq(taskReminders.userId, user.id))).map((s) => [s.taskId, s.sentAt.getTime()]));
    const freshTasks = tasks
      .filter((t) => !t.assignedTo || t.assignedTo === user.id) // a task assigned to someone else is theirs to be reminded about
      .filter((t) => shouldRemindTask(daysUntil(t.dueDate) ?? 0, sentTasks.get(t.id), Date.now(), opts.force))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // ---- warranties
    let warrantyPicks: ReturnType<typeof pickWarranties> = [];
    if (user.warrantyLeadDays > 0) {
      const expiring = await db
        .select({ id: assets.id, name: assets.name, householdId: assets.householdId, warrantyExpiry: assets.warrantyExpiry })
        .from(assets)
        .where(and(inArray(assets.householdId, homeIds), isNotNull(assets.warrantyExpiry), gte(assets.warrantyExpiry, today), lte(assets.warrantyExpiry, addDays(today, user.warrantyLeadDays))));
      const sentW = new Set((await db.select().from(assetReminders).where(eq(assetReminders.userId, user.id))).map((r) => `${r.assetId}:${r.kind}`));
      const candidates: (WarrantyCandidate & { householdId: string })[] = expiring.map((a) => ({
        id: a.id, name: a.name, householdId: a.householdId, warrantyExpiry: a.warrantyExpiry!, daysLeft: daysUntil(a.warrantyExpiry) ?? 0,
      }));
      warrantyPicks = pickWarranties(candidates, user.warrantyLeadDays, sentW, opts.force);
    }

    // ---- vault documents (insurance, permits…) that are about to expire — same lead time as warranties
    let docPicks: ReturnType<typeof pickWarranties> = [];
    if (user.warrantyLeadDays > 0) {
      const expiringDocs = await db
        .select({ id: documents.id, title: documents.title, householdId: documents.householdId, expiresOn: documents.expiresOn })
        .from(documents)
        .where(and(inArray(documents.householdId, homeIds), isNotNull(documents.expiresOn), gte(documents.expiresOn, today), lte(documents.expiresOn, addDays(today, user.warrantyLeadDays))));
      const sentD = new Set((await db.select().from(documentReminders).where(eq(documentReminders.userId, user.id))).map((r) => `${r.documentId}:${r.kind}`));
      const cands: (WarrantyCandidate & { householdId: string })[] = expiringDocs.map((d) => ({ id: d.id, name: d.title, householdId: d.householdId, warrantyExpiry: d.expiresOn!, daysLeft: daysUntil(d.expiresOn) ?? 0 }));
      docPicks = pickWarranties(cands, user.warrantyLeadDays, sentD, opts.force);
    }
    if (!freshTasks.length && !warrantyPicks.length && !docPicks.length) continue;

    // ---- compose
    const taskRows = freshTasks
      .map((t) => {
        const d = daysUntil(t.dueDate) ?? 0;
        const when = d < 0 ? `<b style="color:#d70015">${-d} day${d === -1 ? '' : 's'} overdue</b>` : d === 0 ? '<b>due today</b>' : `due ${escapeHtml(formatDate(t.dueDate, undefined, locale))}`;
        return `<li style="margin:6px 0">${escapeHtml(t.title)} — ${when}${where(t.householdId)}</li>`;
      })
      .join('');
    const warrantyRows = warrantyPicks
      .map(({ asset, kind }) => {
        const c = asset as WarrantyCandidate & { householdId: string };
        const when = c.daysLeft === 0 ? '<b style="color:#d70015">expires today</b>' : `${kind === 'final' ? '<b style="color:#c96800">' : ''}expires ${escapeHtml(formatDate(c.warrantyExpiry, undefined, locale))} (${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'})${kind === 'final' ? '</b>' : ''}`;
        return `<li style="margin:6px 0">${escapeHtml(c.name)} — warranty ${when}${where(c.householdId)}</li>`;
      })
      .join('');
    const docRows = docPicks
      .map(({ asset, kind }) => {
        const c = asset as WarrantyCandidate & { householdId: string };
        const when = c.daysLeft === 0 ? '<b style="color:#d70015">expires today</b>' : `${kind === 'final' ? '<b style="color:#c96800">' : ''}expires ${escapeHtml(formatDate(c.warrantyExpiry, undefined, locale))} (${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'})${kind === 'final' ? '</b>' : ''}`;
        return `<li style="margin:6px 0">${escapeHtml(c.name)} — ${when}${where(c.householdId)}</li>`;
      })
      .join('');
    const section = (title: string, rows: string) => (rows ? `<h3 style="margin:18px 0 4px;font-size:16px">${title}</h3><ul style="padding-left:18px;margin:0">${rows}</ul>` : '');
    const count = freshTasks.length + warrantyPicks.length + docPicks.length;
    const first = user.fullName ? ' ' + escapeHtml(user.fullName.split(' ')[0]) : '';
    const html = emailLayout(
      `${count} thing${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} your attention`,
      `<p>Hi${first}, here is what is coming up:</p>${section('Maintenance', taskRows)}${section('Warranties ending soon', warrantyRows)}${section('Documents expiring', docRows)}
       <p style="color:#86868b;font-size:13px;margin-top:20px">You get these because reminders are on in Settings. <a href="${base}/dashboard/settings">Change or turn off</a>.</p>`,
      freshTasks.length || warrantyPicks.length
        ? { label: warrantyPicks.length && !freshTasks.length ? 'Review my assets' : 'Open schedule', url: `${base}${warrantyPicks.length && !freshTasks.length ? '/dashboard/assets' : '/dashboard/schedule'}` }
        : { label: 'Open document vault', url: `${base}/dashboard/documents` },
    );
    const subjectParts = [freshTasks.length && `${freshTasks.length} task${freshTasks.length === 1 ? '' : 's'}`, warrantyPicks.length && `${warrantyPicks.length} warrant${warrantyPicks.length === 1 ? 'y' : 'ies'} ending`, docPicks.length && `${docPicks.length} document${docPicks.length === 1 ? '' : 's'} expiring`].filter(Boolean);
    // ---- deliver on every channel the user turned on; the sent-log is only updated if at least one succeeded
    const items: DigestItem[] = [
      ...freshTasks.map((t) => ({ kind: 'task' as const, title: t.title, when: whenTask(daysUntil(t.dueDate) ?? 0), home: homeName.get(t.householdId) })),
      ...warrantyPicks.map(({ asset }) => ({ kind: 'warranty' as const, title: asset.name, when: whenExpiry(asset.daysLeft), home: homeName.get((asset as WarrantyCandidate & { householdId: string }).householdId) })),
      ...docPicks.map(({ asset }) => ({ kind: 'document' as const, title: asset.name, when: whenExpiry(asset.daysLeft), home: homeName.get((asset as WarrantyCandidate & { householdId: string }).householdId) })),
    ];
    const emailOn = emailConfigured() && (user.notifyReminders || !!opts.force);
    const sentEmail = emailOn ? await sendEmail(user.email, `HomeOps: ${subjectParts.join(' and ')}`, html) : false;
    const waOn = whatsappConfigured() && !!user.whatsappNumber && !!user.whatsappVerifiedAt && user.notifyWhatsapp;
    const sentWa = waOn ? await sendWhatsappTemplate(user.whatsappNumber!, 'reminder', digestOneLine(items)) : false;
    const pushed = pushConfigured() ? (await sendPushToUser(user.id, pushPayload(items, base))).sent : 0;
    if (!sentEmail && !sentWa && !pushed) continue;
    if (sentWa) whatsapps++;
    if (pushed) pushes++;
    if (sentEmail) emails++;
    totalItems += count;
    totalTasks += freshTasks.length;
    totalWarranties += warrantyPicks.length;
    totalDocs += docPicks.length;
    if (!opts.force) {
      if (freshTasks.length) {
        await db.insert(taskReminders).values(freshTasks.map((t) => ({ userId: user.id, taskId: t.id }))).onConflictDoUpdate({ target: [taskReminders.userId, taskReminders.taskId], set: { sentAt: new Date() } });
      }
      const marks = warrantyPicks.flatMap((p) => p.marks.map((kind) => ({ userId: user.id, assetId: p.asset.id, kind })));
      if (marks.length) await db.insert(assetReminders).values(marks).onConflictDoNothing();
      const docMarks = docPicks.flatMap((p) => p.marks.map((kind) => ({ userId: user.id, documentId: p.asset.id, kind })));
      if (docMarks.length) await db.insert(documentReminders).values(docMarks).onConflictDoNothing();
    }
  }
  return { users: users.length, emails, push: pushes, whatsapp: whatsapps, tasks: totalTasks, warranties: totalWarranties, documents: totalDocs, items: totalItems };
}
