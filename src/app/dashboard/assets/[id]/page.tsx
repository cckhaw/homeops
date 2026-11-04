import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq } from 'drizzle-orm';
import { ArrowLeft, BookOpen, FileText, Trash2 } from 'lucide-react';
import { db } from '@/db';
import { assets, maintenanceTasks, serviceRecords } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { deleteAsset, deleteServiceRecord } from '@/app/actions';
import { daysUntil, formatCurrency, formatDate, healthScore, warrantyState } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import MaintenanceRow from '@/components/MaintenanceRow';
import AppleButton, { SubmitButton } from '@/components/AppleButton';
import { AssetForm, ServiceForm } from '@/components/forms';

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default async function AssetDetail({ params }: { params: { id: string } }) {
  if (!isUuid(params.id)) notFound();
  const { household } = await requireHousehold();
  const [asset] = await db.select().from(assets).where(and(eq(assets.id, params.id), eq(assets.householdId, household.id)));
  if (!asset) notFound();

  const [records, tasks] = await Promise.all([
    db.select().from(serviceRecords).where(eq(serviceRecords.assetId, asset.id)).orderBy(desc(serviceRecords.serviceDate)),
    db.select().from(maintenanceTasks).where(eq(maintenanceTasks.assetId, asset.id)).orderBy(asc(maintenanceTasks.dueDate)),
  ]);
  const pending = tasks.filter((t) => t.status === 'pending');
  const done = tasks.filter((t) => t.status === 'completed').slice(-5).reverse();
  const overdue = pending.filter((t) => (daysUntil(t.dueDate) ?? 0) < 0).length;
  const health = healthScore({ installDate: asset.installDate, warrantyExpiry: asset.warrantyExpiry, overdueTasks: overdue });
  const warranty = warrantyState(asset.warrantyExpiry);
  const tone = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', none: 'text-secondary' }[warranty.tone];

  const removeAsset = deleteAsset.bind(null, asset.id);

  return (
    <>
      <Link href="/dashboard/assets" className="mb-3 -ml-2 flex min-h-[44px] w-fit items-center gap-1 px-2 text-[17px] text-tint">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Assets
      </Link>
      <h1 className="large-title">{asset.name}</h1>
      <p className="mb-5 text-[15px] text-secondary">{asset.category}{asset.makeModel ? ` · ${asset.makeModel}` : ''}</p>

      <GlassCard className="mb-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <Fact label="Health" value={`${health.score}/100`} className={{ ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }[health.tone]} />
        <Fact label="Warranty" value={warranty.label} className={tone} />
        <Fact label="Installed" value={formatDate(asset.installDate)} />
        <Fact label="Serial" value={asset.serialNumber ?? '—'} />
      </GlassCard>

      <Section title="Documents">
        <GlassCard className="flex flex-wrap gap-3">
          {asset.receiptUrl ? <AppleButton href={asset.receiptUrl} variant="secondary"><FileText className="h-4 w-4" aria-hidden /> Receipt</AppleButton> : <span className="text-[15px] text-secondary">No receipt uploaded.</span>}
          {asset.manualUrl && <AppleButton href={asset.manualUrl} variant="secondary"><BookOpen className="h-4 w-4" aria-hidden /> Manual</AppleButton>}
        </GlassCard>
      </Section>

      <Section title="Maintenance">
        <GlassCard className="py-2">
          {pending.length + done.length === 0 ? (
            <p className="py-4 text-[15px] text-secondary">No tasks linked to this asset.</p>
          ) : (
            <ul className="divide-y hairline [&>li]:border-inherit">
              {pending.map((t) => <MaintenanceRow key={t.id} id={t.id} title={t.title} dueDate={t.dueDate} frequency={t.frequency} completed={false} />)}
              {done.map((t) => <MaintenanceRow key={t.id} id={t.id} title={t.title} dueDate={t.dueDate} frequency={t.frequency} completed completedAt={t.completedAt?.toISOString()} canDelete={false} />)}
            </ul>
          )}
        </GlassCard>
      </Section>

      <Section title="Service history">
        <GlassCard className="space-y-5">
          {records.length === 0 ? (
            <p className="text-[15px] text-secondary">No service recorded yet.</p>
          ) : (
            <ul className="divide-y hairline [&>li]:border-inherit">
              {records.map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px]">{r.description}</p>
                    <p className="text-[13px] text-secondary">{formatDate(r.serviceDate)}{r.provider ? ` · ${r.provider}` : ''}{r.costCents != null ? ` · ${formatCurrency(r.costCents)}` : ''}</p>
                  </div>
                  <form action={deleteServiceRecord.bind(null, r.id, asset.id)}>
                    <button aria-label="Delete service record" className="grid h-11 w-11 place-items-center rounded-xl text-secondary hover:text-bad"><Trash2 className="h-[18px] w-[18px]" aria-hidden /></button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <ServiceForm assetId={asset.id} />
        </GlassCard>
      </Section>

      <Section title="Edit details">
        <GlassCard><AssetForm assetId={asset.id} initial={{ name: asset.name, category: asset.category, makeModel: asset.makeModel, serialNumber: asset.serialNumber, installDate: asset.installDate, warrantyExpiry: asset.warrantyExpiry, notes: asset.notes }} /></GlassCard>
      </Section>

      <form action={removeAsset} className="mt-8">
        <SubmitButton variant="destructive" full>Delete asset</SubmitButton>
      </form>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-[22px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-secondary">{label}</p>
      <p className={`break-words text-[15px] font-semibold ${className ?? ''}`}>{value}</p>
    </div>
  );
}
