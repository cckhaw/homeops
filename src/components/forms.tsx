'use client';

import { useEffect, useRef, useState, useActionState, useTransition } from 'react';
import { Plus, ScanLine, Loader2 } from 'lucide-react';
import BrandSelect from './BrandSelect';
import { canonicalBrand } from '@/lib/brands';
import { useBrands } from './BrandsProvider';
import { Sheet } from './misc';
import AppleButton, { SubmitButton } from './AppleButton';
import {
  addServiceRecord,
  createAsset,
  createHome,
  createTask,
  saveSiteSettings,
  updateAsset,
  updateHousehold,
  updateProfile,
  updateTask,
  type FormState,
} from '@/app/actions';
import { CATEGORIES, FREQUENCIES, FREQUENCY_LABEL, todayISO } from '@/lib/utils';

export function Msg({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="px-1 text-[15px] text-bad">{state.error}</p>;
  if (state.ok) return <p role="status" className="px-1 text-[15px] text-ok">{state.ok}</p>;
  return null;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------- Asset form (+ receipt OCR)

type AssetInit = {
  name?: string;
  category?: string;
  make?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  installDate?: string | null;
  warrantyExpiry?: string | null;
  notes?: string | null;
};

export function AssetForm({ assetId, initial = {} }: { assetId?: string; initial?: AssetInit }) {
  const brands = useBrands();
  const [state, action, pending] = useActionState(assetId ? updateAsset.bind(null, assetId) : createAsset, undefined);
  const [, startTransition] = useTransition();
  const [v, setV] = useState({
    name: initial.name ?? '',
    category: initial.category ?? CATEGORIES[0],
    make: initial.make ?? '',
    model: initial.model ?? '',
    serialNumber: initial.serialNumber ?? '',
    installDate: initial.installDate ?? '',
    warrantyExpiry: initial.warrantyExpiry ?? '',
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [hasFile, setHasFile] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<{ error?: string; ok?: string }>();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  async function scan() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanMsg(undefined);
    try {
      const body = new FormData();
      body.set('receipt', file);
      const res = await fetch('/api/ocr', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Scan failed');
      setV((p) => ({
        ...p,
        name: p.name || data.name || '',
        category: (CATEGORIES as readonly string[]).includes(data.category) ? data.category : p.category,
        make: p.make || canonicalBrand(brands, data.make) || data.make || '',
        model: p.model || data.model || '',
        serialNumber: p.serialNumber || data.serialNumber || '',
        installDate: p.installDate || data.purchaseDate || '',
        warrantyExpiry: p.warrantyExpiry || data.warrantyExpiry || '',
      }));
      setScanMsg({ ok: 'Receipt scanned — please review the details below.' });
    } catch (e) {
      setScanMsg({ error: e instanceof Error ? e.message : 'Scan failed' });
    } finally {
      setScanning(false);
    }
  }

  return (
    // Submitted via a transition (not the form `action` prop) so React 19 does not wipe the user's input
    // (notes, chosen files) when the server returns a validation error.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
    >
      <div className="glass rounded-2xl p-4">
        <Field label={assetId ? 'Replace receipt (JPG, PNG, PDF)' : 'Receipt (optional — we can read it for you)'}>
          <input
            ref={fileRef}
            name="receipt"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              setHasFile(!!e.target.files?.length);
              setScanMsg(undefined);
            }}
            className="block w-full text-[15px] file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-tint/10 file:px-4 file:font-semibold file:text-tint"
          />
        </Field>
        {hasFile && (
          <div className="mt-3 flex items-center gap-3">
            <AppleButton type="button" variant="secondary" onClick={scan} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ScanLine className="h-4 w-4" aria-hidden />}
              Scan receipt
            </AppleButton>
            <Msg state={scanMsg} />
          </div>
        )}
      </div>

      <Field label="Name">
        <input name="name" required maxLength={120} className="input" placeholder="Kitchen refrigerator" value={v.name} onChange={set('name')} />
      </Field>
      <Field label="Category">
        <select name="category" className="input" value={v.category} onChange={set('category')}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="field-label">Make (brand)</span>
          <BrandSelect value={v.make} onChange={(make) => setV((p) => ({ ...p, make }))} />
        </div>
        <Field label="Model">
          <input name="model" maxLength={120} className="input" placeholder="LRMVS3006S" value={v.model} onChange={set('model')} />
        </Field>
        <Field label="Serial number">
          <input name="serialNumber" maxLength={120} className="input" value={v.serialNumber} onChange={set('serialNumber')} />
        </Field>
        <Field label="Install / purchase date">
          <input name="installDate" type="date" className="input" value={v.installDate} onChange={set('installDate')} />
        </Field>
        <Field label="Warranty expires">
          <input name="warrantyExpiry" type="date" className="input" value={v.warrantyExpiry} onChange={set('warrantyExpiry')} />
        </Field>
      </div>
      <Field label={assetId ? 'Replace manual (PDF)' : 'Manual (PDF, optional)'}>
        <input
          name="manual"
          type="file"
          accept="application/pdf,image/*"
          className="block w-full text-[15px] file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-tint/10 file:px-4 file:font-semibold file:text-tint"
        />
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={3} maxLength={2000} defaultValue={initial.notes ?? ''} className="input" />
      </Field>
      <Msg state={state} />
      <AppleButton type="submit" full disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {assetId ? 'Save changes' : 'Add to passport'}
      </AppleButton>
    </form>
  );
}

/** "Add asset" button that opens the form in a bottom sheet. */
export function AddAssetSheet() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AppleButton onClick={() => setOpen(true)}>
        <Plus className="h-5 w-5" aria-hidden /> Add asset
      </AppleButton>
      <Sheet title="New asset" open={open} onClose={() => setOpen(false)}>
        <AssetForm />
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------- Other forms

export function ServiceForm({ assetId }: { assetId: string }) {
  const [state, action] = useActionState(addServiceRecord.bind(null, assetId), undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="What was done?">
        <input name="description" required maxLength={500} className="input" placeholder="Replaced compressor" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Date">
          <input name="serviceDate" type="date" defaultValue={todayISO()} className="input" />
        </Field>
        <Field label="Provider">
          <input name="provider" maxLength={120} className="input" />
        </Field>
        <Field label="Cost (USD)">
          <input name="cost" inputMode="decimal" className="input" placeholder="0.00" />
        </Field>
      </div>
      <Msg state={state} />
      <SubmitButton variant="secondary">Add service record</SubmitButton>
    </form>
  );
}

export function TaskForm({ assets }: { assets: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createTask, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Task">
        <input name="title" required maxLength={160} className="input" placeholder="Replace water filter" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="First due">
          <input name="dueDate" type="date" required defaultValue={todayISO()} className="input" />
        </Field>
        <Field label="Repeats">
          <select name="frequency" defaultValue="yearly" className="input">
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>
            ))}
          </select>
        </Field>
        <Field label="Asset (optional)">
          <select name="assetId" defaultValue="" className="input">
            <option value="">None</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Msg state={state} />
      <SubmitButton variant="secondary">Add task</SubmitButton>
    </form>
  );
}

