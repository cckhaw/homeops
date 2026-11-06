import { BellRing, Building2, Check, FolderLock, Home, ShieldCheck, TrendingUp } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { cn } from '@/lib/utils';

/**
 * A decorative, static picture of the app (not a screenshot): upcoming tasks, a warranty, yearly spending, a vault
 * document and a push reminder. Drawn with the same tokens as the real UI so it follows light/dark mode.
 */

const TASKS = [
  { title: 'Service the aircon', when: '2 days overdue', tone: 'bad' as const },
  { title: 'Replace water filter', when: 'Due tomorrow', tone: 'warn' as const },
  { title: 'Clean the gutters', when: 'In 12 days', tone: 'ok' as const },
  { title: 'Test smoke alarms', when: 'In 3 weeks', tone: 'ok' as const },
];
const TONE = { bad: 'text-bad', warn: 'text-warn', ok: 'text-secondary' } as const;
const BARS = [38, 22, 30, 64, 28, 36, 80, 34, 26, 48, 30, 42];

function MiniCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-2xl border bg-surface p-4 shadow-sm hairline', className)}>{children}</div>;
}

export default function AppPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-14 max-w-5xl px-5 text-left sm:mt-20">
      {/* soft glow behind the window */}
      <div className="pointer-events-none absolute inset-x-10 -top-6 bottom-0 -z-10 rounded-[40px] bg-[rgb(var(--brand)/0.18)] blur-3xl" />

      <div className="glass overflow-hidden rounded-[28px] p-2.5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)] sm:p-3">
        <div className="flex items-center gap-1.5 px-3 pb-2.5 pt-1" role="presentation">
          <i className="h-2.5 w-2.5 rounded-full bg-bad/70" /><i className="h-2.5 w-2.5 rounded-full bg-warn/70" /><i className="h-2.5 w-2.5 rounded-full bg-ok/70" />
          <span className="ml-3 hidden rounded-full bg-label/5 px-3 py-0.5 text-[11px] text-secondary sm:inline">homeops.khaw.cc/dashboard</span>
        </div>

        <div className="grid gap-3 rounded-[20px] bg-bg p-3 sm:gap-4 sm:p-5 md:grid-cols-[1.35fr_1fr]">
          {/* left: home + tasks */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LogoMark size={30} />
                <div className="leading-tight">
                  <p className="text-[15px] font-semibold">Main House</p>
                  <p className="text-[12px] text-secondary">4 things need attention</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-tint text-ontint"><Home className="h-[18px] w-[18px]" /></span>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-label/5 text-secondary"><Building2 className="h-[18px] w-[18px]" /></span>
              </div>
            </div>

            <MiniCard>
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-secondary">Up next</p>
              <ul className="divide-y hairline [&>li]:border-inherit">
                {TASKS.map((t) => (
                  <li key={t.title} className="flex items-center gap-3 py-2.5">
                    <span className={cn('grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2', t.tone === 'bad' ? 'border-bad' : 'border-secondary/40')}>
                      {t.tone === 'ok' && t.title.startsWith('Test') && <Check className="h-3 w-3 text-secondary" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{t.title}</span>
                      <span className={cn('block text-[12px]', TONE[t.tone])}>{t.when}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </MiniCard>
          </div>

          {/* right: warranty, spending, vault */}
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-1">
            <MiniCard>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-secondary">Warranty</p>
              <p className="mt-1 text-[14px] font-medium">Washing machine · LG</p>
              <p className="text-[12px] font-medium text-warn">Ends in 18 days</p>
              <div className="mt-2.5 h-1.5 rounded-full bg-label/10"><div className="h-1.5 w-[88%] rounded-full bg-warn" /></div>
            </MiniCard>

            <MiniCard>
              <div className="flex items-baseline justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-secondary">Spending 2026</p>
                <p className="flex items-center gap-1 text-[12px] font-medium text-ok"><TrendingUp className="h-3.5 w-3.5" />on track</p>
              </div>
              <p className="mt-0.5 text-[22px] font-bold leading-tight">S$3,420</p>
              <div className="mt-2 flex h-14 items-end gap-1">
                {BARS.map((h, i) => <i key={i} className="flex-1 rounded-t bg-tint" style={{ height: `${h}%`, opacity: 0.45 + (h / 80) * 0.55 }} />)}
              </div>
            </MiniCard>

            <MiniCard className="flex items-center gap-3 sm:col-span-2 md:col-span-1">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint/10 text-tint"><FolderLock className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium">Home insurance</span>
                <span className="block text-[12px] text-warn">Expires in 24 days</span>
              </span>
              <ShieldCheck className="ml-auto h-5 w-5 shrink-0 text-ok" />
            </MiniCard>
          </div>
        </div>
      </div>

      {/* floating reminder */}
      <div className="absolute -bottom-14 right-3 w-[16.5rem] rounded-2xl border bg-surface p-3.5 shadow-xl hairline sm:-bottom-12 sm:right-12 sm:w-80">
        <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-ok"><BellRing className="h-4 w-4" />HomeOps · now</div>
        <p className="text-[13px] leading-snug">HomeOps: Service the aircon — due today · Replace water filter — due tomorrow</p>
      </div>
    </div>
  );
}
