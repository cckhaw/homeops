'use client';

import { Download, ExternalLink, FileText, Printer, Trash2 } from 'lucide-react';
import { useServerForm } from './useServerForm';
import { Field, Msg } from './forms';
import AppleButton, { SubmitButton } from './AppleButton';
import { ConfirmButton } from './misc';
import { deleteReport, saveReport } from '@/app/rental-actions';
import { CONDITIONS } from '@/lib/rental-core';

export type EditorItem = { id: string; room: string; item: string; condition: string; notes: string | null; hasPhoto: boolean; photoIsPdf?: boolean };

const TONE: Record<string, string> = { good: 'border-ok/40', fair: 'border-label/20', poor: 'border-warn/60', damaged: 'border-bad/60', missing: 'border-bad/60' };

/** One form for the whole report: date, notes and each item's rating, notes and photo, plus one new item. */
export default function ReportEditor({ id, inspectedOn, notes, items }: { id: string; inspectedOn: string; notes: string | null; items: EditorItem[] }) {
  const { state, pending, formProps } = useServerForm(saveReport.bind(null, id));
  const rooms = [...new Set(items.map((i) => i.room))];
  return (
    <div className="space-y-4">
      <form {...formProps} encType="multipart/form-data" className="space-y-4 print:hidden" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Inspection date"><input type="date" name="inspectedOn" defaultValue={inspectedOn} className="input" /></Field>
        </div>
        {rooms.map((room) => (
          <fieldset key={room} className="rounded-2xl border bg-surface p-4 hairline">
            <legend className="px-1 text-[17px] font-bold">{room}</legend>
            <ul className="space-y-4">
              {items.filter((i) => i.room === room).map((i) => (
                <li key={i.id} className={`rounded-xl border-l-4 pl-3 ${TONE[i.condition] ?? ''}`} data-testid="report-item">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[15.5px] font-semibold">{i.item}</span>
                    <label className="flex items-center gap-1.5 text-[13px] text-secondary"><input type="checkbox" name={`del_${i.id}`} className="h-4 w-4" aria-label={`Remove ${i.item}`} /> Remove</label>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[10rem_1fr]">
                    <select name={`cond_${i.id}`} defaultValue={i.condition} className="input" aria-label={`${room} ${i.item}: condition`}>{CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                    <input name={`notes_${i.id}`} defaultValue={i.notes ?? ''} maxLength={500} className="input" placeholder="Notes, e.g. scratch on the left door" aria-label={`${room} ${i.item}: notes`} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                    {i.hasPhoto && (
                      <div className="flex w-full flex-wrap items-center gap-3" data-testid="item-photo">
                        {i.photoIsPdf ? (
                          <span className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-label/5 px-3 text-[14px] font-medium"><FileText className="h-4 w-4" aria-hidden />PDF attached</span>
                        ) : (
                          <a href={`/api/condition/${i.id}`} target="_blank" rel="noopener noreferrer" aria-label={`View photo: ${room} ${i.item}`} data-testid="photo-link" className="block shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10 transition hover:opacity-90">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/api/condition/${i.id}`} alt={`${room} ${i.item}`} className="h-24 w-24 object-cover" />
                          </a>
                        )}
                        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <a href={`/api/condition/${i.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-tint"><ExternalLink className="h-4 w-4" aria-hidden />{i.photoIsPdf ? 'Open file' : 'View full size'}</a>
                          <a href={`/api/condition/${i.id}?download=1`} className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-tint"><Download className="h-4 w-4" aria-hidden />Download</a>
                          <label className="flex min-h-[44px] items-center gap-1.5 text-secondary"><input type="checkbox" name={`rmphoto_${i.id}`} className="h-4 w-4" /> Remove</label>
                        </span>
                      </div>
                    )}
                    <input type="file" name={`photo_${i.id}`} accept="image/*,application/pdf" className="file-input min-w-0 flex-1" aria-label={`${room} ${i.item}: photo`} />
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
        <fieldset className="rounded-2xl border border-dashed p-4 hairline">
          <legend className="px-1 text-[15px] font-semibold">Add an item</legend>
          <div className="grid gap-2 sm:grid-cols-4">
            <input name="newRoom" maxLength={60} className="input" placeholder="Room" aria-label="New item room" />
            <input name="newItem" maxLength={80} className="input" placeholder="Item" aria-label="New item name" />
            <select name="newCondition" className="input" aria-label="New item condition">{CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
            <input name="newNotes" maxLength={500} className="input" placeholder="Notes" aria-label="New item notes" />
          </div>
        </fieldset>
        <Field label="General notes (keys handed over, meter readings, anything agreed)"><textarea name="reportNotes" rows={3} maxLength={2000} defaultValue={notes ?? ''} className="input" /></Field>
        <Msg state={state} />
        <div className="flex flex-wrap gap-3">
          <SubmitButton pending={pending}>Save report</SubmitButton>
          <AppleButton type="button" variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />Print / save as PDF</AppleButton>
        </div>
      </form>
      <form action={deleteReport.bind(null, id)} className="print:hidden"><ConfirmButton message="Delete this report and its photos? This cannot be undone."><Trash2 className="h-4 w-4" aria-hidden /> Delete report</ConfirmButton></form>
    </div>
  );
}