export function ProfileForm({ fullName, email }: { fullName: string | null; email: string }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Name">
        <input name="fullName" maxLength={120} defaultValue={fullName ?? ''} className="input" autoComplete="name" />
      </Field>
      <Field label="E-mail">
        <input value={email} readOnly disabled className="input opacity-60" />
      </Field>
      <Msg state={state} />
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}

export function HouseholdForm({ name, address, disabled }: { name: string; address: string | null; disabled?: boolean }) {
  const [state, action] = useActionState(updateHousehold, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Home name">
        <input name="name" required maxLength={120} defaultValue={name} disabled={disabled} className="input" />
      </Field>
      <Field label="Address (shown on your Home Passport)">
        <input name="address" maxLength={240} defaultValue={address ?? ''} disabled={disabled} className="input" autoComplete="street-address" />
      </Field>
      <Msg state={state} />
      {!disabled && <SubmitButton>Save home</SubmitButton>}
    </form>
  );
}

export function SiteSettingsForm(props: { unlimited: boolean; assetLimit: string; memberLimit: string }) {
  const [state, action] = useActionState(saveSiteSettings, undefined);
  return (
    <form action={action} className="space-y-5">
      <label className="flex min-h-[44px] items-center justify-between gap-4">
        <span>
          <span className="block text-[17px] font-semibold">Unlimited free tier</span>
          <span className="block text-[13px] text-secondary">Remove all asset and member limits for free households.</span>
        </span>
        <input type="checkbox" name="unlimited_free_tier" defaultChecked={props.unlimited} className="h-7 w-12 shrink-0 cursor-pointer accent-[rgb(var(--tint))]" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Free asset limit (per home)">
          <input name="free_asset_limit" type="number" min={1} defaultValue={props.assetLimit} className="input" />
        </Field>
        <Field label="Free member limit (per home)">
          <input name="free_member_limit" type="number" min={1} defaultValue={props.memberLimit} className="input" />
        </Field>
      </div>
      <p className="text-[13px] text-secondary">Limits apply only while the unlimited switch is off. Changes take effect immediately.</p>
      <Msg state={state} />
      <SubmitButton>Save settings</SubmitButton>
    </form>
  );
}

export function TaskEditForm({ task, assets, onDone }: { task: { id: string; title: string; dueDate: string; frequency: string; assetId: string | null }; assets: { id: string; name: string }[]; onDone: () => void }) {
  const [state, action] = useActionState(updateTask.bind(null, task.id), undefined);
  useEffect(() => {
    if (state?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form action={action} className="space-y-3">
      <Field label="Task">
        <input name="title" required maxLength={160} defaultValue={task.title} className="input" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Due date">
          <input name="dueDate" type="date" required defaultValue={task.dueDate} className="input" />
        </Field>
        <Field label="Repeats">
          <select name="frequency" defaultValue={task.frequency} className="input">
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Asset (optional)">
        <select name="assetId" defaultValue={task.assetId ?? ''} className="input">
          <option value="">None</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </Field>
      <Msg state={state} />
      <SubmitButton full>Save task</SubmitButton>
    </form>
  );
}

export function HomeForm() {
  const [state, action] = useActionState(createHome, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Home name">
        <input name="name" required maxLength={120} className="input" placeholder="Lake cabin" />
      </Field>
      <Field label="Address (optional)">
        <input name="address" maxLength={240} className="input" autoComplete="street-address" />
      </Field>
      <Msg state={state} />
      <SubmitButton>Add home</SubmitButton>
    </form>
  );
}
