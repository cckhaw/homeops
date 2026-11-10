import { NextResponse } from 'next/server';
import { zipSync } from 'fflate';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, households } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { openBlob } from '@/lib/blob';
import { isMember } from '@/lib/household';
import { audit } from '@/lib/audit';
import { buildClaim, claimStatus, isResolution } from '@/lib/claim-core';
import { extensionFor, safeName } from '@/lib/pack-core';
import { formatCurrency, todayISO } from '@/lib/utils';
import { getPrefs } from '@/lib/prefs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ZIP = 40 * 1024 * 1024;

/** A zip with the claim letter and the item's saved receipt, manual and photo, for any signed-in member of the home. */
export async function GET(req: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!UUID.test(assetId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [a] = await db.select().from(assets).where(eq(assets.id, assetId));
  if (!a || !(await isMember(user.id, a.householdId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [home] = await db.select().from(households).where(eq(households.id, a.householdId));
  const { locale, currency } = await getPrefs();

  const sp = new URL(req.url).searchParams;
  const q = (k: string, max: number) => (sp.get(k) ?? '').slice(0, max);
  const resolution = isResolution(sp.get('resolution')) ? (sp.get('resolution') as 'repair' | 'replace' | 'refund') : 'repair';
  const since = /^\d{4}-\d{2}-\d{2}$/.test(q('since', 10)) ? q('since', 10) : null;

  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  const skipped: string[] = [];
  const have = { receipt: false, manual: false, photo: false };
  let total = 0;
  for (const [kind, url] of [['receipt', a.receiptUrl], ['manual', a.manualUrl], ['photo', a.photoUrl]] as const) {
    if (!url) continue;
    const f = await openBlob(url).catch(() => null);
    if (!f) { skipped.push(`${kind} (unavailable)`); continue; }
    const bytes = new Uint8Array(await new Response(f.stream).arrayBuffer());
    if (total + bytes.length > MAX_ZIP) { skipped.push(`${kind} (too large)`); continue; }
    total += bytes.length;
    files[`attachments/${kind}${extensionFor(url, f.blob.contentType)}`] = [bytes, { level: 0 }];
    have[kind] = true;
  }

  const letter = buildClaim({
    homeAddress: home?.address ?? null,
    asset: { name: a.name, make: a.make, model: a.model ?? a.makeModel, serialNumber: a.serialNumber, installDate: a.installDate, warrantyExpiry: a.warrantyExpiry, priceLabel: a.purchaseCents != null ? formatCurrency(a.purchaseCents, currency, locale) : null },
    issue: q('issue', 1500), issueSince: since, resolution,
    contact: { name: q('name', 120), phone: q('phone', 60), email: q('email', 160) },
    attachments: have, today: todayISO(),
  });
  const enc = new TextEncoder();
  files['claim-letter.txt'] = enc.encode(`Subject: ${letter.subject}\r\n\r\n${letter.body.replace(/\n/g, '\r\n')}\r\n`);
  const st = claimStatus(a.warrantyExpiry, todayISO());
  files['README.txt'] = enc.encode(
    `Warranty claim pack: ${a.name}\r\n\r\nclaim-letter.txt   paste into an e-mail or print\r\nattachments/       your saved receipt, manual and photo (attach these to your e-mail)\r\n` +
      (st.state === 'expired' ? '\r\nNote: the warranty on record has ended; the letter asks for help anyway.\r\n' : '') +
      (skipped.length ? `\r\nNot included: ${skipped.join(', ')}\r\n` : ''),
  );
  await audit({ id: user.id, email: user.email }, 'claim.pack', `Warranty claim pack for ${a.name}`);
  return new Response(zipSync(files) as unknown as BodyInit, {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="warranty-claim-${safeName(a.name)}.zip"`, 'Cache-Control': 'private, no-store' },
  });
}
