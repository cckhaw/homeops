import Link from 'next/link';
import { redirect } from 'next/navigation';
import { appleEnabled, getCurrentUser, googleEnabled } from '@/lib/auth';
import { turnstileSiteKey } from '@/lib/turnstile';
import AuthCard from '@/components/AuthCard';
import { LoginForm } from '@/components/auth-forms';
import OAuthButtons from './OAuthButtons';
import DemoLoginCard from '@/components/DemoLoginCard';
import { getDemoPublic } from '@/lib/demo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in' };

const errors: Record<string, string> = {
  OAuthAccountNotLinked: 'That e-mail is already registered with a different sign-in method.',
  AccessDenied: 'Sign-in was cancelled or denied.',
};

export default async function LoginPage({ searchParams: sp }: { searchParams: Promise<{ callbackUrl?: string; error?: string; changed?: string; reset?: string }> }) {
  const searchParams = await sp;
  if (await getCurrentUser()) redirect('/dashboard');
  const cb = searchParams.callbackUrl;
  const callbackUrl = cb && cb.startsWith('/') && !cb.startsWith('//') ? cb : '/dashboard';
  const oauthError = searchParams.error && searchParams.error !== 'CredentialsSignin' ? errors[searchParams.error] ?? 'Something went wrong signing you in. Please try again.' : null;
  const demo = await getDemoPublic();
  const notice = searchParams.changed ? 'Your password was changed. Please sign in again.' : searchParams.reset ? 'Password saved. Sign in with your new password.' : null;

  return (
    <AuthCard
      title="Welcome to Wodejia"
      subtitle="Sign in with your e-mail and password."
      footer={<>New here? <Link href="/register" className="font-semibold text-tint">Create an account</Link></>}
    >
      {oauthError && <p role="alert" className="rounded-xl bg-bad/10 px-3 py-2.5 text-center text-[14px] text-bad">{oauthError}</p>}
      {demo && <DemoLoginCard email={demo.email} password={demo.password} callbackUrl={callbackUrl} />}
      <LoginForm callbackUrl={callbackUrl} notice={notice} captchaSiteKey={turnstileSiteKey()} />
      {(googleEnabled || appleEnabled) && (
        <>
          <div className="flex items-center gap-3 text-[13px] text-secondary" aria-hidden>
            <span className="hairline h-px flex-1 border-t" /> or <span className="hairline h-px flex-1 border-t" />
          </div>
          <OAuthButtons callbackUrl={callbackUrl} google={googleEnabled} apple={appleEnabled} />
        </>
      )}
    </AuthCard>
  );
}
