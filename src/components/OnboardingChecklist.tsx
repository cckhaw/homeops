'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import GlassCard from './GlassCard';
import { dismissChecklist } from '@/app/security-actions';
import { cn } from '@/lib/utils';

export type ChecklistStep = { label: string; hint: string; href: string; done: boolean };

/** "Getting started" card. Steps tick themselves from real data; the card disappears when finished or dismissed. */
export default function OnboardingChecklist({ steps }: { steps: ChecklistStep[] }) {
  const [pending, start] = useTransition();
  const done = steps.filter((s) => s.done).length;
  return (
    <GlassCard className="mb-6 lg:max-w-3xl" aria-label="Getting started">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold">Getting started</h2>
          <p className="text-[14px] text-secondary">{done} of {steps.length} done</p>
        </div>
        <button type="button" disabled={pending} onClick={() => start(() => dismissChecklist())} aria-label="Dismiss getting started" className="-mr-2 -mt-1 grid h-11 w-11 place-items-center rounded-xl text-secondary hover:bg-label/5">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-label/10" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}>
        <div className="h-full rounded-full bg-tint transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="divide-y hairline [&>li]:border-inherit">
        {steps.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="flex min-h-[56px] items-center gap-3 py-2">
              <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2', s.done ? 'border-ok bg-ok text-white' : 'border-secondary/40')}>
                {s.done && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[16px] font-medium', s.done && 'text-secondary line-through')}>{s.label}</span>
                {!s.done && <span className="block truncate text-[13px] text-secondary">{s.hint}</span>}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
