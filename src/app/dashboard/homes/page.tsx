import { count, inArray } from 'drizzle-orm';
import { Building2, Check } from 'lucide-react';
import { db } from '@/db';
import { assets, householdMembers } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { listMemberships } from '@/lib/household';
import { deleteHome, switchHome } from '@/app/actions';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import AppleButton from '@/components/AppleButton';
import { HomeForm } from '@/components/forms';
import { ConfirmButton } from '@/components/misc';

export const metadata = { title: 'My homes' };

export default async function HomesPage() {
  const { user, household } = await requireHousehold();
  const mine = await listMemberships(user.id);
  const ids = mine.map((m) => m.household.id);
  const [assetCounts, memberCounts] = await Promise.all([
    db.select({ id: assets.householdId, n: count() }).from(assets).where(inArray(assets.householdId, ids)).groupBy(assets.householdId),
    db.select({ id: householdMembers.householdId, n: count() }).from(householdMembers).where(inArray(householdMembers.householdId, ids)).groupBy(householdMembers.householdId),
  ]);
  const a = new Map(assetCounts.map((r) => [r.id, r.n]));
  const m = new Map(memberCounts.map((r) => [r.id, r.n]));

  return (
    <>
      <PageHeader title="My homes" subtitle="Switch between properties, or add another" />
      <div className="grid items-start gap-x-8 gap-y-6 xl:grid-cols-2">
        <section>
          <GlassCard className="py-2">
            <ul className="divide-y hairline [&>li]:border-inherit">
              {mine.map(({ household: h, role }) => {
                const current = h.id === household.id;
                return (
                  <li key={h.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tint/10 text-tint"><Building2 className="h-5 w-5" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-semibold">{h.name}</p>
                      <p className="truncate text-[13px] capitalize text-secondary">{role} · {a.get(h.id) ?? 0} assets · {m.get(h.id) ?? 1} member{(m.get(h.id) ?? 1) === 1 ? '' : 's'}</p>
                    </div>
                    {current ? (
                      <span className="flex items-center gap-1 text-[15px] font-semibold text-ok"><Check className="h-4 w-4" aria-hidden /> Current</span>
                    ) : (
                      <form action={switchHome.bind(null, h.id)}><AppleButton type="submit" variant="secondary">Switch</AppleButton></form>
                    )}
                    {role === 'owner' && (
                      <form action={deleteHome.bind(null, h.id)}>
                        <ConfirmButton message={`Delete “${h.name}” and all its assets, tasks and invites for every member? This cannot be undone.`}>Delete</ConfirmButton>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        </section>
        <section>
          <h2 className="mb-2 px-1 text-[22px] font-bold">Add a home</h2>
          <GlassCard><HomeForm /></GlassCard>
        </section>
      </div>
    </>
  );
}
