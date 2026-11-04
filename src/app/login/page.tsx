import { redirect } from 'next/navigation';
import { Home } from 'lucide-react';
import { getCurrentUser, googleEnabled } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import GoogleButton from './GoogleButton';
import { MagicLinkForm } from '@/components/forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in' };

const errors: Record<string, string> = {
  OAuthAccountNotLinked: 'That e-mail is already registered with a different sign-in method.',
  AccessDenied: 'Sign-in was cancelled or denied.',
  CredentialsSignin: 'That sign-in link is invalid or has expired. Request a new one.',
};

export default async function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  if (await getCurrentUser()) redirect('/dashboard');
  const callbackUrl = searchParams.callbackUrl?.startsWith('/') ? searchParams.callbackUrl : '/dashboard';
  const error = searchParams.error ? errors[searchParams.error] ?? 'Something went wrong signing you in. Please try again.' : null;

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <GlassCard className="w-full max-w-sm space-y-6 p-7 shadow-xl">
        <div className="text-center">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[16px] bg-tint text-white"><Home className="h-8 w-8" aria-hidden /></span>
          <h1 className="text-[28px] font-bold">Welcome to HomeOps</h1>
          <p className="mt-1 text-[15px] text-secondary">Enter your e-mail and we'll send you a sign-in link — no password needed.</p>
        </div>
        {error && <p role="alert" className="rounded-xl bg-bad/10 px-3 py-2.5 text-center text-[14px] text-bad">{error}</p>}
        <MagicLinkForm />
        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 text-[13px] text-secondary" aria-hidden>
              <span className="hairline h-px flex-1 border-t" /> or <span className="hairline h-px flex-1 border-t" />
            </div>
            <GoogleButton callbackUrl={callbackUrl} />
          </>
        )}
      </GlassCard>
    </main>
  );
}
