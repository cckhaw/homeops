'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, ImageUp, RotateCcw, XCircle } from 'lucide-react';
import AppleButton from './AppleButton';
import { useServerForm } from './useServerForm';
import { resetBrandAsset, uploadBrandAsset } from '@/app/branding-actions';
import type { BrandKind } from '@/lib/brand-core';

export type BrandCardData = { kind: BrandKind; label: string; help: string; accept: string; custom: { url: string; bytes: number; size: string | null; updated: string } | null; fallback: string };

function Result({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (!state?.error && !state?.ok) return null;
  const ok = !!state.ok;
  return (
    <div role="status" className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[14px] ${ok ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <span>{state.error ?? state.ok}</span>
    </div>
  );
}

export default function BrandCard({ d }: { d: BrandCardData }) {
  const up = useServerForm(uploadBrandAsset, { resetOnSuccess: true });
  const rs = useServerForm(resetBrandAsset);
  const [picked, setPicked] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const src = blobUrl ?? d.custom?.url ?? d.fallback;
  const tall = d.kind === 'icon';
  const shown = up.state?.ok ? undefined : up.state;

  return (
    <section className="rounded-2xl border bg-surface p-5 hairline" aria-label={d.label} data-brand-card={d.kind}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[20px] font-bold">{d.label}</h2>
        <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${d.custom ? 'bg-tint/10 text-tint' : 'bg-label/10 text-secondary'}`} data-status>
          {d.custom ? `Custom · ${d.custom.size ?? ''} ${(d.custom.bytes / 1024).toFixed(0)} KB` : 'Wodejia default'}
        </span>
      </div>
      <p className="mt-1 text-[14px] text-secondary">{d.help}</p>

      <div className={`mt-4 grid gap-3 ${tall ? 'grid-cols-2 sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {[{ bg: '#ffffff', n: 'Light' }, { bg: '#1c1c1e', n: 'Dark' }, ...(tall ? [{ bg: '#ffffff', n: 'App tile' }] : [])].map((t) => (
          <div key={t.n} className="rounded-xl border p-3 hairline" style={{ background: t.bg }}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.bg === '#ffffff' ? '#86868b' : '#a1a1a6' }}>{t.n}</p>
            <div className="flex min-h-[72px] items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${d.label} preview (${t.n})`} className={t.n === 'App tile' ? 'h-16 w-16 rounded-[22%] object-contain shadow' : d.kind === 'share' ? 'max-h-32 w-auto rounded-md' : tall ? 'h-16 w-16 object-contain' : 'max-h-16 w-auto max-w-full object-contain'} />
            </div>
          </div>
        ))}
      </div>

      <form {...up.formProps} key={up.formKey} className="mt-4 flex flex-wrap items-center gap-3" encType="multipart/form-data">
        <input type="hidden" name="kind" value={d.kind} />
        <input
          ref={input}
          type="file"
          name="file"
          accept={d.accept}
          required
          aria-label={`Choose ${d.label.toLowerCase()} file`}
          className="file-input min-w-0 flex-1"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPicked(f?.name ?? null);
            setBlobUrl((old) => { if (old) URL.revokeObjectURL(old); return f ? URL.createObjectURL(f) : null; });
          }}
        />
        <AppleButton type="submit" disabled={up.pending || !picked}><ImageUp className="mr-1.5 h-4 w-4" aria-hidden />{up.pending ? 'Uploading…' : 'Upload'}</AppleButton>
      </form>
      <Result state={shown ?? up.state} />

      {d.custom && (
        <form {...rs.formProps} className="mt-3" onSubmit={(e) => { if (!confirm(`Reset the ${d.label.toLowerCase()} to the Wodejia default?`)) { e.preventDefault(); return; } rs.formProps.onSubmit(e); }}>
          <input type="hidden" name="kind" value={d.kind} />
          <AppleButton type="submit" variant="secondary" disabled={rs.pending}><RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />Reset to default</AppleButton>
          <p className="mt-1.5 text-[12px] text-secondary">Last changed {d.custom.updated}</p>
        </form>
      )}
    </section>
  );
}
