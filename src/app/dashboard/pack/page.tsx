import { redirect } from 'next/navigation';
import { FileArchive, ShieldAlert } from 'lucide-react';
import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import PackOptions from '@/components/PackOptions';

export const metadata = { title: 'Move-out pack' };

export default async function PackPage() {
  const { household, role } = await requireHousehold();
  if (role !== 'owner' && role !== 'admin') redirect('/dashboard/more');
  return (
    <>
      <PageHeader title="Move-out pack" subtitle={`Everything about ${household.name} for a buyer, agent or tenant`} />
      <GlassCard className="mb-5 space-y-3">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tint/10 text-tint"><FileArchive className="h-6 w-6" aria-hidden /></span>
          <p className="text-[15px] text-secondary">A single zip with a printable summary (save it as PDF), spreadsheets of your assets and service history, and every receipt, manual and photo you stored. Nothing is uploaded anywhere — it downloads straight to your device.</p>
        </div>
      </GlassCard>
      <PackOptions />
      <p className="mt-4 flex items-start gap-2 text-[13px] text-secondary">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Only home owners and admins can create a pack. Think before including vault documents or contractors — they can contain personal details. Household members&apos; e-mail addresses are never included.
      </p>
    </>
  );
}
