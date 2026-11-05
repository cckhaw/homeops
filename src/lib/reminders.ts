import 'server-only';
import { and, eq, inArray, lte } from 'drizzle-orm';
import { db } from '@/db';
import { households, householdMembers, maintenanceTasks, profiles, taskReminders } from '@/db/schema';
import { emailLayout, escapeHtml, sendEmail } from '@/lib/email';
import { siteBaseUrl } from '@/lib/donate';
import { addDays, daysUntil, formatDate, todayISO } from '@/lib/utils';

const REPEAT_OVERDUE_MS = 7 * 86_400_000;

/**
 * Sends one digest e-mail per opted-in user listing pending tasks that are due within their lead time (or overdue)
 * across all their homes. Each task is mailed once, then again weekly while it stays overdue.
 * `force` ignores the sent-log (used by "Send me a test").
 */
export async function sendReminderDigests(opts: { onlyUserId?: string; force?: boolean } = {}) {
  const users = await db
    .select()
    .from(profiles)
    .where(opts.onlyUserId ? eq(profiles.id, opts.onlyUserId) : eq(profiles.notifyReminders, true));
  let emails = 0;
  let totalTasks = 0;
  const base = siteBaseUrl('http://localhost:3000');

  for (const user of users) {
    if (!opts.onlyUserId && !user.notifyReminders) continue;
    const homes = await db
      .select({ id: households.id, name: households.name })
      .from(householdMembers)
      .innerJoin(households, eq(households.id, householdMembers.householdId))
      .where(eq(householdMembers.userId, user.id));
    if (!homes.length) continue;

    const cutoff = addDays(todayISO(), user.reminderLeadDays);
    const tasks = await db
      .select()
      .from(maintenanceTasks)
      .where(and(inArray(maintenanceTasks.householdId, homes.map((h) => h.id)), eq(maintenanceTasks.status, 'pending'), lte(maintenanceTasks.dueDate, cutoff)));
    if (!tasks.length) continue;

    const sent = await db.select().from(taskReminders).where(eq(taskReminders.userId, user.id));
    const sentAt = new Map(sent.map((s) => [s.taskId, s.sentAt.getTime()]));
    const fresh = tasks.filter((t) => {
      if (opts.force) return true;
      const prev = sentAt.get(t.id);
      if (prev === undefined) return true;
      return (daysUntil(t.dueDate) ?? 0) < 0 && Date.now() - prev >= REPEAT_OVERDUE_MS;
    });
    if (!fresh.length) continue;

    fresh.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const homeName = new Map(homes.map((h) => [h.id, h.name]));
    const multi = homes.length > 1;
    const rows = fresh
      .map((t) => {
        const d = daysUntil(t.dueDate) ?? 0;
        const when = d < 0 ? `<b style="color:#d70015">${-d} day${d === -1 ? '' : 's'} overdue</b>` : d === 0 ? '<b>due today</b>' : `due ${escapeHtml(formatDate(t.dueDate))}`;
        return `<li style="margin:6px 0">${escapeHtml(t.title)} — ${when}${multi ? ` <span style="color:#86868b">(${escapeHtml(homeName.get(t.householdId) ?? '')})</span>` : ''}</li>`;
      })
      .join('');
    const html = emailLayout(
      `${fresh.length} maintenance task${fresh.length === 1 ? '' : 's'} coming up`,
      `<p>Hi${user.fullName ? ' ' + escapeHtml(user.fullName.split(' ')[0]) : ''}, here is what needs attention:</p><ul style="padding-left:18px">${rows}</ul>
       <p style="color:#86868b;font-size:13px">You get these because reminders are on in Settings. <a href="${base}/dashboard/settings">Change or turn off</a>.</p>`,
      { label: 'Open schedule', url: `${base}/dashboard/schedule` },
    );
    const ok = await sendEmail(user.email, `HomeOps: ${fresh.length} task${fresh.length === 1 ? '' : 's'} due soon`, html);
    if (!ok) continue;
    emails++;
    totalTasks += fresh.length;
    if (!opts.force) {
      await db
        .insert(taskReminders)
        .values(fresh.map((t) => ({ userId: user.id, taskId: t.id })))
        .onConflictDoUpdate({ target: [taskReminders.userId, taskReminders.taskId], set: { sentAt: new Date() } });
    }
  }
  return { users: users.length, emails, tasks: totalTasks };
}
