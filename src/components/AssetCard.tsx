import Link from 'next/link';
import { ChevronRight, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import type { Asset } from '@/db/schema';
import GlassCard from './GlassCard';
import BrandLogo from './BrandLogo';
import { makeModelLabel } from '@/lib/brands';
import { cn, healthScore, warrantyState } from '@/lib/utils';

const toneText = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', none: 'text-secondary' } as const;
const toneBg = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' } as const;

export default function AssetCard({ asset, overdueTasks }: { asset: Asset; overdueTasks: number }) {
  const health = healthScore({ installDate: asset.installDate, warrantyExpiry: asset.warrantyExpiry, overdueTasks });
  const warranty = warrantyState(asset.warrantyExpiry);
  const Icon = warranty.tone === 'ok' ? ShieldCheck : warranty.tone === 'none' ? ShieldQuestion : ShieldAlert;

  return (
    <Link href={`/dashboard/assets/${asset.id}`} className="block rounded-apple transition active:scale-[0.985]">
      <GlassCard className="flex items-center gap-4">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-[17px] font-bold"
          style={{
            background: `conic-gradient(rgb(var(--${health.tone})) ${health.score * 3.6}deg, rgba(120,120,128,0.18) 0deg)`,
          }}
          role="img"
          aria-label={`Health score ${health.score} out of 100`}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-[15px]">{health.score}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold">{asset.name}</p>
          <p className="truncate text-[13px] text-secondary">
            {asset.category}
            {makeModelLabel(asset) ? ` · ${makeModelLabel(asset)}` : ''}
          </p>
          <p className={cn('mt-1 flex items-center gap-1 text-[13px]', toneText[warranty.tone])}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {warranty.label}
          </p>
          {overdueTasks > 0 && (
            <span className={cn('mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white', toneBg.bad)}>
              {overdueTasks} overdue
            </span>
          )}
        </div>
        <BrandLogo make={asset.make} size={44} />
        <ChevronRight className="h-5 w-5 shrink-0 text-secondary" aria-hidden />
      </GlassCard>
    </Link>
  );
}
