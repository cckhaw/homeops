'use client';

import { useState, useTransition } from 'react';
import { Pencil } from 'lucide-react';
import { useServerForm } from './useServerForm';
import { Field, Msg } from './forms';
import AppleButton, { SubmitButton } from './AppleButton';
import { ConfirmButton, Sheet } from './misc';
import { addTenancy, createReport, deleteTenancy, endTenancy, markRentReceived, updateTenancy } from '@/app/rental-actions';
import { REPORT_KINDS } from '@/lib/rental-core';

type FormState = { error?: string; ok?: string } | undefined;
export type TenancyValues = { id?: string; tenantName?: string; tenantPhone?: string | null; tenantEmail?: string | null; startDate?: string; endDate?: string | null; rent?: string; dueDay?: number; deposit?: string; notes?: string | null };

export function TenancyForm({ initial = {}, onDone }: { initial?: TenancyValues; onDone?: () => void }) {
  const { state, pending, formProps, formKey } = useServerForm(initial.id ? updateTenancy.bind(null, initial.id) : addTenancy, { resetOnSuccess: !initial.id });
  void onDone;
  return (
    <form {...formProps} key={formKey} noValidate className="space-y-3">
      <Field label="Tenant name"><input name="tenantName" required maxLength={120} defaultValue={initial.tenantName ?? ''} className="input" autoComplete="off" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone (optional)"><input name="tenantPhone" maxLength={40} defaultValue={initial.tenantPhone ?? ''} className="input" inputMode="tel" /></Field>
        <Field label="E-mail (optional)"><input name="tenantEmail" maxLength={200} defaultValue={initial.tenantEmail ?? ''} className="input" inputMode="email" /></Field>
        <Field label="Lease starts"><input type="date" name="startDate" defaultValue={initial.startDate ?? ''} className="input" /></Field>
        <Field label="Lease ends (leave empty if month to month)"><input type="date" name="endDate" defaultValue={initial.endDate ?? ''} className="input" /></Field>
        <Field label="Monthly rent"><input name="rent" inputMode="decimal" defaultValue={initial.rent ?? ''} className="input" placeholder="2,500.00" /></Field>
        <Field label="Rent is due on day (1–28)"><input name="dueDay" inputMode="numeric" defaultValue={initial.dueDay ?? 1} className="input" /></Field>
        <Field label="Security deposit (optional)"><input name="deposit" inputMode="decimal" defaultValue={initial.deposit ?? ''} className="input" placeholder="5,000.00" /></Field>
      </div>
      <Field label="Notes (optional)"><textarea name="notes" rows={2} maxLength={1000} defaultValue={initial.notes ?? ''} className="input" placeholder="Parking lot, key count, special terms" /></Field>
      <Msg state={state} />
      <SubmitButton pending={pending}>{initial.id ? 'Save tenancy' : 'Add tenancy'}</SubmitButton>
    </form>
  );
}

export function EditTenancyButton({ values }: { values: TenancyValues }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Edit tenancy of ${values.tenantName}`} data-testid="edit-tenancy" className="grid h-11 w-11 place-items-center rounded-xl text-secondary transition hover:bg-label/5 hover:text-tint"><Pencil className="h-[18px] w-[18px]" aria-hidden /></button>
      <Sheet title={`Edit ${values.tenantName}`} open={open} onClose={() => setOpen(false)}><TenancyForm initial={values} /></Sheet>
    </>
  );
}

/** Mark rent received, end the tenancy, delete it. */
export function TenancyActions({ id, owedMonths, name }: { id: string; owedMonths: number; name: string }) {
  const [msg, setMsg] = useState<FormState>();
  const [pending, run] = useTransition();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <AppleButton type="button" disabled={pending || owedMonths === 0} onClick={() => run(async () => setMsg(await markRentReceived(id)))} data-testid="rent-received">{owedMonths ? 'Mark rent received' : 'Rent up to date'}</AppleButton>
        <AppleButton type="button" variant="secondary" disabled={pending} onClick={() => { if (confirm(`End the tenancy of ${name} today? Rent reminders will stop.`)) run(async () => setMsg(await endTenancy(id))); }}>End tenancy</AppleButton>
        <form action={deleteTenancy.bind(null, id)}><ConfirmButton message={`Delete the tenancy of ${name} and its rent history? This cannot be undone.`}>Delete</ConfirmButton></form>
      </div>
      <Msg state={msg} />
    </div>
  );
}

export function NewReportForm({ tenants, today }: { tenants: { id: string; name: string }[]; today: string }) {
  const { state, pending, formProps } = useServerForm(createReport);
  return (
    <form {...formProps} className="grid gap-3 sm:grid-cols-4">
      <Field label="Type"><select name="kind" className="input" aria-label="Report type">{REPORT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></Field>
      <Field label="Tenancy"><select name="tenancyId" className="input" aria-label="Report tenancy"><option value="">None</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
      <Field label="Inspection date"><input type="date" name="inspectedOn" defaultValue={today} className="input" /></Field>
      <div className="flex items-end"><SubmitButton pending={pending} full>Start report</SubmitButton></div>
      <div className="sm:col-span-4"><Msg state={state} /></div>
    </form>
  );
}
