'use client';

import { useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import GlassCard from './GlassCard';

const OPTIONS = [
  { id: 'contractors', label: 'Trusted contractors', hint: 'Names, trades and phone numbers' },
  { id: 'bills', label: 'Utility bill totals', hint: 'Yearly totals per utility, useful for a tenant or buyer' },
  { id: 'docs', label: 'Vault documents', hint: 'Insurance, deeds and reports — can be sensitive' },
] as const;

/** Choose what goes beyond the basics, then download the zip or open the printable summary. */
export default function PackOptions() {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const qs = OPTIONS.filter((o) => on[o.id]).map((o) => `${o.id}=1`).join('&');
  const q = qs ? `?${qs}` : '';
  return (
    <GlassCard className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-[17px] font-semibold">Also include</legend>
        <div className="space-y-1">
          {OPTIONS.map((o) => (
            <label key={o.id} className="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl px-1 py-2">
              <input type="checkbox" checked={!!on[o.id]} onChange={(e) => setOn((p) => ({ ...p, [o.id]: e.target.checked }))} className="mt-1 h-5 w-5 accent-[rgb(var(--tint))]" />
              <span><span className="block text-[16px] font-medium">{o.label}</span><span className="block text-[13px] text-secondary">{o.hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        {/* plain links: these are file/HTML responses, not app pages, so no client-side navigation */}
        <a href={`/api/pack${q}`} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-tint px-5 text-[17px] font-semibold text-ontint transition active:scale-[0.97]"><Download className="h-5 w-5" aria-hidden /> Download pack (.zip)</a>
        <a href={`/api/pack/summary${q}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-tint/10 px-5 text-[17px] font-semibold text-tint transition active:scale-[0.97]"><ExternalLink className="h-4 w-4" aria-hidden /> Printable summary</a>
      </div>
    </GlassCard>
  );
}
