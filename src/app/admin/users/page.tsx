import Link from 'next/link';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { ChevronRight, Search } from 'lucide-react';
import { db } from '@/db';
import { householdMembers, profiles } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Users · Admin' };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; deleted?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 80);
  // Escape LIKE wildcards so a search for "50%" is literal.
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      name: profiles.fullName,
      isAdmin: profiles.isAdmin,
      suspendedAt: profiles.suspendedAt,
      createdAt: profiles.createdAt,
      lastLoginAt: profiles.lastLoginAt,
      homes: count(householdMembers.id),
    })
    .from(profiles)
    .leftJoin(householdMembers, eq(householdMembers.userId, profiles.id))
    .where(q ? and(eq(profiles.isDemo, false), or(ilike(profiles.email, like), ilike(profiles.fullName, like))) : eq(profiles.isDemo, false))
    .groupBy(profiles.id)
    .orderBy(desc(profiles.createdAt))
    .limit(200);

  return (
    <>
      {sp.deleted && <p role="status" className="mb-4 rounded-xl bg-ok/10 px-4 py-3 text-[15px] font-medium text-ok">Deleted {sp.deleted.slice(0, 120)}.</p>}
      <PageHeader title="Users" subtitle={q ? `${rows.length} match${rows.length === 1 ? '' : 'es'} for “${q}”` : `${rows.length} most recent`} />
      <form className="relative mb-4" role="search">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" aria-hidden />
        <input name="q" defaultValue={q} placeholder="Search by e-mail or name" aria-label="Search users" className="input pl-10" />
      </form>
      <GlassCard className="py-2">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-secondary">No users found.</p>
        ) : (
          <ul className="divide-y hairline [&>li]:border-inherit">
            {rows.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex min-h-[56px] items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-medium">
                      {u.name ?? u.email}
                      {u.isAdmin && <span className="ml-2 rounded-full bg-tint/10 px-2 py-0.5 text-[11px] font-semibold text-tint">ADMIN</span>}
                      {u.suspendedAt && <span className="ml-2 rounded-full bg-bad/10 px-2 py-0.5 text-[11px] font-semibold text-bad">SUSPENDED</span>}
                    </p>
                    <p className="truncate text-[13px] text-secondary">
                      {u.name ? `${u.email} · ` : ''}Joined {formatDate(u.createdAt)} · {u.lastLoginAt ? `last sign-in ${formatDate(u.lastLoginAt)}` : 'never signed in'} · {u.homes} home{u.homes === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-secondary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </>
  );
}
