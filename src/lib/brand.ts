import 'server-only';
import { unstable_cache } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { brandAssets } from '@/db/schema';
import type { BrandKind } from '@/lib/brand-core';

export const BRAND_TAG = 'brand';
export type BrandMeta = { kind: BrandKind; contentType: string; bytes: number; width: number | null; height: number | null; rev: string; updatedAt: Date };

/** Which images are customised (metadata only — the image bytes are fetched on demand). Cached; admin changes clear it. Never throws. */
export const getBrandMeta = unstable_cache(
  async (): Promise<Partial<Record<BrandKind, Omit<BrandMeta, 'updatedAt'> & { updatedAt: string }>>> => {
    try {
      const rows = await db
        .select({ kind: brandAssets.kind, contentType: brandAssets.contentType, bytes: brandAssets.bytes, width: brandAssets.width, height: brandAssets.height, rev: brandAssets.rev, updatedAt: brandAssets.updatedAt })
        .from(brandAssets);
      return Object.fromEntries(rows.map((r) => [r.kind, { ...r, kind: r.kind as BrandKind, updatedAt: r.updatedAt.toISOString() }]));
    } catch {
      return {}; // table not migrated yet / database unreachable during a build: use the built-in images
    }
  },
  ['brand-meta'],
  { tags: [BRAND_TAG], revalidate: 3600 },
);

export const brandUrl = (kind: BrandKind, rev: string) => `/brand-asset/${kind}?v=${rev}`;

export async function siteBrand() {
  const m = await getBrandMeta();
  return { logo: m.logo ? brandUrl('logo', m.logo.rev) : null, icon: m.icon ? brandUrl('icon', m.icon.rev) : null, share: m.share ? brandUrl('share', m.share.rev) : null };
}

export async function readBrandAsset(kind: BrandKind) {
  try {
    const [r] = await db.select().from(brandAssets).where(eq(brandAssets.kind, kind)).limit(1);
    return r ? { contentType: r.contentType, bytes: Buffer.from(r.data, 'base64'), rev: r.rev } : null;
  } catch {
    return null;
  }
}
