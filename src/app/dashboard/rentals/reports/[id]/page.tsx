import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/db';
import { conditionItems, conditionReports, tenancies } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { getPrefs } from '@/lib/prefs';
import { compareReports, conditionLabel, reportKindLabel, reportSummary } from '@/lib/rental-core';
import { formatDate } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import ReportEditor from '@/components/ReportEditor';

export const metadata = { title: 'Condition report' };
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default async function ReportPage({ params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p;
  if (!isUuid(id)) notFound();
  const { household, role } = await requireHousehold();
  if (role !== 'owner' && role !== 'admin') notFound();
  const { locale } = await getPrefs();
  const [rep] = await db.select().from(conditionReports).where(and(eq(conditionReports.id, id), eq(conditionReports.householdId, household.id)));
  if (!rep) notFound();
  const items = await db.select().from(conditionItems).where(eq(conditionItems.reportId, id)).orderBy(asc(conditionItems.sort));
  const [tenancy] = rep.tenancyId ? await db.select().from(tenancies).where(eq(tenancies.id, rep.tenancyId)) : [];
  const sum = reportSummary(items.map((i) => ({ room: i.room, item: i.item, condition: i.condition, hasPhoto: !!i.photoUrl })));
  let changes: ReturnType<typeof compareReports> = [];
  if (rep.kind === 'move_out' && rep.tenancyId) {
    const [mi] = await db.select({ id: conditionReports.id }).from(conditionReports).where(and(eq(conditionReports.tenancyId, rep.tenancyId), eq(conditionReports.kind, 'move_in'))).limit(1);
    if (mi) changes = compareReports(await db.select().from(conditionItems).where(eq(conditionItems.reportId, mi.id)), items);
  }
  const title = `${reportKindLabel(rep.kind)} report`;
  return (
    <>
      <Link href="/dashboard/rentals" className="mb-3 -ml-2 flex min-h-[44px] w-fit items-center gap-1 px-2 text-[17px] text-tint print:hidden"><ArrowLeft className="h-5 w-5" aria-hidden /> Rentals</Link>
      <PageHeader title={title} subtitle={`${household.name}${household.address ? `, ${household.address}` : ''} · ${formatDate(rep.inspectedOn, undefined, locale)}${tenancy ? ` · Tenant: ${tenancy.tenantName}` : ''}`} />
      <div className="mb-4 flex flex-wrap gap-2 text-[13px] font-medium print:hidden" data-testid="report-summary">
        <span className="rounded-full bg-label/5 px-3 py-1">{sum.total} items</span>
        <span className="rounded-full bg-ok/15 px-3 py-1 text-ok">{sum.counts.good} good</span>
        {sum.issues > 0 && <span className="rounded-full bg-bad/15 px-3 py-1 text-bad">{sum.issues} to note</span>}
        <span className="rounded-full bg-label/5 px-3 py-1">{sum.photos} photo{sum.photos === 1 ? '' : 's'}</span>
      </div>
      {rep.kind === 'move_out' && (
        <GlassCard className="mb-4" data-testid="comparison">
          <h2 className="text-[18px] font-bold">Compared with the move-in report</h2>
          {changes.length === 0 ? <p className="mt-1 text-[14px] text-secondary">No differences recorded{tenancy ? '' : ' (link this report to a tenancy with a move-in report to compare)'}.</p> : (
            <ul className="mt-2 divide-y text-[14.5px] hairline [&>li]:border-inherit">
              {changes.map((c) => <li key={`${c.room}|${c.item}`} className="py-2"><b>{c.room}: {c.item}</b> · <span className={c.worse ? 'font-semibold text-bad' : 'text-ok'}>{conditionLabel(c.before)} → {conditionLabel(c.after)}</span>{c.notes ? ` · ${c.notes}` : ''}</li>)}
            </ul>
          )}
        </GlassCard>
      )}
      <ReportEditor id={id} inspectedOn={rep.inspectedOn} notes={rep.notes} items={items.map((i) => ({ id: i.id, room: i.room, item: i.item, condition: i.condition, notes: i.notes, hasPhoto: !!i.photoUrl, photoIsPdf: /\.pdf(\?|$)/i.test(i.photoUrl ?? '') }))} />
      {/* print layout: a plain table of everything */}
      <div className="hidden print:block" id="report-print">
        <h2 className="mb-2 text-[20px] font-bold">{title}: {household.name}</h2>
        <table className="w-full border-collapse text-[12px]"><thead><tr><th className="border p-1 text-left">Room</th><th className="border p-1 text-left">Item</th><th className="border p-1 text-left">Condition</th><th className="border p-1 text-left">Notes</th><th className="border p-1 text-left">Photo</th></tr></thead>
          <tbody>{items.map((i) => <tr key={i.id}><td className="border p-1">{i.room}</td><td className="border p-1">{i.item}</td><td className="border p-1">{conditionLabel(i.condition)}</td><td className="border p-1">{i.notes ?? ''}</td><td className="border p-1">{i.photoUrl ? (/\.pdf(\?|$)/i.test(i.photoUrl) ? 'PDF attached' : /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/api/condition/${i.id}`} alt={`${i.room} ${i.item}`} style={{ width: 90, height: 68, objectFit: 'cover' }} />) : ''}</td></tr>)}</tbody></table>
        {rep.notes && <p className="mt-3 text-[12px]"><b>Notes:</b> {rep.notes}</p>}
        <p className="mt-8 text-[12px]">Landlord signature: ____________________ &nbsp;&nbsp; Tenant signature: ____________________ &nbsp;&nbsp; Date: __________</p>
      </div>
    </>
  );
}
