import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { emailConfigured } from '@/lib/email';
import { turnstileSiteKey } from '@/lib/turnstile';
import AuthCard from '@/components/AuthCard';
import { RegisterForm } from '@/components/auth-forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create account' };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <AuthCard title="Create your account" subtitle="Free, and it takes a minute." footer={<>Already have an account? <Link href="/login" className="font-semibold text-tint">Sign in</Link></>}>
      <RegisterForm emailReady={emailConfigured()} captchaSiteKey={turnstileSiteKey()} />
    </AuthCard>
  );
}
