import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, Wrench } from 'lucide-react';
import { findPassportHome, isPassportUnlocked, loadPassport } from '@/lib/passport';
import { PassportGate } from '@/components/security-forms';
import { Lock } from 'lucide-react';
import { formatCurrency, formatDate, warrantyState } from '@/lib/utils';
import GlassCard from '@/components/GlassCard';
import Logo from '@/components/Logo';
import AppleButton from '@/components/AppleButton';
import BrandLogo from '@/components/BrandLogo';
import { BrandsProvider } from '@/components/BrandsProvider';
import { getBrands } from '@/lib/brand-store';
import { getPublicPrefs } from '@/lib/prefs';
import { makeModelLabel } from '@/lib/brands';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const params = await paramsPromise;
  const home = await findPassportHome(params.token);
  if (!home) return { title: 'Passport not found', robots: { index: false } };
  if (!(await isPassportUnlocked(home))) return { title: 'Home Service Passport', robots: { index: false, follow: false } };
  const p = await loadPassport(params.token);
  if (!p) return { title: 'Passport not found', robots: { index: false } };
  return {
    title: `${p.home.name} — Home Service Passport`,
    description: `${p.stats.assets} documented assets and ${p.stats.completed} completed maintenance check-ups.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicPassport({ params: paramsPromise }: { params: Promise<{ token: string }> }) {
  const params = await paramsPromise;
  const home = await findPassportHome(params.token);
  if (!home) notFound();
  if (!(await isPassportUnlocked(home))) {
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <GlassCard className="w-full max-w-sm space-y-5 p-7 text-center">
          <Link href="/" aria-label="Wodejia" className="inline-block"><Logo size={36} /></Link>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-tint/10 text-tint"><Lock className="h-7 w-7" aria-hidden /></span>
          <h1 className="text-[24px] font-bold">This passport is protected</h1>
          <p className="text-[15px] text-secondary">Enter the password the owner shared with you.</p>
          <div className="text-left"><PassportGate token={params.token} /></div>
        </GlassCard>
      </main>
    );
  }
  const p = await loadPassport(params.token);
  if (!p) notFound();
  const [brands, { locale, currency }] = await Promise.all([getBrands(), getPublicPrefs(home)]);
  const toneText = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', none: 'text-secondary' } as const;

  return (
    <BrandsProvider brands={brands}>
    <div className="min-h-dvh pb-16">
      <header className="glass sticky top-0 z-10 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-2.5">
          <Link href="/" aria-label="Wodejia"><Logo size={32} /></Link>
          <span className="flex items-center gap-1 text-[13px] font-semibold text-ok"><BadgeCheck className="h-4 w-4" aria-hidden /> Home Service Passport</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <h1 className="large-title">{p.home.name}</h1>
        {p.home.address && <p className="mt-1 text-[17px] text-secondary">{p.home.address}</p>}

        <section className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Summary">
          <Metric label="Documented assets" value={p.stats.assets} />
          <Metric label="Check-ups completed" value={p.stats.completed} />
          <Metric label="Overdue tasks" value={p.stats.overdue} />
          <Metric label="Overall health" value={p.stats.overall == null ? '—' : `${p.stats.overall}/100`} />
        </section>

        <h2 className="mb-2 px-1 text-[22px] font-bold">Appliances & systems</h2>
        <div className="mb-8 grid items-start gap-3 md:grid-cols-2">
          {p.assets.length === 0 && <GlassCard className="text-secondary">No assets recorded yet.</GlassCard>}
          {p.assets.map((a) => {
            const w = warrantyState(a.warrantyExpiry, locale);
            const history = p.records.filter((r) => r.assetId === a.id);
            return (
              <GlassCard key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <BrandLogo make={a.make} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[19px] font-semibold">{a.name}</p>
                    <p className="text-[14px] text-secondary">{a.category}{makeModelLabel(a) ? ` · ${makeModelLabel(a)}` : ''}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-label/5 px-2.5 py-1 text-[13px] font-semibold">{a.health}/100</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-[14px]">
                  <div><dt className="text-secondary">Installed</dt><dd>{formatDate(a.installDate, undefined, locale)}</dd></div>
                  <div><dt className="text-secondary">Warranty</dt><dd className={toneText[w.tone]}>{w.label}</dd></div>
                </dl>
                {history.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t pt-3 text-[14px] hairline">
                    {history.map((r) => (
                      <li key={r.id} className="flex gap-2"><Wrench className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
                        <span>{r.description} <span className="text-secondary">· {formatDate(r.serviceDate, undefined, locale)}{r.costCents != null ? ` · ${formatCurrency(r.costCents, currency, locale)}` : ''}</span></span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>
            );
          })}
        </div>

        <h2 className="mb-2 px-1 text-[22px] font-bold">Maintenance log</h2>
        <GlassCard className="mb-10 py-2">
          {p.completed.length === 0 ? (
            <p className="py-4 text-secondary">No completed maintenance yet.</p>
          ) : (
            <ul className="divide-y hairline [&>li]:border-inherit">
              {p.completed.slice(0, 40).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-[15px]">
                  <span className="min-w-0 truncate">{t.title}</span>
                  <span className="shrink-0 text-secondary">{formatDate(t.completedAt, undefined, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="space-y-3 text-center">
          <h2 className="text-[22px] font-bold">Keep your own home this organized</h2>
          <p className="text-secondary">Create a free Home Service Passport in minutes — scan receipts, track warranties and never miss maintenance.</p>
          <AppleButton href="/register">Get Wodejia free</AppleButton>
        </GlassCard>
        <p className="mt-6 text-center text-[12px] text-secondary"><Link href="/privacy" className="font-semibold text-tint">Privacy</Link> · <Link href="/terms" className="font-semibold text-tint">Terms</Link></p>
      </main>
    </div>
    </BrandsProvider>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <GlassCard className="p-4">
      <p className="text-[26px] font-bold leading-none">{value}</p>
      <p className="mt-1 text-[12px] text-secondary">{label}</p>
    </GlassCard>
  );
}
