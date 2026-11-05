import { NextResponse } from 'next/server';
import { renderSummaryHtml } from '@/lib/pack-core';
import { buildPackData, loadPackRows, packAccess, parsePackOptions } from '@/lib/pack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Printable summary page (the same file that is inside the zip, without the attachments). Owner/admin only. */
export async function GET(req: Request) {
  const access = await packAccess();
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const opts = parsePackOptions(new URL(req.url).searchParams);
  const rows = await loadPackRows(access.household.id, opts);
  const html = renderSummaryHtml(buildPackData({ name: access.household.name, address: access.household.address }, access.prefs, rows, opts, new Map(), new Map()));
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
