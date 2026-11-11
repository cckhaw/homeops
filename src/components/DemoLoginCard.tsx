'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Sparkles } from 'lucide-react';
import AppleButton from './AppleButton';

/** "Just looking?" card on the sign-in page: the public demo credentials and a one-press sign-in. */
export default function DemoLoginCard({ email, password, callbackUrl }: { email: string; password: string; callbackUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function go() {
    setBusy(true);
    setError(undefined);
    const r = await signIn('credentials', { email, password, redirect: false, callbackUrl });
    if (r?.ok) window.location.assign(r.url ?? callbackUrl);
    else { setError(r?.error === 'DEMO_BUSY' ? 'The demo is very busy right now. Please try again in a few minutes.' : 'The demo could not be started. Please try again.'); setBusy(false); }
  }
  return (
    <section id="demo" aria-labelledby="demo-h" className="rounded-2xl border bg-tint/5 p-4" data-testid="demo-card">
      <h2 id="demo-h" className="flex items-center gap-2 text-[16px] font-bold"><Sparkles className="h-4 w-4 text-tint" aria-hidden />Just looking? Try the live demo</h2>
      <p className="mt-1 text-[14px] text-secondary">Explore twelve sample homes with everything filled in. Nothing you do is saved to a real account.</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[14px]"><dt className="text-secondary">E-mail</dt><dd className="select-all font-mono" data-testid="demo-email">{email}</dd><dt className="text-secondary">Password</dt><dd className="select-all font-mono" data-testid="demo-password">{password}</dd></dl>
      <AppleButton type="button" className="mt-3" full disabled={busy} onClick={go}>{busy ? 'Setting up your demo…' : 'Sign in to the demo'}</AppleButton>
      {error && <p role="alert" className="mt-2 text-[14px] text-bad">{error}</p>}
    </section>
  );
}
