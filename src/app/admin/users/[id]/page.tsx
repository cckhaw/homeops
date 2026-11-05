import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { count, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { assets, householdMembers, households, profiles } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { emailConfigured } from '@/lib/email';
import { formatDate } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import UserAdminActions from '@/components/UserAdminActions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'User · Admin' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const when = (d: Date | null) => (d ? `${formatDate(d, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : '—');

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [u] = await db.select().from(profiles).where(eq(profiles.id, id));
  if (!u) notFound();

  const homes = await db
    .select({ id: households.id, name: households.name, role: householdMembers.role, climate: households.climate })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, id));
  const ids = homes.map((h) => h.id);
  const [assetCounts, memberCounts] = ids.length
    ? await Promise.all([
        db.select({ id: assets.householdId, n: count() }).from(assets).where(inArray(assets.householdId, ids)).groupBy(assets.householdId),
        db.select({ id: householdMembers.householdId, n: count() }).from(householdMembers).where(inArray(householdMembers.householdId, ids)).groupBy(householdMembers.householdId),
      ])
    : [[], []];
  const a = new Map(assetCounts.map((r) => [r.id, r.n]));
  const m = new Map(memberCounts.map((r) => [r.id, r.n]));
  const locked = !!u.lockedUntil && u.lockedUntil > new Date();

  const facts: [string, React.ReactNode][] = [
    ['E-mail', u.email],
    ['Name', u.fullName ?? '—'],
    ['E-mail verified', u.emailVerifiedAt ? when(u.emailVerifiedAt) : 'Not verified'],
    ['Created', when(u.createdAt)],
    ['Last sign-in', when(u.lastLoginAt)],
    ['Password set', u.passwordHash ? 'Yes' : 'No (Google or not yet chosen)'],
    ['Two-factor', u.totpEnabled ? 'On' : 'Off'],
    ['Failed attempts', locked ? `Locked until ${when(u.lockedUntil)}` : String(u.failedAttempts)],
    ['Reminder e-mails', u.notifyReminders ? `On (${u.reminderLeadDays}d tasks, ${u.warrantyLeadDays || 'no'}${u.warrantyLeadDays ? 'd' : ''} warranties)` : 'Off'],
    ['Status', u.suspendedAt ? `Suspended ${when(u.suspendedAt)}` : 'Active'],
  ];

  return (
    <>
      <Link href="/admin/users" className="mb-3 -ml-2 flex min-h-[44px] w-fit items-center gap-1 px-2 text-[17px] text-tint">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Users
      </Link>
      <h1 className="large-title">{u.fullName ?? u.email}</h1>
      <p className="mb-6 flex flex-wrap items-center gap-2 text-[15px] text-secondary">
        {u.email}
        {u.isAdmin && <span className="rounded-full bg-tint/10 px-2 py-0.5 text-[11px] font-semibold text-tint">ADMIN</span>}
        {u.suspendedAt && <span className="rounded-full bg-bad/10 px-2 py-0.5 text-[11px] font-semibold text-bad">SUSPENDED</span>}
      </p>

      <div className="grid items-start gap-x-8 gap-y-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-2 px-1 text-[22px] font-bold">Account</h2>
          <GlassCard className="py-2">
            <dl className="divide-y hairline [&>div]:border-inherit">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-2.5 text-[15px]">
                  <dt className="shrink-0 text-secondary">{k}</dt>
                  <dd className="min-w-0 break-words text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </GlassCard>
          <h2 className="mb-2 mt-6 px-1 text-[22px] font-bold">Homes</h2>
          <GlassCard className="py-2">
            {homes.length === 0 ? (
              <p className="py-3 text-secondary">Not a member of any home.</p>
            ) : (
              <ul className="divide-y hairline [&>li]:border-inherit">
                {homes.map((h) => (
                  <li key={h.id} className="py-2.5">
                    <p className="text-[17px] font-semibold">{h.name}</p>
                    <p className="text-[13px] capitalize text-secondary">{h.role} · {a.get(h.id) ?? 0} assets · {m.get(h.id) ?? 1} member{(m.get(h.id) ?? 1) === 1 ? '' : 's'} · {h.climate}</p>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </section>
        <section>
          <h2 className="mb-2 px-1 text-[22px] font-bold">Support actions</h2>
          <GlassCard>
            <UserAdminActions userId={u.id} email={u.email} isSelf={u.id === me.id} isAdmin={!!u.isAdmin} suspended={!!u.suspendedAt} locked={locked || u.failedAttempts > 0} emailReady={emailConfigured()} />
          </GlassCard>
          <p className="mt-3 px-1 text-[13px] text-secondary">Every action here is recorded in the <Link href="/admin/audit" className="font-semibold text-tint">audit log</Link>. Passwords, 2FA secrets and home contents are never shown.</p>
        </section>
      </div>
    </>
  );
}
