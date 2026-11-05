'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import AppleButton from '@/components/AppleButton';

const APPLE_PATH =
  'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';

/** "Continue with Google" / "Continue with Apple". Each button only appears when that provider is configured. */
export default function OAuthButtons({ callbackUrl, google, apple }: { callbackUrl: string; google: boolean; apple: boolean }) {
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const go = (provider: 'google' | 'apple') => {
    setBusy(provider);
    signIn(provider, { callbackUrl });
  };
  return (
    <div className="space-y-3">
      {google && (
        <AppleButton full disabled={busy !== null} onClick={() => go('google')}>
          {busy === 'google' ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="currentColor" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" />
            </svg>
          )}
          Continue with Google
        </AppleButton>
      )}
      {apple && (
        // Apple's guidelines: a solid black (or white in dark surfaces) button with the Apple logo and "Continue with Apple".
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => go('apple')}
          className="inline-flex min-h-[44px] w-full select-none items-center justify-center gap-2 rounded-xl bg-black px-5 text-[17px] font-semibold text-white transition duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-black [[data-theme=dark]_&]:bg-white [[data-theme=dark]_&]:text-black"
        >
          {busy === 'apple' ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={APPLE_PATH} /></svg>
          )}
          Continue with Apple
        </button>
      )}
    </div>
  );
}
