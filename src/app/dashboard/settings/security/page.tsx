import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { PasswordChangeForm, TwoFactorSettings } from '@/components/security-forms';

export const metadata = { title: 'Security · Settings' };

export default async function SecurityPage() {
  const { user } = await requireHousehold();
  return (
    <>
      <PageHeader title="Security" subtitle="Password and two-factor sign-in." />
      <GlassCard className="space-y-2"><p className="text-[17px] font-semibold">Password</p><PasswordChangeForm hasPassword={!!user.passwordHash} /></GlassCard>
      <GlassCard><TwoFactorSettings enabled={user.totpEnabled} recoveryLeft={(user.recoveryCodes ? JSON.parse(user.recoveryCodes) : []).length} /></GlassCard>
    </>
  );
}
