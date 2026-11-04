import Link from 'next/link';
import { Coffee, Heart, Lock } from 'lucide-react';
import Logo from '@/components/Logo';
import GlassCard from '@/components/GlassCard';
import { COFFEE_PRESETS, donationsEnabled } from '@/lib/donate';
import { SubmitButton } from '@/components/AppleButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Buy me a coffee' };

const errors: Record<string, string> = {
  amount: 'Please choose an amount between $1 and $500.',
  stripe: 'Stripe could not start the checkout. Please try again in a moment.',
  unavailable: 'Donations are not available right now.',
};

export default function SupportPage({ searchParams }: { searchParams: { error?: string } }) {
  const enabled = donationsEnabled();
  const error = searchParams.error ? errors[searchParams.error] ?? errors.stripe : null;

  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-20 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-2.5">
          <Link href="/" aria-label="HomeOps"><Logo size={36} /></Link>
          <Link href="/dashboard" className="flex min-h-[44px] items-center text-[15px] font-semibold text-tint">Back to app</Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-10">
        <GlassCard className="space-y-6 p-7 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-tint/10 text-tint"><Coffee className="h-8 w-8" aria-hidden /></span>
          <div>
            <h1 className="text-[28px] font-bold">Buy me a coffee</h1>
            <p className="mt-2 text-[16px] text-secondary">
              HomeOps is free and always will be. If it keeps your home running smoothly and you&apos;d like to support its development, a coffee goes a long way. Thank you!
            </p>
          </div>

          {enabled ? (
            <form method="post" action="/api/donate" className="space-y-4 text-left">
              <fieldset>
                <legend className="field-label">Choose an amount</legend>
                <div className="grid grid-cols-3 gap-2">
                  {COFFEE_PRESETS.map((amt, i) => (
                    <label key={amt} className="cursor-pointer">
                      <input type="radio" name="amount" value={amt} defaultChecked={i === 1} className="peer sr-only" />
                      <span className="flex min-h-[56px] flex-col items-center justify-center rounded-xl border text-[19px] font-bold transition hairline peer-checked:border-tint peer-checked:bg-tint/10 peer-checked:text-tint peer-focus-visible:ring-2 peer-focus-visible:ring-tint/50">
                        ${amt}
                        <span className="text-[11px] font-medium text-secondary">{'☕'.repeat(i + 1)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="field-label">…or enter your own amount (USD)</span>
                <input name="custom" inputMode="decimal" placeholder="e.g. 7.50" className="input" autoComplete="off" />
              </label>
              {error && <p role="alert" className="text-center text-[15px] text-bad">{error}</p>}
              <SubmitButton full><Heart className="h-5 w-5" aria-hidden /> Donate with Stripe</SubmitButton>
              <p className="flex items-center justify-center gap-1.5 text-[12px] text-secondary">
                <Lock className="h-3.5 w-3.5" aria-hidden /> Secure checkout by Stripe. Card details never touch HomeOps.
              </p>
            </form>
          ) : (
            <p className="rounded-xl bg-label/5 px-4 py-3 text-[15px] text-secondary">Donations aren&apos;t switched on yet — check back soon.</p>
          )}
        </GlassCard>
      </main>
    </div>
  );
}
