import { NextResponse } from 'next/server';
import { zipSync } from 'fflate';
import { openBlob } from '@/lib/blob';
import { MAX_PACK_BYTES, extensionFor, packReadme, renderSummaryHtml, safeName, toCsv, pathAllocator } from '@/lib/pack-core';
import { buildPackData, loadPackRows, packAccess, parsePackOptions } from '@/lib/pack';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Move-out pack: a zip with a printable summary, spreadsheets and every stored file. Owner/admin only. */
export async function GET(req: Request) {
  const access = await packAccess();
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { household, prefs, user } = access;
  const opts = parsePackOptions(new URL(req.url).searchParams);
  const rows = await loadPackRows(household.id, opts);

  // Collect the files to include, then fetch them one by one until the size cap is reached.
  const wanted: { key: string; url: string; path: string }[] = [];
  for (const a of rows.assets) {
    const base = safeName(a.name);
    if (a.receiptUrl) wanted.push({ key: `a:${a.id}`, url: a.receiptUrl, path: `files/receipts/${base}` });
    if (a.manualUrl) wanted.push({ key: `a:${a.id}`, url: a.manualUrl, path: `files/manuals/${base}` });
    if (a.photoUrl) wanted.push({ key: `a:${a.id}`, url: a.photoUrl, path: `files/photos/${base}` });
  }
  if (opts.documents) for (const d of rows.documents) if (d.fileUrl) wanted.push({ key: `d:${d.id}`, url: d.fileUrl, path: `files/documents/${safeName(d.title)}` });

  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  const filesByAsset = new Map<string, string[]>();
  const fileByDoc = new Map<string, string>();
  const skipped: string[] = [];
  let total = 0;
  const unique = pathAllocator();
  for (const w of wanted) {
    const file = await openBlob(w.url).catch(() => null);
    if (!file) { skipped.push(`${w.path} (unavailable)`); continue; }
    const bytes = new Uint8Array(await new Response(file.stream).arrayBuffer());
    if (total + bytes.length > MAX_PACK_BYTES) { skipped.push(`${w.path} (size limit)`); continue; }
    total += bytes.length;
    const path = unique(w.path + extensionFor(w.url, file.blob.contentType));
    files[path] = [bytes, { level: 0 }]; // PDFs and photos are already compressed
    const id = w.key.slice(2);
    if (w.key.startsWith('a:')) filesByAsset.set(id, [...(filesByAsset.get(id) ?? []), path]);
    else fileByDoc.set(id, path);
  }

  const data = buildPackData({ name: household.name, address: household.address }, prefs, rows, opts, filesByAsset, fileByDoc);
  const enc = new TextEncoder();
  const money = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2));
  files['README.txt'] = enc.encode(packReadme(household.name, skipped));
  files['summary.html'] = enc.encode(renderSummaryHtml(data));
  files['assets.csv'] = enc.encode(toCsv([['Name', 'Category', 'Make', 'Model', 'Serial', 'Installed', 'Warranty ends', 'Purchase price', 'Notes', 'Files'], ...data.assets.map((a) => [a.name, a.category, a.make, a.model, a.serialNumber, a.installDate, a.warrantyExpiry, money(a.purchaseCents), a.notes, a.files.join(' | ')])]));
  files['service-history.csv'] = enc.encode(toCsv([['Date', 'Item', 'Work done', 'Provider', 'Cost'], ...data.services.map((s) => [s.serviceDate, s.assetName, s.description, s.provider, money(s.costCents)])]));
  if (data.contractors) files['contractors.csv'] = enc.encode(toCsv([['Name', 'Trade', 'Phone', 'E-mail'], ...data.contractors.map((c) => [c.name, c.trade, c.phone, c.email])]));

  await audit({ id: user.id, email: user.email }, 'pack.download', `Move-out pack for ${household.name}`);
  const zip = zipSync(files);
  return new Response(zip as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName(household.name)}-move-out-pack.zip"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
