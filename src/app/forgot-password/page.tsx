import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { ForgotForm } from '@/components/auth-forms';
import { turnstileSiteKey } from '@/lib/turnstile';

export const metadata = { title: 'Forgot password' };

export default function ForgotPage() {
  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your e-mail and we'll send you a link to choose a new one." footer={<Link href="/login" className="font-semibold text-tint">Back to sign in</Link>}>
      <ForgotForm captchaSiteKey={turnstileSiteKey()} />
    </AuthCard>
  );
}
