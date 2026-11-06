'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Plus, ScanLine, Loader2 } from 'lucide-react';
import BrandSelect from './BrandSelect';
import { canonicalBrand } from '@/lib/brands';
import { useBrands } from './BrandsProvider';
import { usePrefs } from './PrefsProvider';
import { Sheet } from './misc';
import { useServerForm } from './useServerForm';
import IconPicker from './IconPicker';
import AppleButton, { SubmitButton } from './AppleButton';
import {
  addServiceRecord,
  createAsset,
  createHome,
  createTask,
  saveSiteSettings,
  updateAsset,
  updateHousehold,
  saveLocale,
  addClimateTasks,
  updateProfile,
  updateTask,
  type FormState,
} from '@/app/actions';
import { CATEGORIES, FREQUENCIES, FREQUENCY_LABEL, todayISO } from '@/lib/utils';
import { CURRENCIES, LOCALES } from '@/lib/locale';
import { compressImage } from '@/lib/image';

export function Msg({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="px-1 text-[15px] text-bad">{state.error}</p>;
  if (state.ok) return <p role="status" className="px-1 text-[15px] text-ok">{state.ok}</p>;
  return null;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------- Asset form (+ receipt OCR)

type AssetInit = {
  purchase?: string | null;
  name?: string;
  category?: string;
  make?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  installDate?: string | null;
  warrantyExpiry?: string | null;
  notes?: string | null;
};

export function AssetForm({ assetId, initial = {}, hasPhoto }: { assetId?: string; initial?: AssetInit; hasPhoto?: boolean }) {
  const brands = useBrands();
  const { state, pending, formProps } = useServerForm(assetId ? updateAsset.bind(null, assetId) : createAsset);
  const [v, setV] = useState({
    name: initial.name ?? '',
    category: initial.category ?? CATEGORIES[0],
    make: initial.make ?? '',
    model: initial.model ?? '',
    serialNumber: initial.serialNumber ?? '',
    installDate: initial.installDate ?? '',
    warrantyExpiry: initial.warrantyExpiry ?? '',
    purchase: initial.purchase ?? '',
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
    <form {...formProps}
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
            className="file-input"
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

      <div className="rounded-2xl bg-label/5 p-4">
        <Field label={assetId ? 'Replace photo (optional)' : 'Photo of the item (optional)'}>
          <input
            name="photo"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const input = e.currentTarget;
              const f = input.files?.[0];
              if (!f) return;
              const small = await compressImage(f);
              if (small !== f) {
                const dt = new DataTransfer();
                dt.items.add(small);
                input.files = dt.files;
              }
            }}
            className="file-input"
          />
        </Field>
        {hasPhoto && (
          <label className="mt-2 flex min-h-[44px] items-center gap-3 text-[15px]">
            <input type="checkbox" name="removePhoto" className="h-5 w-5 accent-[rgb(var(--tint))]" /> Remove the current photo
          </label>
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
        <Field label="Purchase price (optional)">
          <input name="purchase" inputMode="decimal" className="input" placeholder="0.00" value={v.purchase} onChange={set('purchase')} />
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
          className="file-input"
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

export function ServiceForm({ assetId, contractors = [] }: { assetId: string; contractors?: { id: string; name: string; trade: string }[] }) {
  const { currency } = usePrefs();
  const { state, pending, formKey, formProps } = useServerForm(addServiceRecord.bind(null, assetId), { resetOnSuccess: true });
  return (
    <form key={formKey} {...formProps} className="space-y-3">
      <Field label="What was done?">
        <input name="description" required maxLength={500} className="input" placeholder="Replaced compressor" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Date">
          <input name="serviceDate" type="date" defaultValue={todayISO()} className="input" />
        </Field>
        <Field label="Contractor">
          <select name="contractorId" className="input" defaultValue="">
            <option value="">{contractors.length ? '— none / someone else —' : 'None saved yet'}</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.trade})</option>)}
          </select>
        </Field>
        <Field label={`Cost (${currency})`}>
          <input name="cost" inputMode="decimal" className="input" placeholder="0.00" />
        </Field>
      </div>
      <Field label="Provider, if not in your contractors">
        <input name="provider" maxLength={120} className="input" />
      </Field>
      <Msg state={state} />
      <SubmitButton variant="secondary" pending={pending}>Add service record</SubmitButton>
    </form>
  );
}

export function TaskForm({ assets, members }: { assets: { id: string; name: string }[]; members: { id: string; name: string }[] }) {
  const { state, pending, formKey, formProps } = useServerForm(createTask, { resetOnSuccess: true });
  return (
    <form key={formKey} {...formProps} className="space-y-3">
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
      {members.length > 1 && (
        <Field label="Assign to">
          <select name="assignedTo" defaultValue="" className="input">
            <option value="">Anyone in the household</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
      )}
      <Msg state={state} />
      <SubmitButton variant="secondary" pending={pending}>Add task</SubmitButton>
    </form>
  );
}

export function ProfileForm({ fullName, email }: { fullName: string | null; email: string }) {
  const { state, pending, formProps } = useServerForm(updateProfile);
  return (
    <form {...formProps} className="space-y-3">
      <Field label="Name">
        <input name="fullName" maxLength={120} defaultValue={fullName ?? ''} className="input" autoComplete="name" />
      </Field>
      <Field label="E-mail">
        <input value={email} readOnly disabled className="input opacity-60" />
      </Field>
      <Msg state={state} />
      <SubmitButton pending={pending}>Save profile</SubmitButton>
    </form>
  );
}

export function HouseholdForm({ name, address, disabled, currency, climate, icon, homeId }: { name: string; address: string | null; disabled?: boolean; currency: string; climate: string; icon: string; homeId?: string }) {
  const { state, pending: saving, formProps } = useServerForm(updateHousehold);
  const [tasksMsg, setTasksMsg] = useState<FormState>();
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-4">
      <form {...formProps} className="space-y-3">
        {homeId && <input type="hidden" name="homeId" value={homeId} />}
        <Field label="Home name">
          <input name="name" required maxLength={120} defaultValue={name} disabled={disabled} className="input" />
        </Field>
        {!disabled && (
          <div>
            <span className="field-label">Icon (shown in the menu)</span>
            <IconPicker value={icon} />
          </div>
        )}
        <Field label="Address (shown on your Home Passport)">
          <input name="address" maxLength={240} defaultValue={address ?? ''} disabled={disabled} className="input" autoComplete="street-address" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Currency for costs">
            <select name="currency" defaultValue={currency} disabled={disabled} className="input">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Climate (picks the seasonal tasks)">
            <select name="climate" defaultValue={climate} disabled={disabled} className="input">
              <option value="temperate">Four seasons (frost, furnace, gutters)</option>
              <option value="tropical">Tropical (heat, humidity, monsoon)</option>
            </select>
          </Field>
        </div>
        <Msg state={state} />
        {!disabled && <SubmitButton pending={saving}>Save home</SubmitButton>}
      </form>
      {!disabled && (
        <div className="border-t pt-4 hairline">
          <p className="mb-2 text-[14px] text-secondary">Changed the climate? Add the suggested seasonal tasks for it. Existing tasks are never touched.</p>
          <AppleButton type="button" variant="secondary" disabled={pending} onClick={() => startTransition(async () => setTasksMsg(await addClimateTasks(homeId)))}>
            Add suggested tasks
          </AppleButton>
          <div className="mt-2"><Msg state={tasksMsg} /></div>
        </div>
      )}
    </div>
  );
}

