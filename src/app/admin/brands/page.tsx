import { asc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { brands } from '@/db/schema';
import { BrandsProvider } from '@/components/BrandsProvider';
import BrandAdmin from '@/components/BrandAdmin';
import PageHeader from '@/components/PageHeader';
import { defaultBrands } from '@/lib/brands';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Brands · Admin' };

export default async function AdminBrands() {
  // Read straight from the database (not the cache) so edits show up immediately.
  const rows = await db.select().from(brands).orderBy(asc(sql`lower(${brands.name})`)).catch(() => []);
  const list = rows.length ? rows.map((r) => ({ id: r.id, name: r.name, domain: r.domain, logoUrl: r.logoUrl })) : defaultBrands();
  return (
    <BrandsProvider brands={list}>
      <PageHeader title="Brands" subtitle={`${list.length} brands · shown in the asset brand picker, with their logos`} />
      <BrandAdmin brands={list} />
    </BrandsProvider>
  );
}
