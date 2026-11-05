'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import AuthCard from '@/components/AuthCard';
import AppleButton from '@/components/AppleButton';
import { reportClientError } from '@/app/error-actions';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    // Server-side failures carry a digest and were already recorded by the server; report browser-only errors.
    if (!error.digest) void reportClientError(error.message, window.location.pathname);
  }, [error]);
  return (
    <AuthCard title="Something went wrong" subtitle="An unexpected error happened. Your data is safe.">
      <div className="space-y-3 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warn/10 text-warn"><TriangleAlert className="h-7 w-7" aria-hidden /></span>
        <AppleButton type="button" onClick={reset} full>Try again</AppleButton>
        <AppleButton href="/" variant="plain" full>Back to the home page</AppleButton>
        {error.digest && <p className="text-[12px] text-secondary">Reference: {error.digest}</p>}
      </div>
    </AuthCard>
  );
}
