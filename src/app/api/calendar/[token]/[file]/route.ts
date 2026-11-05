import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { assets, households, householdMembers, maintenanceTasks, profiles } from '@/db/schema';
import { buildCalendar, type IcsEvent } from '@/lib/ics';
import { FREQUENCY_LABEL, todayISO } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Personal calendar feed (webcal / .ics). The secret token in the URL is the credential, so calendar apps can
 * subscribe without cookies. It lists the user's pending tasks (assigned to them or unclaimed) and warranty end dates.
 */
export async function GET(_: Request, { params }: { params: Promise<{ token: string; file: string }> }) {
  const { token, file } = await params;
  if (file !== 'homeops.ics' || token.length < 20 || token.length > 80) return new Response('Not found', { status: 404 });
  const [user] = await db.select().from(profiles).where(eq(profiles.calendarToken, token));
  if (!user || user.suspendedAt) return new Response('Not found', { status: 404 });

  const homes = await db
    .select({ id: households.id, name: households.name })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, user.id));
  const ids = homes.map((h) => h.id);
  const homeName = new Map(homes.map((h) => [h.id, h.name]));
  const multi = homes.length > 1;
  const events: IcsEvent[] = [];

  if (ids.length) {
    const tasks = await db.select().from(maintenanceTasks).where(and(inArray(maintenanceTasks.householdId, ids), eq(maintenanceTasks.status, 'pending')));
    const assetRows = await db.select({ id: assets.id, name: assets.name, householdId: assets.householdId, warrantyExpiry: assets.warrantyExpiry }).from(assets).where(inArray(assets.householdId, ids));
    const assetName = new Map(assetRows.map((a) => [a.id, a.name]));
    for (const t of tasks) {
      if (t.assignedTo && t.assignedTo !== user.id) continue;
      const home = homeName.get(t.householdId) ?? '';
      events.push({
        uid: `task-${t.id}`,
        date: t.dueDate,
        summary: multi ? `${t.title} (${home})` : t.title,
        description: [`Home: ${home}`, t.assetId && assetName.get(t.assetId) ? `Asset: ${assetName.get(t.assetId)}` : null, FREQUENCY_LABEL[t.frequency] ? `Repeats: ${FREQUENCY_LABEL[t.frequency].toLowerCase()}` : null].filter(Boolean).join('\n'),
        alarm: true,
      });
    }
    for (const a of assetRows) {
      if (!a.warrantyExpiry || a.warrantyExpiry < todayISO()) continue;
      events.push({ uid: `warranty-${a.id}`, date: a.warrantyExpiry, summary: `Warranty ends: ${a.name}${multi ? ` (${homeName.get(a.householdId)})` : ''}`, alarm: true });
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  return new Response(buildCalendar('HomeOps maintenance', events), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="homeops.ics"',
      'Cache-Control': 'private, max-age=900',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
