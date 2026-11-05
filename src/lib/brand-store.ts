import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import { asc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { brands } from '@/db/schema';
import { defaultBrands, type BrandRecord } from '@/lib/brands';

export const BRANDS_TAG = 'brands';

const load = unstable_cache(
  async (): Promise<BrandRecord[]> => {
    const rows = await db.select().from(brands).orderBy(asc(sql`lower(${brands.name})`));
    return rows.map((r) => ({ id: r.id, name: r.name, domain: r.domain, logoUrl: r.logoUrl }));
  },
  ['brand-list'],
  { tags: [BRANDS_TAG], revalidate: 3600 },
);

/** Brand directory for rendering. Cached; falls back to the built-in list if the table is missing or unreachable. */
export async function getBrands(): Promise<BrandRecord[]> {
  try {
    const list = await load();
    return list.length ? list : defaultBrands();
  } catch {
    return defaultBrands();
  }
}

export const refreshBrands = () => revalidateTag(BRANDS_TAG);
