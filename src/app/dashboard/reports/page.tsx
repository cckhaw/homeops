import Link from 'next/link';
import { Download, Receipt, Wrench } from 'lucide-react';
import { requireHousehold } from '@/lib/auth';
import { getPrefs } from '@/lib/prefs';
import { loadReportInputs } from '@/lib/report';
import { buildSpendReport, reportYears } from '@/lib/report-core';
import { cn, formatCurrency } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';

export const metadata = { title: 'Spending' };
export const dynamic = 'force-dynamic';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { household } = await requireHousehold();
  const { locale, currency } = await getPrefs();
  const input = await loadReportInputs(household.id);
  const now = new Date().getFullYear();
  const years = reportYears(input.assets, input.services, now);
  const asked = Number((await searchParams).year);
  const year = years.includes(asked) ? asked : years[0];
  const r = buildSpendReport(input.assets, input.services, year);
  const money = (c: number) => formatCurrency(c, currency, locale);
  const monthName = (i: number) => new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, i, 1)));
  const peak = Math.max(1, ...r.months.map((m) => m.purchase + m.service));
  const topCat = Math.max(1, ...r.byCategory.map((c) => c.cents));
  const empty = r.totalCents === 0;

  return (
    <>
      <PageHeader
        title="Spending"
        subtitle={`What ${household.name} cost in ${year}`}
        action={
          <a href={`/api/report?year=${year}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-tint/10 px-4 text-[15px] font-semibold text-tint">
            <Download className="h-4 w-4" aria-hidden /> CSV
          </a>
        }
      />

      <nav aria-label="Year" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {years.map((y) => (
          <Link key={y} href={`/dashboard/reports?year=${y}`} aria-current={y === year ? 'page' : undefined}
            className={cn('flex min-h-[44px] items-center rounded-full px-4 text-[15px] font-semibold', y === year ? 'bg-tint text-white' : 'bg-label/5 text-secondary')}>
            {y}
          </Link>
        ))}
      </nav>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <GlassCard className="p-4"><p className="text-[13px] text-secondary">Total in {year}</p><p className="text-[28px] font-bold" data-testid="total">{money(r.totalCents)}</p></GlassCard>
        <GlassCard className="p-4"><p className="flex items-center gap-1.5 text-[13px] text-secondary"><Receipt className="h-4 w-4" aria-hidden /> Purchases</p><p className="text-[24px] font-bold" data-testid="purchases">{money(r.purchaseCents)}</p></GlassCard>
        <GlassCard className="p-4"><p className="flex items-center gap-1.5 text-[13px] text-secondary"><Wrench className="h-4 w-4" aria-hidden /> Service &amp; repairs</p><p className="text-[24px] font-bold" data-testid="service">{money(r.serviceCents)}</p></GlassCard>
      </div>

      {empty ? (
        <GlassCard className="p-6 text-center text-[15px] text-secondary">
          Nothing recorded for {year} yet. Add a <strong>purchase price</strong> to an asset, or a cost to a service record, and it appears here.
        </GlassCard>
      ) : (
        <>
          <GlassCard className="mb-5 p-5">
            <h2 className="mb-4 text-[17px] font-semibold">By month</h2>
            <div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Monthly spending for ${year}, highest ${money(peak)}`}>
              {r.months.map((m, i) => {
                const total = m.purchase + m.service;
                return (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${monthName(i)}: ${money(total)}`}>
                    <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-md" style={{ height: `${(total / peak) * 100}%` }}>
                      <div className="bg-tint/45" style={{ flex: m.service }} />
                      <div className="bg-tint" style={{ flex: m.purchase }} />
                    </div>
                    <span className="text-[10px] text-secondary">{monthName(i).slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex gap-4 text-[12px] text-secondary">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-tint" /> Purchases</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-tint/45" /> Service</span>
            </p>
          </GlassCard>

          <div className="grid gap-5 md:grid-cols-2">
            <GlassCard className="p-5">
              <h2 className="mb-3 text-[17px] font-semibold">By category</h2>
              <ul className="space-y-3">
                {r.byCategory.map((c) => (
                  <li key={c.category}>
                    <div className="flex justify-between text-[15px]"><span>{c.category}</span><span className="font-semibold">{money(c.cents)}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-label/5"><div className="h-2 rounded-full bg-tint" style={{ width: `${(c.cents / topCat) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </GlassCard>
            <GlassCard className="p-5">
              <h2 className="mb-3 text-[17px] font-semibold">Biggest costs</h2>
              <ul className="divide-y hairline [&>li]:border-inherit">
                {r.byAsset.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <Link href={`/dashboard/assets/${a.id}`} className="flex min-h-[44px] items-center justify-between gap-3 py-2 text-[15px]">
                      <span className="min-w-0 truncate">{a.name}</span>
                      <span className="shrink-0 text-right font-semibold">{money(a.cents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </>
      )}
      {r.undatedPurchases > 0 && (
        <p className="mt-4 text-[13px] text-secondary">
          {money(r.undatedPurchases)} of purchase prices have no install/purchase date, so they aren&apos;t counted in any year.
        </p>
      )}
    </>
  );
}
