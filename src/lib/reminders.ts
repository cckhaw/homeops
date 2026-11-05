import 'server-only';
import { and, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import { assetReminders, assets, households, householdMembers, maintenanceTasks, profiles, taskReminders } from '@/db/schema';
import { emailLayout, escapeHtml, sendEmail } from '@/lib/email';
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
  const users = await db
    .select()
    .from(profiles)
    .where(opts.onlyUserId ? eq(profiles.id, opts.onlyUserId) : eq(profiles.notifyReminders, true));
  let emails = 0;
  let totalItems = 0;
  let totalTasks = 0;
  let totalWarranties = 0;
  const base = siteBaseUrl('http://localhost:3000');
  const today = todayISO();

  for (const user of users) {
    if (!opts.onlyUserId && !user.notifyReminders) continue;
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
    if (!freshTasks.length && !warrantyPicks.length) continue;

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
    const section = (title: string, rows: string) => (rows ? `<h3 style="margin:18px 0 4px;font-size:16px">${title}</h3><ul style="padding-left:18px;margin:0">${rows}</ul>` : '');
    const count = freshTasks.length + warrantyPicks.length;
    const first = user.fullName ? ' ' + escapeHtml(user.fullName.split(' ')[0]) : '';
    const html = emailLayout(
      `${count} thing${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} your attention`,
      `<p>Hi${first}, here is what is coming up:</p>${section('Maintenance', taskRows)}${section('Warranties ending soon', warrantyRows)}
       <p style="color:#86868b;font-size:13px;margin-top:20px">You get these because reminders are on in Settings. <a href="${base}/dashboard/settings">Change or turn off</a>.</p>`,
      { label: warrantyPicks.length && !freshTasks.length ? 'Review my assets' : 'Open schedule', url: `${base}${warrantyPicks.length && !freshTasks.length ? '/dashboard/assets' : '/dashboard/schedule'}` },
    );
    const subjectParts = [freshTasks.length && `${freshTasks.length} task${freshTasks.length === 1 ? '' : 's'}`, warrantyPicks.length && `${warrantyPicks.length} warrant${warrantyPicks.length === 1 ? 'y' : 'ies'} ending`].filter(Boolean);
    if (!(await sendEmail(user.email, `HomeOps: ${subjectParts.join(' and ')}`, html))) continue;

    emails++;
    totalItems += count;
    totalTasks += freshTasks.length;
    totalWarranties += warrantyPicks.length;
    if (!opts.force) {
      if (freshTasks.length) {
        await db.insert(taskReminders).values(freshTasks.map((t) => ({ userId: user.id, taskId: t.id }))).onConflictDoUpdate({ target: [taskReminders.userId, taskReminders.taskId], set: { sentAt: new Date() } });
      }
      const marks = warrantyPicks.flatMap((p) => p.marks.map((kind) => ({ userId: user.id, assetId: p.asset.id, kind })));
      if (marks.length) await db.insert(assetReminders).values(marks).onConflictDoNothing();
    }
  }
  return { users: users.length, emails, tasks: totalTasks, warranties: totalWarranties, items: totalItems };
}
