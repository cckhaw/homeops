'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { Pencil, Plus, RotateCcw, Search } from 'lucide-react';
import AppleButton, { SubmitButton } from './AppleButton';
import BrandLogo from './BrandLogo';
import { ConfirmButton, Sheet } from './misc';
import { Field, Msg } from './forms';
import GlassCard from './GlassCard';
import { deleteBrand, restoreDefaultBrands, saveBrand, type BrandState } from '@/app/brand-actions';
import { faviconUrl, normalizeDomain, recordLogoSrc, type BrandRecord } from '@/lib/brands';

function PreviewTile({ src, label }: { src: string | null; label: string }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  return (
    <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-black/10" aria-label="Logo preview">
      <span className="text-[22px] font-bold text-neutral-500">{label.trim()[0]?.toUpperCase() ?? '?'}</span>
      {src && !bad && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setBad(true)} referrerPolicy="no-referrer" className="absolute inset-0 m-auto h-9 w-9 bg-white object-contain" />
      )}
    </span>
  );
}

function BrandForm({ brand, onDone }: { brand?: BrandRecord; onDone: () => void }) {
  const [state, action] = useFormState<BrandState, FormData>(saveBrand.bind(null, brand?.id ?? ''), undefined);
  const [name, setName] = useState(brand?.name ?? '');
  const [domain, setDomain] = useState(brand?.domain ?? '');
  const [link, setLink] = useState('');
  useEffect(() => {
    if (state?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const d = normalizeDomain(domain);
  const preview = link.startsWith('https://') ? link : (brand?.logoUrl ? recordLogoSrc(brand, 128) : null) ?? (d ? faviconUrl(d, 128) : null);

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-3">
        <PreviewTile src={preview} label={name} />
        <p className="text-[14px] text-secondary">A logo is found automatically from the website address. Upload or link an image to use your own instead.</p>
      </div>
      <Field label="Brand name">
        <input name="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Cuckoo" />
      </Field>
      <Field label="Website (for the automatic logo)">
        <input name="domain" value={domain} onChange={(e) => setDomain(e.target.value)} className="input" placeholder="cuckoo.co.kr" autoCapitalize="none" autoCorrect="off" />
      </Field>
      <div className="space-y-3 rounded-2xl bg-label/5 p-4">
        <p className="text-[15px] font-semibold">Custom logo (optional)</p>
        <Field label="Upload an image (PNG, JPG, WebP or GIF, under 1 MB)">
          <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="block w-full text-[15px] file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-tint/10 file:px-4 file:font-semibold file:text-tint" />
        </Field>
        <Field label="…or paste a link to an image">
          <input name="logoLink" value={link} onChange={(e) => setLink(e.target.value)} className="input" placeholder="https://…/logo.png" inputMode="url" autoCapitalize="none" />
        </Field>
        {brand?.logoUrl && (
          <label className="flex min-h-[44px] items-center gap-3 text-[15px]">
            <input type="checkbox" name="removeLogo" className="h-5 w-5 accent-[rgb(var(--tint))]" /> Remove the custom logo and use the website&apos;s instead
          </label>
        )}
      </div>
      <Msg state={state} />
      <SubmitButton full>{brand ? 'Save changes' : 'Add brand'}</SubmitButton>
    </form>
  );
}

export default function BrandAdmin({ brands }: { brands: BrandRecord[] }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<BrandRecord | 'new' | null>(null);
  const [restore, setRestore] = useState<BrandState>();
  const q = query.trim().toLowerCase();
  const list = useMemo(() => (q ? brands.filter((b) => b.name.toLowerCase().includes(q) || (b.domain ?? '').includes(q)) : brands), [brands, q]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brands" aria-label="Search brands" className="input pl-10" />
        </div>
        <AppleButton onClick={() => setEditing('new')}><Plus className="h-5 w-5" aria-hidden /> Add brand</AppleButton>
      </div>

      <GlassCard className="py-2">
        {list.length === 0 ? (
          <p className="py-6 text-center text-secondary">No brands match “{query}”.</p>
        ) : (
          <ul className="divide-y hairline [&>li]:border-inherit">
            {list.map((b) => (
              <li key={b.id ?? b.name} className="flex items-center gap-3 py-2.5">
                <BrandLogo make={b.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold">{b.name}</p>
                  <p className="truncate text-[13px] text-secondary">{b.logoUrl ? 'Custom logo' : b.domain}{b.logoUrl && b.domain ? ` · ${b.domain}` : ''}</p>
                </div>
                <button aria-label={`Edit ${b.name}`} onClick={() => setEditing(b)} className="grid h-11 w-11 place-items-center rounded-xl text-secondary hover:text-tint">
                  <Pencil className="h-[18px] w-[18px]" aria-hidden />
                </button>
                {b.id && (
                  <form action={deleteBrand.bind(null, b.id)}>
                    <ConfirmButton message={`Delete “${b.name}”? Assets already using it keep the name as plain text.`}>Delete</ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form action={async () => setRestore(await restoreDefaultBrands())}>
          <SubmitButton variant="secondary"><RotateCcw className="h-4 w-4" aria-hidden /> Restore missing built-in brands</SubmitButton>
        </form>
        <Msg state={restore} />
      </div>

      <Sheet title={editing === 'new' ? 'Add brand' : 'Edit brand'} open={editing !== null} onClose={() => setEditing(null)}>
        {editing !== null && <BrandForm key={editing === 'new' ? 'new' : editing.id} brand={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}
