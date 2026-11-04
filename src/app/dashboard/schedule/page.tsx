import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, maintenanceTasks } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { daysUntil, formatMonth } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import MaintenanceRow from '@/components/MaintenanceRow';
import PageHeader from '@/components/PageHeader';
import { TaskForm } from '@/components/forms';

export const metadata = { title: 'Schedule' };

export default async function SchedulePage() {
  const { household } = await requireHousehold();
  const [tasks, homeAssets] = await Promise.all([
    db.select().from(maintenanceTasks).where(eq(maintenanceTasks.householdId, household.id)).orderBy(asc(maintenanceTasks.dueDate)),
    db.select({ id: assets.id, name: assets.name }).from(assets).where(eq(assets.householdId, household.id)).orderBy(asc(assets.name)),
  ]);
  const names = new Map(homeAssets.map((a) => [a.id, a.name]));
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
    <MaintenanceRow key={t.id} id={t.id} title={t.title} dueDate={t.dueDate} frequency={t.frequency} completed={t.status === 'completed'} completedAt={t.completedAt?.toISOString()} assetName={t.assetId ? names.get(t.assetId) : null} assetId={t.assetId} assets={homeAssets} />
  );
  const list = (items: typeof tasks) => <ul className="divide-y hairline [&>li]:border-inherit">{items.map(row)}</ul>;

  return (
    <>
      <PageHeader title="Schedule" subtitle="Preventive maintenance checklist" />

      {overdue.length > 0 && (
        <section className="mb-6" aria-labelledby="overdue">
          <h2 id="overdue" className="mb-2 px-1 text-[22px] font-bold text-bad">Overdue</h2>
          <GlassCard className="py-2">{list(overdue)}</GlassCard>
        </section>
      )}

      <div className="grid items-start gap-x-8 xl:grid-cols-2">
      {[...byMonth.entries()].map(([month, items]) => (
        <section key={month} className="mb-6">
          <h2 className="mb-2 px-1 text-[22px] font-bold">{formatMonth(`${month}-01`)}</h2>
          <GlassCard className="py-2">{list(items)}</GlassCard>
        </section>
      ))}
      </div>
      {pending.length === 0 && <GlassCard className="mb-6 py-8 text-center text-secondary">All caught up. 🎉</GlassCard>}

      <section className="mb-6">
        <h2 className="mb-2 px-1 text-[22px] font-bold">Add a task</h2>
        <GlassCard><TaskForm assets={homeAssets} /></GlassCard>
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