export function LocaleForm({ locale, detected }: { locale: string | null; detected: string }) {
  const { state, pending, formProps } = useServerForm(saveLocale);
  const label = LOCALES.find((l) => l.code === detected)?.label ?? detected;
  return (
    <form {...formProps} className="space-y-3">
      <Field label="Date and number format">
        <select name="locale" defaultValue={locale ?? ''} className="input">
          <option value="">Automatic (from your browser: {label})</option>
          {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </Field>
      <p className="px-1 text-[13px] text-secondary">Changes how dates and amounts are written. The app itself stays in English.</p>
      <Msg state={state} />
      <SubmitButton pending={pending}>Save</SubmitButton>
    </form>
  );
}

export function SiteSettingsForm(props: { unlimited: boolean; assetLimit: string; memberLimit: string }) {
  const { state, pending, formProps } = useServerForm(saveSiteSettings);
  return (
    <form {...formProps} className="space-y-5">
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
      <SubmitButton pending={pending}>Save settings</SubmitButton>
    </form>
  );
}

export function TaskEditForm({ task, assets, members = [], onDone }: { task: { id: string; title: string; dueDate: string; frequency: string; assetId: string | null; assignedTo?: string | null }; assets: { id: string; name: string }[]; members?: { id: string; name: string }[]; onDone: () => void }) {
  const { state, pending, formProps } = useServerForm(updateTask.bind(null, task.id));
  useEffect(() => {
    if (state?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form {...formProps} className="space-y-3">
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
      {members.length > 1 && (
        <Field label="Assign to">
          <select name="assignedTo" defaultValue={task.assignedTo ?? ''} className="input">
            <option value="">Anyone in the household</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
      )}
      <Msg state={state} />
      <SubmitButton full pending={pending}>Save task</SubmitButton>
    </form>
  );
}

export function HomeForm() {
  const { state, pending, formProps } = useServerForm(createHome);
  return (
    <form {...formProps} className="space-y-3">
      <Field label="Home name">
        <input name="name" required maxLength={120} className="input" placeholder="Lake cabin" />
      </Field>
      <div>
        <span className="field-label">Choose an icon</span>
        <IconPicker />
      </div>
      <Field label="Address (optional)">
        <input name="address" maxLength={240} className="input" autoComplete="street-address" />
      </Field>
      <Msg state={state} />
      <SubmitButton pending={pending}>Add home</SubmitButton>
    </form>
  );
}
