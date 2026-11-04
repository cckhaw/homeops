'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import GlassCard from '@/components/GlassCard';
import AppleButton from '@/components/AppleButton';

// Sign-in needs an explicit tap so e-mail link scanners can't burn the one-time token.
export default function VerifyClient({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <GlassCard className="w-full max-w-sm space-y-4 p-7 text-center">
        <h1 className="text-[26px] font-bold">Confirm sign-in</h1>
        <p className="text-[15px] text-secondary">Tap below to finish signing in to HomeOps.</p>
        <AppleButton
          full
          disabled={!token || busy}
          onClick={() => {
            setBusy(true);
            signIn('magic-link', { token, callbackUrl: '/dashboard' });
          }}
        >
          Sign in
        </AppleButton>
        {!token && <p role="alert" className="text-[14px] text-bad">This link is missing its token. Request a new one.</p>}
      </GlassCard>
    </main>
  );
}
