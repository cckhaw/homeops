'use client';

import { useServerForm } from './useServerForm';
import { Field, Msg } from './forms';
import { SubmitButton } from './AppleButton';
import { addContractor, addDocument, saveBill, updateContractor, updateDocument } from '@/app/records-actions';
import { DOCUMENT_CATEGORIES } from '@/lib/documents-core';
import { UTILITY_KINDS } from '@/lib/utilities-core';

export const TRADES = ['Plumber', 'Electrician', 'Air-con technician', 'Handyman', 'Pest control', 'Cleaner', 'Painter', 'Roofer', 'Locksmith', 'Gardener', 'Appliance repair', 'Other'];

type ContractorInit = { name?: string; trade?: string; phone?: string | null; email?: string | null; notes?: string | null };

export function ContractorForm({ id, initial = {} }: { id?: string; initial?: ContractorInit }) {
  const { state, pending, formKey, formProps } = useServerForm(id ? updateContractor.bind(null, id) : addContractor, { resetOnSuccess: !id });
  return (
    <form key={formKey} {...formProps} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><input name="name" required maxLength={120} defaultValue={initial.name} className="input" placeholder="Ah Seng Plumbing" /></Field>
        <Field label="Trade">
          <input name="trade" required maxLength={60} list="trades" defaultValue={initial.trade} className="input" placeholder="Plumber" />
          <datalist id="trades">{TRADES.map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <Field label="Phone / WhatsApp"><input name="phone" type="tel" inputMode="tel" maxLength={40} defaultValue={initial.phone ?? ''} className="input" placeholder="+60 12-345 6789" /></Field>
        <Field label="E-mail"><input name="email" type="email" maxLength={200} defaultValue={initial.email ?? ''} className="input" /></Field>
      </div>
      <Field label="Notes"><textarea name="notes" maxLength={1000} rows={2} defaultValue={initial.notes ?? ''} className="input" placeholder="Rates, which jobs, how they were found…" /></Field>
      <Msg state={state} />
      <SubmitButton disabled={pending}>{id ? 'Save changes' : 'Add contractor'}</SubmitButton>
    </form>
  );
}

type DocInit = { title?: string; category?: string; expiresOn?: string | null; notes?: string | null };

export function DocumentForm({ id, initial = {} }: { id?: string; initial?: DocInit }) {
  const { state, pending, formKey, formProps } = useServerForm(id ? updateDocument.bind(null, id) : addDocument, { resetOnSuccess: !id });
  return (
    <form key={formKey} {...formProps} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title"><input name="title" required maxLength={160} defaultValue={initial.title} className="input" placeholder="Home insurance 2025" /></Field>
        <Field label="Category">
          <select name="category" defaultValue={initial.category ?? DOCUMENT_CATEGORIES[0]} className="input">
            {DOCUMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Expires (optional — we remind you)"><input name="expiresOn" type="date" defaultValue={initial.expiresOn ?? ''} className="input" /></Field>
        <Field label={id ? 'Replace file (PDF or photo)' : 'File (PDF or photo, up to 10 MB)'}>
          <input name="file" type="file" required={!id} accept="image/*,application/pdf" className="block w-full text-[15px] file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-tint/10 file:px-4 file:font-semibold file:text-tint" />
        </Field>
      </div>
      <Field label="Notes"><textarea name="notes" maxLength={1000} rows={2} defaultValue={initial.notes ?? ''} className="input" placeholder="Policy number, who to call…" /></Field>
      <Msg state={state} />
      <SubmitButton disabled={pending}>{id ? 'Save changes' : 'Add to vault'}</SubmitButton>
    </form>
  );
}

export function BillForm({ defaultMonth }: { defaultMonth: string }) {
  const { state, pending, formKey, formProps } = useServerForm(saveBill, { resetOnSuccess: true });
  return (
    <form key={formKey} {...formProps} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Utility">
          <select name="kind" className="input">{UTILITY_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
        </Field>
        <Field label="Month"><input name="period" type="month" required defaultValue={defaultMonth} className="input" /></Field>
        <Field label="Amount"><input name="amount" required inputMode="decimal" className="input" placeholder="0.00" /></Field>
        <Field label="Usage (optional, kWh / m³)"><input name="usage" inputMode="numeric" className="input" placeholder="e.g. 320" /></Field>
      </div>
      <p className="px-1 text-[13px] text-secondary">Saving a month you already entered replaces it.</p>
      <Msg state={state} />
      <SubmitButton disabled={pending}>Save bill</SubmitButton>
    </form>
  );
}
