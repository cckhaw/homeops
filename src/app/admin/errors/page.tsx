import { desc } from 'drizzle-orm';
import { CheckCircle2 } from 'lucide-react';
import { db } from '@/db';
import { errorLog } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { clearResolvedErrors, reopenError, resolveError } from '@/app/admin-actions';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import AppleButton, { SubmitButton } from '@/components/AppleButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Errors · Admin' };

const when = (d: Date) => formatDate(d, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function ErrorsPage() {
  await requireAdmin();
  const rows = await db.select().from(errorLog).orderBy(desc(errorLog.lastSeenAt)).limit(300);
  const open = rows.filter((r) => !r.resolvedAt);
  const resolved = rows.filter((r) => r.resolvedAt);

  const list = (items: typeof rows, isOpen: boolean) => (
    <ul className="divide-y hairline [&>li]:border-inherit">
      {items.map((r) => (
        <li key={r.id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-[16px] font-semibold">{r.message}</p>
              <p className="text-[13px] text-secondary">
                {r.source === 'client' ? 'Browser' : 'Server'}{r.route ? ` · ${r.route}` : ''} · {r.count}× · last {when(r.lastSeenAt)} · first {when(r.firstSeenAt)}
              </p>
            </div>
            <form action={(isOpen ? resolveError : reopenError).bind(null, r.id)} className="shrink-0">
              <AppleButton type="submit" variant={isOpen ? 'secondary' : 'plain'}>{isOpen ? 'Resolve' : 'Reopen'}</AppleButton>
            </form>
          </div>
          {r.stack && (
            <details className="mt-1">
              <summary className="flex min-h-[44px] cursor-pointer items-center text-[13px] font-semibold text-tint">Stack trace</summary>
              <pre className="overflow-x-auto rounded-xl bg-label/5 p-3 text-[11px] leading-snug">{r.stack}</pre>
            </details>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader title="Errors" subtitle="Recorded in our own database — no personal data, no third party" />
      <GlassCard className="mb-6 py-2">
        {open.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-[15px] text-ok"><CheckCircle2 className="h-5 w-5" aria-hidden /> No open errors.</p>
        ) : (
          list(open, true)
        )}
      </GlassCard>
      {resolved.length > 0 && (
        <>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[22px] font-bold">Resolved</h2>
            <form action={clearResolvedErrors}><SubmitButton variant="plain">Clear resolved</SubmitButton></form>
          </div>
          <GlassCard className="py-2">{list(resolved, false)}</GlassCard>
        </>
      )}
    </>
  );
}
