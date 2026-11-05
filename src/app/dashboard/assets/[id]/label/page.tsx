import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { siteBaseUrl } from '@/lib/donate';
import { makeModelLabel } from '@/lib/brands';
import PageHeader from '@/components/PageHeader';
import PrintButton from '@/components/PrintButton';
import QrLabel from '@/components/QrLabel';
import { followAssetToItsHome } from '@/lib/asset-home';

export const metadata = { title: 'QR label' };
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default async function AssetLabel({ params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p;
  if (!isUuid(id)) notFound();
  const { user, household } = await requireHousehold();
  const [asset] = await db.select().from(assets).where(and(eq(assets.id, id), eq(assets.householdId, household.id)));
  if (!asset) {
    await followAssetToItsHome(user.id, id, `/dashboard/assets/${id}/label`);
    notFound();
  }
  const url = `${siteBaseUrl('')}/dashboard/assets/${asset.id}`;
  return (
    <>
      <div className="print:hidden">
        <Link href={`/dashboard/assets/${asset.id}`} className="mb-3 -ml-2 flex min-h-[44px] w-fit items-center gap-1 px-2 text-[17px] text-tint">
          <ArrowLeft className="h-5 w-5" aria-hidden /> {asset.name}
        </Link>
        <PageHeader title="QR label" subtitle="Stick it on the appliance. Scanning it opens this page for anyone signed in to your home." action={<PrintButton />} />
      </div>
      <QrLabel url={url} name={asset.name} detail={makeModelLabel(asset) || asset.category} big />
    </>
  );
}
