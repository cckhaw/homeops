import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { siteBaseUrl } from '@/lib/donate';
import { makeModelLabel } from '@/lib/brands';
import PageHeader from '@/components/PageHeader';
import PrintButton from '@/components/PrintButton';
import QrLabel from '@/components/QrLabel';

export const metadata = { title: 'QR labels' };

export default async function LabelsPage() {
  const { household } = await requireHousehold();
  const list = await db.select().from(assets).where(eq(assets.householdId, household.id)).orderBy(asc(assets.name));
  const base = siteBaseUrl('');
  return (
    <>
      <div className="print:hidden">
        <PageHeader title="QR labels" subtitle={`One sticker per asset in ${household.name}. Print on plain paper or sticker sheets and cut out.`} action={list.length ? <PrintButton label="Print all" /> : undefined} />
      </div>
      {list.length === 0 ? (
        <p className="text-[15px] text-secondary">Add an asset first, then come back to print its label.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-2">
          {list.map((a) => (
            <QrLabel key={a.id} url={`${base}/dashboard/assets/${a.id}`} name={a.name} detail={makeModelLabel(a) || a.category} />
          ))}
        </div>
      )}
    </>
  );
}
