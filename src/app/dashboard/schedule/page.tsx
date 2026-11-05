import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, maintenanceTasks } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { getPrefs } from '@/lib/prefs';
import { daysUntil, formatMonth } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import MaintenanceRow from '@/components/MaintenanceRow';
import PageHeader from '@/components/PageHeader';
import { TaskForm } from '@/components/forms';
import { listMembers } from '@/lib/household';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Schedule' };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const { user, household } = await requireHousehold();
  const mineOnly = (await searchParams).who === 'me';
  const { locale } = await getPrefs();
  const [allTasks, homeAssets, members] = await Promise.all([
    db.select().from(maintenanceTasks).where(eq(maintenanceTasks.householdId, household.id)).orderBy(asc(maintenanceTasks.dueDate)),
    db.select({ id: assets.id, name: assets.name }).from(assets).where(eq(assets.householdId, household.id)).orderBy(asc(assets.name)),
    listMembers(household.id),
  ]);
  // "Mine" = assigned to me, plus anything nobody has claimed yet.
  const tasks = mineOnly ? allTasks.filter((t) => !t.assignedTo || t.assignedTo === user.id) : allTasks;
  const names = new Map(homeAssets.map((a) => [a.id, a.name]));
  const people = new Map(members.map((m) => [m.id, m.name]));
  const pending = tasks.filter((t) => t.status === 'pending');
  const overdue = pending.filter((t) => (daysUntil(t.dueDate) ?? 0) < 0);
  const upcoming = pending.filter((t) => (daysUntil(t.dueDate) ?? 0) >= 0);
  const completed = tasks
    .filter((t) => t.status === 'completed')
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, 15);

  const byMonth = new Map<string, typeof upcoming>();
  for (const t of upcoming) {
    const key = t.dueDate.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), t]);
  }

  const row = (t: (typeof tasks)[number]) => (
    <MaintenanceRow key={t.id} id={t.id} title={t.title} dueDate={t.dueDate} frequency={t.frequency} completed={t.status === 'completed'} completedAt={t.completedAt?.toISOString()} assetName={t.assetId ? names.get(t.assetId) : null} assetId={t.assetId} assignedTo={t.assignedTo} assigneeName={t.assignedTo ? people.get(t.assignedTo) : null} completedByName={t.completedBy ? people.get(t.completedBy) : null} members={members} assets={homeAssets} />
  );
  const list = (items: typeof tasks) => <ul className="divide-y hairline [&>li]:border-inherit">{items.map(row)}</ul>;

  return (
    <>
      <PageHeader title="Schedule" subtitle="Preventive maintenance checklist" />

      {members.length > 1 && (
        <div role="group" aria-label="Whose tasks" className="mb-5 inline-grid grid-cols-2 gap-1 rounded-xl bg-label/5 p-1">
          {[['Everyone', '/dashboard/schedule', !mineOnly], ['Mine', '/dashboard/schedule?who=me', mineOnly]].map(([label, href, on]) => (
            <Link key={String(label)} href={String(href)} aria-current={on ? 'true' : undefined} className={cn('flex min-h-[40px] items-center justify-center rounded-lg px-6 text-[15px] font-semibold transition', on ? 'bg-surface shadow-sm' : 'text-secondary')}>
              {String(label)}
            </Link>
          ))}
        </div>
      )}

      {overdue.length > 0 && (
        <section className="mb-6" aria-labelledby="overdue">
          <h2 id="overdue" className="mb-2 px-1 text-[22px] font-bold text-bad">Overdue</h2>
          <GlassCard className="py-2">{list(overdue)}</GlassCard>
        </section>
      )}

      <div className="grid items-start gap-x-8 xl:grid-cols-2">
      {[...byMonth.entries()].map(([month, items]) => (
        <section key={month} className="mb-6">
          <h2 className="mb-2 px-1 text-[22px] font-bold">{formatMonth(`${month}-01`, locale)}</h2>
          <GlassCard className="py-2">{list(items)}</GlassCard>
        </section>
      ))}
      </div>
      {pending.length === 0 && <GlassCard className="mb-6 py-8 text-center text-secondary">All caught up. 🎉</GlassCard>}

      <section className="mb-6">
        <h2 className="mb-2 px-1 text-[22px] font-bold">Add a task</h2>
        <GlassCard><TaskForm assets={homeAssets} members={members} /></GlassCard>
      </section>

      {completed.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 px-1 text-[22px] font-bold">Recently completed</h2>
          <GlassCard className="py-2">{list(completed)}</GlassCard>
        </section>
      )}
    </>
  );
}
