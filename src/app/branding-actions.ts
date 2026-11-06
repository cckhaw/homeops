'use server';

import { createHash } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { brandAssets } from '@/db/schema';
import { audit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { BRAND_RULES, checkBrandUpload, isBrandKind } from '@/lib/brand-core';
import { BRAND_TAG } from '@/lib/brand';

type FormState = { error?: string; ok?: string } | undefined;

function refresh() {
  revalidateTag(BRAND_TAG);
  revalidatePath('/', 'layout');
}

export async function uploadBrandAsset(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const kind = String(fd.get('kind') ?? '');
  if (!isBrandKind(kind)) return { error: 'Unknown image type.' };
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a file to upload.' };
  if (file.size > BRAND_RULES[kind].maxBytes * 2) return { error: `That file is too large for the ${BRAND_RULES[kind].label.toLowerCase()}.` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkBrandUpload(kind, bytes);
  if (!check.ok) return { error: check.error };
  const rev = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const row = { kind, contentType: check.contentType, data: Buffer.from(bytes).toString('base64'), bytes: bytes.length, width: check.info.width, height: check.info.height, rev, updatedBy: admin.id, updatedAt: new Date() };
  await db.insert(brandAssets).values(row).onConflictDoUpdate({ target: brandAssets.kind, set: row });
  await audit(admin, 'brand.upload', `Uploaded custom ${kind} (${check.info.type}, ${Math.round(bytes.length / 1024)} KB)`);
  refresh();
  revalidatePath('/admin/branding');
  return { ok: `${BRAND_RULES[kind].label} updated. It is live on the site now; browsers pick up a new favicon within a day.` };
}

export async function resetBrandAsset(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const kind = String(fd.get('kind') ?? '');
  if (!isBrandKind(kind)) return { error: 'Unknown image type.' };
  await db.delete(brandAssets).where(eq(brandAssets.kind, kind));
  await audit(admin, 'brand.reset', `Reset ${kind} to the built-in Wodejia image`);
  refresh();
  revalidatePath('/admin/branding');
  return { ok: `${BRAND_RULES[kind].label} reset to the Wodejia default.` };
}
