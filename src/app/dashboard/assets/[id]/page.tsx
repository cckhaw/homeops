import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq } from 'drizzle-orm';
import { ArrowLeft, BookOpen, FileText, QrCode, ShieldAlert, Trash2 } from 'lucide-react';
import { db } from '@/db';
import { assets, maintenanceTasks, serviceRecords } from '@/db/schema';
import { contractorsForHome } from '@/lib/contractors';
import { followAssetToItsHome } from '@/lib/asset-home';
import { requireHousehold } from '@/lib/auth';
import { getPrefs } from '@/lib/prefs';
import { listMembers } from '@/lib/household';
import { deleteAsset, deleteServiceRecord } from '@/app/actions';
import { daysUntil, formatCurrency, formatDate, healthScore, warrantyState } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import MaintenanceRow from '@/components/MaintenanceRow';
import AppleButton, { SubmitButton } from '@/components/AppleButton';
import { AssetForm, ServiceForm } from '@/components/forms';
import BrandLogo from '@/components/BrandLogo';
import { makeModelLabel } from '@/lib/brands';

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default async function AssetDetail({ params: p }: { params: Promise<{ id: string }> }) {
  const params = await p;
  if (!isUuid(params.id)) notFound();
  const { user, household } = await requireHousehold();
  const { locale, currency } = await getPrefs();
  const [asset] = await db.select().from(assets).where(and(eq(assets.id, params.id), eq(assets.householdId, household.id)));
  if (!asset) {
    await followAssetToItsHome(user.id, params.id, `/dashboard/assets/${params.id}`); // e.g. a QR sticker for an asset in another of my homes
    notFound();
  }

  const [records, tasks, allAssets, members, homeContractors] = await Promise.all([
    db.select().from(serviceRecords).where(eq(serviceRecords.assetId, asset.id)).orderBy(desc(serviceRecords.serviceDate)),
    db.select().from(maintenanceTasks).where(eq(maintenanceTasks.assetId, asset.id)).orderBy(asc(maintenanceTasks.dueDate)),
    db.select({ id: assets.id, name: assets.name }).from(assets).where(eq(assets.householdId, household.id)).orderBy(asc(assets.name)),
    listMembers(household.id),
    contractorsForHome(household.id),
  ]);
  const people = new Map(members.map((m) => [m.id, m.name]));
  const editAssets = allAssets;
  const pending = tasks.filter((t) => t.status === 'pending');
  const done = tasks.filter((t) => t.status === 'completed').slice(-5).reverse();
  const overdue = pending.filter((t) => (daysUntil(t.dueDate) ?? 0) < 0).length;
  const health = healthScore({ installDate: asset.installDate, warrantyExpiry: asset.warrantyExpiry, overdueTasks: overdue });
  const warranty = warrantyState(asset.warrantyExpiry, locale);
  const tone = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', none: 'text-secondary' }[warranty.tone];

  const removeAsset = deleteAsset.bind(null, asset.id);

  return (
    <>
      <Link href="/dashboard/assets" className="mb-3 -ml-2 flex min-h-[44px] w-fit items-center gap-1 px-2 text-[17px] text-tint">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Assets
      </Link>
      {asset.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/files/${asset.id}/photo`} alt={`Photo of ${asset.name}`} className="mb-4 max-h-72 w-full rounded-apple object-cover ring-1 ring-black/10" />
      )}
      <div className="mb-5 flex items-center gap-4">
        <BrandLogo make={asset.make} size={64} />
        <div className="min-w-0">
          <h1 className="large-title">{asset.name}</h1>
          <p className="text-[15px] text-secondary">{asset.category}{makeModelLabel(asset) ? ` · ${makeModelLabel(asset)}` : ''}</p>
        </div>
      </div>

      <GlassCard className="mb-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <Fact label="Health" value={`${health.score}/100`} className={{ ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }[health.tone]} />
        <Fact label="Warranty" value={warranty.label} className={tone} />
        <Fact label="Installed" value={formatDate(asset.installDate, undefined, locale)} />
        <Fact label="Serial" value={asset.serialNumber ?? '—'} />
        {asset.purchaseCents != null && <Fact label="Purchase price" value={formatCurrency(asset.purchaseCents, currency, locale)} />}
      </GlassCard>

      <div className="grid grid-cols-1 items-start gap-x-8 xl:grid-cols-2">
      <div>
      <Section title="Documents">
        <GlassCard className="flex flex-wrap gap-3">
          {asset.receiptUrl ? <AppleButton href={`/api/files/${asset.id}/receipt`} variant="secondary"><FileText className="h-4 w-4" aria-hidden /> Receipt</AppleButton> : <span className="text-[15px] text-secondary">No receipt uploaded.</span>}
          {asset.manualUrl && <AppleButton href={`/api/files/${asset.id}/manual`} variant="secondary"><BookOpen className="h-4 w-4" aria-hidden /> Manual</AppleButton>}
          <AppleButton href={`/dashboard/assets/${asset.id}/label`} variant="secondary"><QrCode className="h-4 w-4" aria-hidden /> QR label</AppleButton>
          <AppleButton href={`/dashboard/assets/${asset.id}/claim`} variant="secondary"><ShieldAlert className="h-4 w-4" aria-hidden /> Claim warranty</AppleButton>
        </GlassCard>
      </Section>

      <Section title="Maintenance">
        <GlassCard className="py-2">
          {pending.length + done.length === 0 ? (
            <p className="py-4 text-[15px] text-secondary">No tasks linked to this asset.</p>
          ) : (
            <ul className="divide-y hairline [&>li]:border-inherit">
              {pending.map((t) => <MaintenanceRow key={t.id} id={t.id} title={t.title} dueDate={t.dueDate} frequency={t.frequency} completed={false} assetId={t.assetId} assignedTo={t.assignedTo} assigneeName={t.assignedTo ? people.get(t.assignedTo) : null} members={members} assets={editAssets} />)}
              {done.map((t) => <MaintenanceRow key={t.id} id={t.id} title={t.title} dueDate={t.dueDate} frequency={t.frequency} completed completedAt={t.completedAt?.toISOString()} completedByName={t.completedBy ? people.get(t.completedBy) : null} canDelete={false} />)}
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
                    <p className="text-[13px] text-secondary">{formatDate(r.serviceDate, undefined, locale)}{r.provider ? ` · ${r.provider}` : ''}{r.costCents != null ? ` · ${formatCurrency(r.costCents, currency, locale)}` : ''}</p>
                  </div>
                  <form action={deleteServiceRecord.bind(null, r.id, asset.id)}>
                    <button aria-label="Delete service record" className="grid h-11 w-11 place-items-center rounded-xl text-secondary hover:text-bad"><Trash2 className="h-[18px] w-[18px]" aria-hidden /></button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <ServiceForm assetId={asset.id} contractors={homeContractors} />
        </GlassCard>
      </Section>

      </div>
      <div>
      <Section title="Edit details">
        <GlassCard><AssetForm assetId={asset.id} hasPhoto={!!asset.photoUrl} initial={{ name: asset.name, category: asset.category, make: asset.make ?? null, model: asset.model ?? asset.makeModel, serialNumber: asset.serialNumber, installDate: asset.installDate, warrantyExpiry: asset.warrantyExpiry, purchase: asset.purchaseCents != null ? (asset.purchaseCents / 100).toFixed(2) : '', notes: asset.notes }} /></GlassCard>
      </Section>

      <form action={removeAsset} className="mt-2">
        <SubmitButton variant="destructive" full>Delete asset</SubmitButton>
      </form>
      </div>
      </div>
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
