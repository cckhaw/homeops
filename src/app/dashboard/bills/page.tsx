import { desc, eq } from 'drizzle-orm';
import { TrendingUp, Trash2 } from 'lucide-react';
import { db } from '@/db';
import { utilityBills } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { getPrefs } from '@/lib/prefs';
import { UTILITY_KINDS, detectSpikes, monthlySeries, yearlyTotals } from '@/lib/utilities-core';
import { formatCurrency, todayISO } from '@/lib/utils';
import { deleteBill } from '@/app/records-actions';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { BillForm } from '@/components/records-forms';

export const metadata = { title: 'Utility bills' };
export const dynamic = 'force-dynamic';

export default async function BillsPage() {
  const { household } = await requireHousehold();
  const { locale, currency } = await getPrefs();
  const bills = await db.select().from(utilityBills).where(eq(utilityBills.householdId, household.id)).orderBy(desc(utilityBills.period));
  const money = (c: number) => formatCurrency(c, currency, locale);
  const monthLabel = (p: string, style: 'short' | 'long' = 'short') => new Intl.DateTimeFormat(locale, { month: style, year: style === 'long' ? 'numeric' : undefined, timeZone: 'UTC' }).format(new Date(p + 'T00:00:00Z'));
  const thisMonth = todayISO().slice(0, 7);
  const end = `${thisMonth}-01`;
  const kinds = UTILITY_KINDS.filter((k) => bills.some((b) => b.kind === k.id));
  const totals = yearlyTotals(bills);

  return (
    <>
      <PageHeader title="Utility bills" subtitle="Track the monthly bills and spot a spike early" />
      <GlassCard className="mb-6"><h2 className="mb-3 text-[17px] font-semibold">Add a bill</h2><BillForm defaultMonth={thisMonth} /></GlassCard>

      {bills.length === 0 ? (
        <GlassCard className="p-6 text-center text-[15px] text-secondary">No bills yet. Enter this month&apos;s electricity bill to start your chart.</GlassCard>
      ) : (
        <>
          {totals.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-3">
              {totals.slice(0, 3).map((t) => (
                <GlassCard key={t.year} className="min-w-[140px] p-4"><p className="text-[13px] text-secondary">{t.year} total</p><p className="text-[22px] font-bold">{money(t.cents)}</p></GlassCard>
              ))}
            </div>
          )}
          {kinds.map((k) => {
            const series = monthlySeries(bills, k.id, end, 12);
            const peak = Math.max(1, ...series.map((s) => s.amountCents ?? 0));
            const spikes = detectSpikes(bills, k.id).slice(-3);
            const recent = series.filter((s) => s.amountCents != null);
            const avg = recent.length ? Math.round(recent.reduce((n, s) => n + (s.amountCents ?? 0), 0) / recent.length) : 0;
            return (
              <GlassCard key={k.id} className="mb-5 p-5" data-testid={`chart-${k.id}`}>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="text-[17px] font-semibold">{k.label}</h2>
                  <span className="text-[13px] text-secondary">avg {money(avg)} / month</span>
                </div>
                <div className="flex h-32 items-end gap-1" role="img" aria-label={`${k.label} bills, last 12 months`}>
                  {series.map((s) => (
                    <div key={s.period} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${monthLabel(s.period, 'long')}: ${s.amountCents == null ? 'no bill' : money(s.amountCents)}`}>
                      {s.amountCents == null ? <div className="h-[3px] w-full rounded bg-label/10" /> : <div className="w-full rounded-t-md bg-tint" style={{ height: `${(s.amountCents / peak) * 100}%` }} />}
                      <span className="text-[10px] text-secondary">{monthLabel(s.period).slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
                {spikes.map((sp) => (
                  <p key={sp.period} role="status" className="mt-3 flex items-start gap-2 rounded-xl bg-warn/10 px-3 py-2 text-[14px] text-warn" data-testid="spike">
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{monthLabel(sp.period, 'long')} was {sp.pct}% above your recent average ({money(sp.averageCents)}). Worth checking for a leak, a faulty appliance or a rate change.</span>
                  </p>
                ))}
              </GlassCard>
            );
          })}

          <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-secondary">All bills</h2>
          <GlassCard className="py-1">
            <ul className="divide-y hairline [&>li]:border-inherit">
              {bills.slice(0, 60).map((b) => {
                const kind = UTILITY_KINDS.find((k) => k.id === b.kind);
                return (
                  <li key={b.id} className="flex min-h-[52px] items-center justify-between gap-3 py-2" data-testid="bill">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium">{kind?.label ?? b.kind} · {monthLabel(b.period, 'long')}</p>
                      {b.usage != null && <p className="text-[13px] text-secondary">{b.usage.toLocaleString(locale)} {kind?.unit}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[16px] font-semibold">{money(b.amountCents)}</span>
                      <form action={deleteBill.bind(null, b.id)}><button aria-label={`Delete ${kind?.label} bill for ${monthLabel(b.period, 'long')}`} className="grid h-11 w-11 place-items-center rounded-xl text-secondary hover:text-bad"><Trash2 className="h-[18px] w-[18px]" aria-hidden /></button></form>
                    </div>
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        </>
      )}
    </>
  );
}
