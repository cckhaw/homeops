import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { PasswordChangeForm, TwoFactorSettings } from '@/components/security-forms';
import { ConfirmButton } from '@/components/misc';
import { signOutEverywhere } from '@/app/security-actions';

export const metadata = { title: 'Security · Settings' };

export default async function SecurityPage() {
  const { user } = await requireHousehold();
  return (
    <>
      <PageHeader title="Security" subtitle="Password, two-factor sign-in and your signed-in devices." />
      <GlassCard className="space-y-2"><p className="text-[17px] font-semibold">Password</p><PasswordChangeForm hasPassword={!!user.passwordHash} /></GlassCard>
      <GlassCard><TwoFactorSettings enabled={user.totpEnabled} recoveryLeft={(user.recoveryCodes ? JSON.parse(user.recoveryCodes) : []).length} /></GlassCard>
      <GlassCard className="space-y-3">
        <p className="text-[17px] font-semibold">Signed-in devices</p>
        <p className="text-[15px] text-secondary">You stay signed in on each device for up to 14 days. If you lost a phone or used a shared computer, sign out everywhere: every device, including this one, will need your password again.</p>
        <form action={signOutEverywhere}><ConfirmButton message="Sign out of Wodejia on every device, including this one?">Sign out of all devices</ConfirmButton></form>
      </GlassCard>
    </>
  );
}
