import Link from 'next/link';
import { desc, eq, inArray } from 'drizzle-orm';
import { AlertTriangle, CalendarClock, FileText } from 'lucide-react';
import { db } from '@/db';
import { conditionItems, conditionReports, rentPayments, tenancies } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { getPrefs } from '@/lib/prefs';
import { arrears, duePeriods, leaseState, nextRentDue, reportKindLabel, reportSummary } from '@/lib/rental-core';
import { formatCurrency, formatDate, todayISO } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { EditTenancyButton, NewReportForm, TenancyActions, TenancyForm } from '@/components/RentalForms';

export const metadata = { title: 'Rentals' };

export default async function RentalsPage() {
  const { household, role } = await requireHousehold();
  const { locale, currency } = await getPrefs();
  if (role !== 'owner' && role !== 'admin') {
    return (<><PageHeader title="Rentals" /><GlassCard><p className="text-[16px] text-secondary">Only the owner or an admin of {household.name} can manage rentals, because they hold the tenant&apos;s personal details.</p></GlassCard></>);
  }
  const today = todayISO();
  const all = await db.select().from(tenancies).where(eq(tenancies.householdId, household.id)).orderBy(desc(tenancies.startDate));
  const ids = all.map((t) => t.id);
  const payments = ids.length ? await db.select().from(rentPayments).where(inArray(rentPayments.tenancyId, ids)).orderBy(desc(rentPayments.period)) : [];
  const reports = await db.select().from(conditionReports).where(eq(conditionReports.householdId, household.id)).orderBy(desc(conditionReports.inspectedOn));
  const items = reports.length ? await db.select({ reportId: conditionItems.reportId, condition: conditionItems.condition, photo: conditionItems.photoUrl }).from(conditionItems).where(inArray(conditionItems.reportId, reports.map((r) => r.id))) : [];
  const active = all.filter((t) => t.status === 'active');
  const ended = all.filter((t) => t.status !== 'active');
  const money = (c: number) => formatCurrency(c, currency, locale);
  const nameOf = new Map(all.map((t) => [t.id, t.tenantName]));

  return (
    <>
      <PageHeader title="Rentals" subtitle="Tenants, rent reminders and move-in / move-out condition reports" />
      <div className="grid items-start gap-x-8 gap-y-6 xl:grid-cols-2">
        <section aria-labelledby="tenancies-h" className="space-y-4">
          <h2 id="tenancies-h" className="px-1 text-[22px] font-bold">Tenancies</h2>
          {active.length === 0 && <GlassCard><p className="text-[15px] text-secondary">No active tenancy. Add one and Wodejia reminds you each month to collect the rent, and ahead of the lease ending.</p></GlassCard>}
          {active.map((t) => {
            const mine = payments.filter((p) => p.tenancyId === t.id);
            const owed = arrears(duePeriods(t.startDate, t.endDate, t.dueDay, today), mine, t.rentCents);
            const lease = leaseState(t.endDate, today);
            return (
              <GlassCard key={t.id} className="space-y-3" data-testid="tenancy-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[19px] font-semibold">{t.tenantName}</p>
                    <p className="text-[14px] text-secondary">{money(t.rentCents)} a month, due on day {t.dueDay} · next {formatDate(nextRentDue(t.dueDay, today), undefined, locale)}</p>
                    {(t.tenantPhone || t.tenantEmail) && <p className="truncate text-[13px] text-secondary">{[t.tenantPhone, t.tenantEmail].filter(Boolean).join(' · ')}</p>}
                  </div>
                  <EditTenancyButton values={{ id: t.id, tenantName: t.tenantName, tenantPhone: t.tenantPhone, tenantEmail: t.tenantEmail, startDate: t.startDate, endDate: t.endDate, rent: (t.rentCents / 100).toFixed(2), dueDay: t.dueDay, deposit: t.depositCents != null ? (t.depositCents / 100).toFixed(2) : '', notes: t.notes }} />
                </div>
                <div className="flex flex-wrap gap-2 text-[13px] font-medium">
                  <span className="rounded-full bg-label/5 px-3 py-1">From {formatDate(t.startDate, undefined, locale)}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${lease.state === 'ending-soon' ? 'bg-warn/15 text-warn' : 'bg-label/5'}`} data-testid="lease-state"><CalendarClock className="h-3.5 w-3.5" aria-hidden />{lease.state === 'rolling' ? 'Month to month' : lease.state === 'ended' ? `Lease ended ${formatDate(t.endDate, undefined, locale)}` : `Ends ${formatDate(t.endDate, undefined, locale)} (${lease.daysLeft} days)`}</span>
                  {t.depositCents != null && <span className="rounded-full bg-label/5 px-3 py-1">Deposit {money(t.depositCents)}</span>}
                  {owed.months > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-bad/15 px-3 py-1 text-bad" data-testid="arrears"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />{owed.months} month{owed.months === 1 ? '' : 's'} unpaid · {money(owed.owedCents)}</span>
                  ) : (
                    <span className="rounded-full bg-ok/15 px-3 py-1 text-ok" data-testid="arrears">Rent up to date</span>
                  )}
                </div>
                {t.notes && <p className="text-[14px] text-secondary">{t.notes}</p>}
                <TenancyActions id={t.id} owedMonths={owed.months} name={t.tenantName} />
                {mine.length > 0 && (
                  <details className="rounded-xl border p-3 hairline">
                    <summary className="min-h-[40px] cursor-pointer py-2 text-[15px] font-semibold">Rent received ({mine.length})</summary>
                    <ul className="divide-y text-[14px] hairline [&>li]:border-inherit" data-testid="payments">
                      {mine.slice(0, 24).map((p) => <li key={p.id} className="flex justify-between py-2"><span>{p.period}</span><span>{money(p.amountCents)} · paid {formatDate(p.paidOn, undefined, locale)}</span></li>)}
                    </ul>
                  </details>
                )}
              </GlassCard>
            );
          })}
          {ended.length > 0 && (
            <details className="rounded-2xl border bg-surface p-4 hairline">
              <summary className="min-h-[40px] cursor-pointer py-2 text-[16px] font-semibold">Past tenancies ({ended.length})</summary>
              <ul className="divide-y text-[14px] hairline [&>li]:border-inherit" data-testid="past-tenancies">
                {ended.map((t) => <li key={t.id} className="py-2"><b>{t.tenantName}</b> · {formatDate(t.startDate, undefined, locale)} to {formatDate(t.endedOn ?? t.endDate, undefined, locale)} · {money(t.rentCents)} a month</li>)}
              </ul>
            </details>
          )}
          <h2 className="px-1 pt-2 text-[22px] font-bold">Add a tenancy</h2>
          <GlassCard><TenancyForm /></GlassCard>
        </section>

        <section aria-labelledby="reports-h" className="space-y-4">
          <h2 id="reports-h" className="px-1 text-[22px] font-bold">Condition reports</h2>
          <GlassCard><NewReportForm today={today} tenants={all.map((t) => ({ id: t.id, name: t.tenantName }))} /></GlassCard>
          {reports.length === 0 ? (
            <GlassCard><p className="text-[15px] text-secondary">A move-in report records the condition of every room with photos. At move-out, start from it and only change what is different. That is your evidence for the deposit.</p></GlassCard>
          ) : (
            <GlassCard className="py-1">
              <ul className="divide-y hairline [&>li]:border-inherit" data-testid="reports">
                {reports.map((r) => {
                  const s = reportSummary(items.filter((i) => i.reportId === r.id).map((i) => ({ room: '', item: '', condition: i.condition, hasPhoto: !!i.photo })));
                  return (
                    <li key={r.id}>
                      <Link href={`/dashboard/rentals/reports/${r.id}`} className="flex min-h-[56px] items-center gap-3 py-2">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint/10 text-tint"><FileText className="h-5 w-5" aria-hidden /></span>
                        <span className="min-w-0 flex-1"><span className="block text-[16px] font-semibold">{reportKindLabel(r.kind)} report{r.tenancyId && nameOf.get(r.tenancyId) ? ` · ${nameOf.get(r.tenancyId)}` : ''}</span><span className="block text-[13px] text-secondary">{formatDate(r.inspectedOn, undefined, locale)} · {s.total} items{s.issues ? ` · ${s.issues} to note` : ''}{s.photos ? ` · ${s.photos} photo${s.photos === 1 ? '' : 's'}` : ''}</span></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          )}
        </section>
      </div>
    </>
  );
}


