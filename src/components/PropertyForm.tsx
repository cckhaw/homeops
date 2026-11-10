'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PROPERTY_TEMPLATES, REGIONS, suggestedDate, templatesFor, type Region } from '@/lib/property-core';
import { FREQUENCIES, FREQUENCY_LABEL } from '@/lib/utils';
import { useServerForm } from './useServerForm';
import { SubmitButton } from './AppleButton';
import { Msg } from './forms';
import { addPropertyReminders } from '@/app/records-actions';

/** Pick the region, tick the bills you have, check the dates, add them to the schedule. */
export default function PropertyForm({ initialRegion, today }: { initialRegion: Region; today: string }) {
  const [region, setRegion] = useState<Region>(initialRegion);
  const { state, pending, formProps } = useServerForm(addPropertyReminders);
  const list = useMemo(() => templatesFor(region), [region]);
  // keep what the person typed when they switch region and back: the dates live in the DOM keyed by template id
  return (
    <form {...formProps} noValidate className="space-y-4">
      <label className="block">
        <span className="field-label">Where is your home?</span>
        <select name="region" value={region} onChange={(e) => setRegion(e.target.value as Region)} className="input" aria-label="Region">
          {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </label>
      <ul className="space-y-3" aria-label="Property reminders">
        {list.map((t) => {
          const date = suggestedDate(t, today) ?? '';
          return (
            <li key={`${region}-${t.id}`} className="rounded-2xl border bg-surface p-4 hairline" data-testid={`property-${t.id}`}>
              <label className="flex min-h-[44px] items-start gap-3">
                <input type="checkbox" name="pick" value={t.id} defaultChecked={!!date} className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--tint))]" aria-label={t.title} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{t.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-secondary">{t.hint}</span>
                </span>
              </label>
              <div className="mt-3 grid gap-3 pl-8 sm:grid-cols-2">
                <label className="block"><span className="field-label">{date ? 'First due date' : 'Choose the date'}</span><input type="date" name={`due_${t.id}`} defaultValue={date} className="input" aria-label={`${t.title}: due date`} /></label>
                <label className="block"><span className="field-label">Repeats</span>
                  <select name={`freq_${t.id}`} defaultValue={t.frequency} className="input" aria-label={`${t.title}: repeats`}>
                    {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>)}
                  </select>
                </label>
              </div>
            </li>
          );
        })}
      </ul>
      <Msg state={state} />
      <SubmitButton pending={pending}>Add to my schedule</SubmitButton>
      {state?.ok && <p className="text-[14px]"><Link href="/dashboard/schedule" className="font-semibold text-tint">See them on the schedule</Link></p>}
      <p className="text-[12.5px] text-secondary">Dates shown are typical and may differ by state, council or management body. Always follow the date on your own bill or notice. Wodejia only reminds you; it never pays anything.</p>
    </form>
  );
}
