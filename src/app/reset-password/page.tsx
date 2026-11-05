import Link from 'next/link';
import { peekToken } from '@/lib/accounts';
import AuthCard from '@/components/AuthCard';
import { ResetForm } from '@/components/auth-forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Choose a password', robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? '';
  const row = token ? await peekToken(token) : null;
  if (!row) {
    return (
      <AuthCard title="Link expired" subtitle="This link is invalid or has already been used." footer={<Link href="/forgot-password" className="font-semibold text-tint">Request a new link</Link>}>
        <span />
      </AuthCard>
    );
  }
  return (
    <AuthCard title={row.purpose === 'register' ? 'Choose a password' : 'Set a new password'} subtitle={row.email}>
      <ResetForm token={token} />
    </AuthCard>
  );
}
