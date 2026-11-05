import { asc, desc, eq, gt, and } from 'drizzle-orm';
import { Crown, Link2, Trash2 } from 'lucide-react';
import { db } from '@/db';
import { householdInvites, householdMembers, profiles } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { getPrefs } from '@/lib/prefs';
import { createInvite, removeMember, revokeInvite, setMemberRole } from '@/app/actions';
import { getLimits } from '@/lib/settings';
import { formatDate } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import AppleButton, { SubmitButton } from '@/components/AppleButton';
import { CopyButton } from '@/components/misc';

export const metadata = { title: 'Household' };

export default async function HouseholdPage() {
  const { user, household, role } = await requireHousehold();
  const { locale } = await getPrefs();
  const canManage = role === 'owner' || role === 'admin';
  const [members, invites, limits] = await Promise.all([
    db
      .select({ id: householdMembers.id, userId: householdMembers.userId, role: householdMembers.role, name: profiles.fullName, email: profiles.email })
      .from(householdMembers)
      .innerJoin(profiles, eq(profiles.id, householdMembers.userId))
      .where(eq(householdMembers.householdId, household.id))
      .orderBy(asc(householdMembers.createdAt)),
    canManage
      ? db
          .select()
          .from(householdInvites)
          .where(and(eq(householdInvites.householdId, household.id), gt(householdInvites.expiresAt, new Date())))
          .orderBy(desc(householdInvites.createdAt))
      : Promise.resolve([]),
    getLimits(),
  ]);

  return (
    <>
      <PageHeader title="Household" subtitle={`${household.name} · ${members.length} member${members.length === 1 ? '' : 's'}`} />

      <div className="grid items-start gap-x-8 xl:grid-cols-2">
      <section className="mb-8">
        <h2 className="mb-2 px-1 text-[22px] font-bold">Members</h2>
        <GlassCard className="py-2">
          <ul className="divide-y hairline [&>li]:border-inherit">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tint/10 text-[17px] font-semibold text-tint" aria-hidden>
                  {(m.name ?? m.email)[0].toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[17px] font-medium">
                    {m.name ?? m.email}
                    {m.userId === user.id && <span className="text-[13px] font-normal text-secondary">(you)</span>}
                    {m.role === 'owner' && <Crown className="h-4 w-4 shrink-0 text-warn" aria-label="Owner" />}
                  </p>
                  <p className="truncate text-[13px] capitalize text-secondary">{m.role}{m.name ? ` · ${m.email}` : ''}</p>
                </div>
                {role === 'owner' && m.role !== 'owner' && (
                  <form action={setMemberRole.bind(null, m.id, m.role === 'admin' ? 'member' : 'admin')}>
                    <AppleButton type="submit" variant="plain" className="px-3 text-[15px]">{m.role === 'admin' ? 'Make member' : 'Make admin'}</AppleButton>
                  </form>
                )}
                {m.role !== 'owner' && (canManage || m.userId === user.id) && (
                  <form action={removeMember.bind(null, m.id)}>
                    <button aria-label={m.userId === user.id ? 'Leave household' : `Remove ${m.name ?? m.email}`} className="grid h-11 w-11 place-items-center rounded-xl text-secondary hover:text-bad">
                      <Trash2 className="h-[18px] w-[18px]" aria-hidden />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </GlassCard>
        {!limits.unlimited && <p className="mt-2 px-1 text-[13px] text-secondary">Free plan: up to {limits.members} members per home.</p>}
      </section>

      {canManage && (
        <section>
          <h2 className="mb-2 px-1 text-[22px] font-bold">Invite someone</h2>
          <GlassCard className="space-y-4">
            <p className="text-[15px] text-secondary">Create a private link and send it to your partner or co-owner. Links expire after 7 days; anyone with the link can join, so only share it with people you trust.</p>
            <form action={createInvite}>
              <SubmitButton><Link2 className="h-4 w-4" aria-hidden /> Create invite link</SubmitButton>
            </form>
            {invites.length > 0 && (
              <ul className="divide-y hairline [&>li]:border-inherit">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-2 py-3">
                    <p className="min-w-0 flex-1 text-[15px]">Expires {formatDate(i.expiresAt, undefined, locale)}</p>
                    <CopyButton path={`/join/${i.token}`} />
                    <form action={revokeInvite.bind(null, i.id)}>
                      <AppleButton type="submit" variant="destructive">Revoke</AppleButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </section>
      )}
      </div>
    </>
  );
}
