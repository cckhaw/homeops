import { count, desc } from 'drizzle-orm';
import { db } from '@/db';
import { newsletterIssues, newsletterSubscribers } from '@/db/schema';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import NewsletterAdmin from '@/components/NewsletterAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Newsletter · Admin' };

const fmt = (d: Date | null) => (d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' }) : '');

export default async function AdminNewsletter() {
  const counts = await db.select({ status: newsletterSubscribers.status, n: count() }).from(newsletterSubscribers).groupBy(newsletterSubscribers.status);
  const n = (s: string) => Number(counts.find((c) => c.status === s)?.n ?? 0);
  const recent = await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(50);
  const issues = await db.select().from(newsletterIssues).orderBy(desc(newsletterIssues.createdAt)).limit(10);

  return (
    <>
      <PageHeader title="Newsletter" subtitle="Double opt-in subscribers from the blog, FAQ and tools. Every e-mail carries an unsubscribe link." />
      <div className="mb-6 grid grid-cols-3 gap-3" data-testid="newsletter-stats">
        {[['Subscribed', n('subscribed')], ['Waiting to confirm', n('pending')], ['Unsubscribed', n('unsubscribed')]].map(([l, v]) => (
          <GlassCard key={l as string}><p className="text-[28px] font-bold">{v}</p><p className="text-[13px] text-secondary">{l}</p></GlassCard>
        ))}
      </div>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Write and send</h2>
      <GlassCard className="mb-8"><NewsletterAdmin subscribed={n('subscribed')} /></GlassCard>
      {issues.length > 0 && (
        <>
          <h2 className="mb-2 px-1 text-[22px] font-bold">Sent</h2>
          <GlassCard className="mb-8 py-1"><ul className="divide-y text-[15px] hairline [&>li]:border-inherit" data-testid="issues">{issues.map((i) => <li key={i.id} className="flex justify-between gap-3 py-3"><span className="min-w-0 truncate font-medium">{i.subject}</span><span className="shrink-0 text-secondary">{i.sentCount} sent · {fmt(i.lastSentAt ?? i.createdAt)}</span></li>)}</ul></GlassCard>
        </>
      )}
      <h2 className="mb-2 px-1 text-[22px] font-bold">Recent sign-ups</h2>
      <GlassCard className="overflow-x-auto py-1">
        <table className="w-full text-left text-[14px]" data-testid="subscribers"><thead className="text-secondary"><tr><th className="py-2 pr-3 font-medium">E-mail</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">From</th><th className="py-2 font-medium">Date</th></tr></thead>
          <tbody className="divide-y hairline [&>tr]:border-inherit">{recent.map((s) => <tr key={s.id}><td className="py-2 pr-3">{s.email}</td><td className="py-2 pr-3 capitalize">{s.status}</td><td className="py-2 pr-3">{s.source ?? ''}</td><td className="py-2">{fmt(s.createdAt)}</td></tr>)}</tbody></table>
        {recent.length === 0 && <p className="py-4 text-[15px] text-secondary">No sign-ups yet.</p>}
      </GlassCard>
    </>
  );
}
