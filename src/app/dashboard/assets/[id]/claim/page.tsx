import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { getPrefs } from '@/lib/prefs';
import { formatCurrency, todayISO } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import ClaimBuilder from '@/components/ClaimBuilder';

export const metadata = { title: 'Warranty claim' };

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default async function ClaimPage({ params: p }: { params: Promise<{ id: string }> }) {
  const { id } = await p;
  if (!isUuid(id)) notFound();
  const { user, household } = await requireHousehold();
  const { locale, currency } = await getPrefs();
  const [a] = await db.select().from(assets).where(and(eq(assets.id, id), eq(assets.householdId, household.id)));
  if (!a) notFound();
  return (
    <>
      <Link href={`/dashboard/assets/${a.id}`} className="mb-3 -ml-2 flex min-h-[44px] w-fit items-center gap-1 px-2 text-[17px] text-tint print:hidden">
        <ArrowLeft className="h-5 w-5" aria-hidden /> {a.name}
      </Link>
      <div className="print:hidden"><PageHeader title="Warranty claim" subtitle="Write the claim, then send it. Nothing is sent from here." /></div>
      <ClaimBuilder
        assetId={a.id}
        homeAddress={household.address}
        asset={{ name: a.name, make: a.make, model: a.model ?? a.makeModel, serialNumber: a.serialNumber, installDate: a.installDate, warrantyExpiry: a.warrantyExpiry, priceLabel: a.purchaseCents != null ? formatCurrency(a.purchaseCents, currency, locale) : null }}
        attachments={{ receipt: !!a.receiptUrl, manual: !!a.manualUrl, photo: !!a.photoUrl }}
        contact={{ name: user.fullName ?? '', email: user.email }}
        today={todayISO()}
      />
    </>
  );
}
