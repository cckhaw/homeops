'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, brands } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { brandKey, normalizeDomain } from '@/lib/brands';
import { refreshBrands } from '@/lib/brand-store';
import { uploadLogo } from '@/lib/storage';
import { deleteBlobs } from '@/lib/blob';
import { audit } from '@/lib/audit';

export type BrandState = { error?: string; ok?: string } | undefined;

const str = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? '').trim().slice(0, max);

const touch = () => {
  refreshBrands();
  revalidatePath('/admin/brands');
  revalidatePath('/dashboard', 'layout');
};

/** Deletes a previously uploaded logo from storage (best effort; only our own uploads). */
async function dropLogoFile(url: string | null | undefined) {
  if (url && url.includes('brand-logos/')) await deleteBlobs([url]);
}

/** Creates (id = '') or updates a brand: name, website domain, and logo (upload, link, or remove). */
export async function saveBrand(id: string, _: BrandState, fd: FormData): Promise<BrandState> {
  const admin = await requireAdmin();
  const name = str(fd, 'name', 60);
  if (!name) return { error: 'Enter the brand name.' };
  const key = brandKey(name);
  if (!key) return { error: 'The brand name needs letters or numbers.' };

  const domainRaw = str(fd, 'domain', 200);
  const domain = normalizeDomain(domainRaw);
  if (domainRaw && !domain) return { error: 'That website address does not look right. Use something like lg.com.' };

  const linkRaw = str(fd, 'logoLink', 500);
  if (linkRaw && !/^https:\/\/[^\s]+$/i.test(linkRaw)) return { error: 'The logo link must start with https://' };

  const [existing] = id ? await db.select().from(brands).where(eq(brands.id, id)) : [];
  if (id && !existing) return { error: 'That brand no longer exists.' };
  const [clash] = await db.select({ id: brands.id }).from(brands).where(eq(brands.nameKey, key));
  if (clash && clash.id !== id) return { error: 'A brand with that name already exists.' };

  // Logo precedence: new upload > pasted link > "remove" > keep what is there.
  const file = fd.get('logoFile');
  const upload = await uploadLogo(file instanceof File ? file : null);
  if (upload.error) return { error: upload.error };
  let logoUrl: string | null = existing?.logoUrl ?? null;
  if (upload.url) logoUrl = upload.url;
  else if (linkRaw) logoUrl = linkRaw;
  else if (fd.get('removeLogo') === 'on') logoUrl = null;

  if (!domain && !logoUrl) return { error: 'Add a website address (the logo is found automatically) or provide a logo image.' };

  if (existing) {
    await db.update(brands).set({ name, nameKey: key, domain, logoUrl, updatedAt: new Date() }).where(eq(brands.id, id));
    if (existing.logoUrl && existing.logoUrl !== logoUrl) await dropLogoFile(existing.logoUrl);
    // Keep existing assets attached to the brand if it was renamed.
    if (existing.name !== name) await db.update(assets).set({ make: name }).where(sql`lower(${assets.make}) = lower(${existing.name})`);
  } else {
    await db.insert(brands).values({ name, nameKey: key, domain, logoUrl });
  }
  await audit(admin, existing ? 'brand.update' : 'brand.create', existing && existing.name !== name ? `Brand “${existing.name}” → “${name}”` : `${existing ? 'Updated' : 'Added'} brand “${name}”`);
  touch();
  return { ok: existing ? 'Brand updated.' : 'Brand added.' };
}

export async function deleteBrand(id: string) {
  const admin = await requireAdmin();
  const [b] = await db.select().from(brands).where(eq(brands.id, id));
  if (!b) return;
  await db.delete(brands).where(eq(brands.id, id));
  await dropLogoFile(b.logoUrl);
  await audit(admin, 'brand.delete', `Deleted brand “${b.name}”`);
  touch();
}

/** Restores any built-in brands that are missing (never overwrites or removes your edits). */
export async function restoreDefaultBrands(): Promise<BrandState> {
  const admin = await requireAdmin();
  const { defaultBrands } = await import('@/lib/brands');
  const rows = defaultBrands().map((b) => ({ name: b.name, nameKey: brandKey(b.name), domain: b.domain, logoUrl: null }));
  const inserted = await db.insert(brands).values(rows).onConflictDoNothing().returning({ id: brands.id });
  await audit(admin, 'brand.restore', `Restored ${inserted.length} built-in brand(s)`);
  touch();
  return { ok: inserted.length ? `Restored ${inserted.length} missing brand${inserted.length === 1 ? '' : 's'}.` : 'Nothing to restore — every built-in brand is already in the list.' };
}
