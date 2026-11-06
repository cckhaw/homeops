import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { resolveHomes } from '@/lib/household';
import { loadReportInputs } from '@/lib/report';
import { buildSpendReport, csvCell, reportYears } from '@/lib/report-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Yearly spend as a spreadsheet: one row per asset with purchase and service totals. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const household = (await resolveHomes(user.id, user.fullName)).active.household;
  const input = await loadReportInputs(household.id);
  const years = reportYears(input.assets, input.services, new Date().getFullYear());
  const asked = Number(new URL(req.url).searchParams.get('year'));
  const year = years.includes(asked) ? asked : years[0];
  const r = buildSpendReport(input.assets, input.services, year);
  const cat = new Map(input.assets.map((a) => [a.id, a.category]));
  const money = (c: number) => (c / 100).toFixed(2);
  const lines = [
    ['Asset', 'Category', 'Purchases', 'Service and repairs', 'Total'],
    ...r.byAsset.map((a) => [a.name, cat.get(a.id) ?? '', money(a.purchase), money(a.service), money(a.cents)]),
    ['Total', '', money(r.purchaseCents), money(r.serviceCents), money(r.totalCents)],
  ];
  const csv = lines.map((l) => l.map(csvCell).join(',')).join('\r\n') + '\r\n';
  return new NextResponse(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="wodejia-spending-${year}.csv"`, 'Cache-Control': 'private, no-store' },
  });
}
