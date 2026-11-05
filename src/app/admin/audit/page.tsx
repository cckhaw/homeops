import { desc, ilike, or } from 'drizzle-orm';
import { Search } from 'lucide-react';
import { db } from '@/db';
import { auditLog } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit log · Admin' };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const q = ((await searchParams).q ?? '').trim().slice(0, 80);
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await db
    .select()
    .from(auditLog)
    .where(q ? or(ilike(auditLog.summary, like), ilike(auditLog.action, like), ilike(auditLog.actorEmail, like)) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  return (
    <>
      <PageHeader title="Audit log" subtitle="Admin actions and account deletions · newest first, last 200" />
      <form className="relative mb-4" role="search">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" aria-hidden />
        <input name="q" defaultValue={q} placeholder="Search actions, people or details" aria-label="Search the audit log" className="input pl-10" />
      </form>
      <GlassCard className="py-2">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-secondary">{q ? 'No matching entries.' : 'Nothing has been recorded yet.'}</p>
        ) : (
          <ul className="divide-y hairline [&>li]:border-inherit">
            {rows.map((r) => (
              <li key={r.id} className="py-3">
                <p className="text-[16px]">{r.summary}</p>
                <p className="text-[13px] text-secondary">
                  <code className="rounded bg-label/5 px-1.5 py-0.5 text-[12px]">{r.action}</code> · {r.actorEmail ?? 'system'} ·{' '}
                  {formatDate(r.createdAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </>
  );
}
