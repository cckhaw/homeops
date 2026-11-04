import { desc, count, eq } from 'drizzle-orm';
import { db } from '@/db';
import { householdMembers, profiles } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { setUserAdmin } from '@/app/actions';
import { formatDate } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import AppleButton from '@/components/AppleButton';

export const metadata = { title: 'Users · Admin' };

export default async function AdminUsers() {
  const me = await requireAdmin();
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      name: profiles.fullName,
      isAdmin: profiles.isAdmin,
      createdAt: profiles.createdAt,
      homes: count(householdMembers.id),
    })
    .from(profiles)
    .leftJoin(householdMembers, eq(householdMembers.userId, profiles.id))
    .groupBy(profiles.id)
    .orderBy(desc(profiles.createdAt))
    .limit(500);

  return (
    <>
      <PageHeader title="Users" subtitle={`${rows.length} most recent`} />
      <GlassCard className="py-2">
        <ul className="divide-y hairline [&>li]:border-inherit">
          {rows.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-medium">{u.name ?? u.email}{u.isAdmin && <span className="ml-2 rounded-full bg-tint/10 px-2 py-0.5 text-[11px] font-semibold text-tint">ADMIN</span>}</p>
                <p className="truncate text-[13px] text-secondary">{u.name ? `${u.email} · ` : ''}Joined {formatDate(u.createdAt)} · {u.homes} home{u.homes === 1 ? '' : 's'}</p>
              </div>
              {u.id !== me.id && (
                <form action={setUserAdmin.bind(null, u.id, !u.isAdmin)}>
                  <AppleButton type="submit" variant={u.isAdmin ? 'destructive' : 'secondary'}>{u.isAdmin ? 'Remove admin' : 'Make admin'}</AppleButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </GlassCard>
    </>
  );
}
