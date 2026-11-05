import { csvCell } from '@/lib/report-core';

export const MAX_PACK_BYTES = 120 * 1024 * 1024;

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** File-name safe text: letters, digits, dot, dash, underscore; never a path. */
export function safeName(s: string, max = 60): string {
  const t = s.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/^[._]+|_+$/g, '').slice(0, max);
  return t || 'file';
}

export const toCsv = (rows: (string | number | null | undefined)[][]) => rows.map((r) => r.map((c) => csvCell(c ?? '')).join(',')).join('\r\n') + '\r\n';

/** Extension from a stored blob url / content type. Only the types the app accepts are expected. */
export function extensionFor(url: string, contentType?: string | null): string {
  const byType: Record<string, string> = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic', 'image/heif': '.heif' };
  const type = contentType?.split(';')[0];
  if (type && byType[type]) return byType[type];
  const m = /\.([a-z0-9]{2,5})(?:$|\?)/i.exec(url.split('/').pop() ?? '');
  return m ? `.${m[1].toLowerCase()}` : '.bin';
}

/** Returns a function that hands out unique zip paths: a repeat gets -2, -3 … before the extension. */
export function pathAllocator() {
  const used = new Set<string>();
  return (p: string) => {
    const slash = p.lastIndexOf('/');
    const dot = p.lastIndexOf('.');
    const stem = dot > slash ? p.slice(0, dot) : p;
    const ext = dot > slash ? p.slice(dot) : '';
    let out = p;
    for (let n = 2; used.has(out); n++) out = `${stem}-${n}${ext}`;
    used.add(out);
    return out;
  };
}

export type PackData = {
  home: { name: string; address: string | null };
  generatedOn: string;
  money: (cents: number | null | undefined) => string;
  date: (d: string | null | undefined) => string;
  assets: { name: string; category: string; make: string | null; model: string | null; serialNumber: string | null; installDate: string | null; warrantyExpiry: string | null; purchaseCents: number | null; notes: string | null; files: string[] }[];
  services: { assetName: string; serviceDate: string; description: string; provider: string | null; costCents: number | null }[];
  tasksDone: { title: string; completedOn: string | null; frequency: string }[];
  contractors?: { name: string; trade: string; phone: string | null; email: string | null }[];
  documents?: { title: string; category: string; expiresOn: string | null; file: string | null }[];
  bills?: { year: number; totals: { label: string; cents: number }[] }[];
};

/** Self-contained, print-friendly summary (no external resources, no member e-mails). */
export function renderSummaryHtml(d: PackData): string {
  const th = (cols: string[]) => `<tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>`;
  const td = (cols: unknown[]) => `<tr>${cols.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`;
  const table = (head: string[], rows: unknown[][]) => (rows.length ? `<table>${th(head)}${rows.map(td).join('')}</table>` : '<p class="muted">Nothing recorded.</p>');
  const section = (title: string, body: string) => `<section><h2>${esc(title)}</h2>${body}</section>`;
  const parts = [
    section('Assets', table(['Item', 'Category', 'Make / model', 'Serial', 'Installed', 'Warranty ends', 'Price', 'Files'], d.assets.map((a) => [a.name, a.category, [a.make, a.model].filter(Boolean).join(' '), a.serialNumber, d.date(a.installDate), d.date(a.warrantyExpiry), a.purchaseCents != null ? d.money(a.purchaseCents) : '', a.files.join(', ')]))),
    section('Service and repair history', table(['Date', 'Item', 'Work done', 'By', 'Cost'], d.services.map((s) => [d.date(s.serviceDate), s.assetName, s.description, s.provider, s.costCents != null ? d.money(s.costCents) : '']))),
    section('Maintenance carried out', table(['Task', 'Done on', 'Repeats'], d.tasksDone.map((t) => [t.title, d.date(t.completedOn), t.frequency]))),
  ];
  if (d.contractors) parts.push(section('Trusted contractors', table(['Name', 'Trade', 'Phone', 'E-mail'], d.contractors.map((c) => [c.name, c.trade, c.phone, c.email]))));
  if (d.documents) parts.push(section('Documents', table(['Title', 'Category', 'Expires', 'File'], d.documents.map((x) => [x.title, x.category, d.date(x.expiresOn), x.file]))));
  if (d.bills) parts.push(section('Utility bills by year', d.bills.length ? d.bills.map((b) => `<h3>${b.year}</h3>${table(['Utility', 'Total'], b.totals.map((t) => [t.label, d.money(t.cents)]))}`).join('') : '<p class="muted">Nothing recorded.</p>'));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.home.name)} — Home pack</title>
<style>body{font:14px/1.45 -apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1d1d1f;max-width:960px;margin:24px auto;padding:0 16px}h1{margin:0}h2{margin:28px 0 8px;font-size:18px;border-bottom:1px solid #ddd;padding-bottom:4px}h3{margin:12px 0 4px}table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{border:1px solid #ddd;padding:5px 7px;text-align:left;vertical-align:top}th{background:#f5f5f7}.muted{color:#86868b}button{margin:12px 0;padding:10px 18px;border:0;border-radius:10px;background:#0e7fae;color:#fff;font-weight:600}@media print{button{display:none}section{break-inside:avoid-page}}</style></head><body>
<h1>${esc(d.home.name)}</h1><p class="muted">${d.home.address ? esc(d.home.address) + ' · ' : ''}Home pack generated ${esc(d.date(d.generatedOn))} with HomeOps</p>
<button onclick="window.print()">Print / save as PDF</button>${parts.join('')}</body></html>`;
}

export const packReadme = (home: string, skipped: string[]) =>
  `HomeOps move-out pack — ${home}\r\n\r\n` +
  `summary.html          open in a browser, then Print > Save as PDF\r\n` +
  `assets.csv            every asset with make, model, serial, dates and price\r\n` +
  `service-history.csv   repairs and servicing\r\n` +
  `files/                receipts, manuals and photos (and vault documents if you included them)\r\n` +
  (skipped.length ? `\r\nNot included (the pack is limited to ${Math.round(MAX_PACK_BYTES / 1048576)} MB or the file was unavailable):\r\n${skipped.map((s) => ' - ' + s).join('\r\n')}\r\n` : '');
