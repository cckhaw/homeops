import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { HouseholdForm, ProfileForm } from '@/components/forms';
import SignOutButton from './SignOutButton';
import AppearanceSettings from '@/components/AppearanceSettings';
import AppleButton from '@/components/AppleButton';
import { donationsEnabled } from '@/lib/donate';
import { emailConfigured } from '@/lib/email';
import { PasswordChangeForm, ReminderForm, TwoFactorSettings } from '@/components/security-forms';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { user, household, role } = await requireHousehold();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid items-start gap-x-8 xl:grid-cols-2">
      <div>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Appearance</h2>
      <GlassCard className="mb-8"><AppearanceSettings /></GlassCard>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Notifications</h2>
      <GlassCard className="mb-8"><ReminderForm on={user.notifyReminders} lead={user.reminderLeadDays} emailReady={emailConfigured()} /></GlassCard>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Account</h2>
      <GlassCard className="mb-8"><ProfileForm fullName={user.fullName} email={user.email} /></GlassCard>
      </div>
      <div>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Security</h2>
      <GlassCard className="mb-4 space-y-2"><p className="text-[17px] font-semibold">Password</p><PasswordChangeForm hasPassword={!!user.passwordHash} /></GlassCard>
      <GlassCard className="mb-8"><TwoFactorSettings enabled={user.totpEnabled} recoveryLeft={(user.recoveryCodes ? JSON.parse(user.recoveryCodes) : []).length} /></GlassCard>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Current home</h2>
      <GlassCard className="mb-8"><HouseholdForm name={household.name} address={household.address} disabled={role === 'member'} /></GlassCard>
      {donationsEnabled() && (
        <AppleButton href="/support" variant="secondary" full className="mb-3">☕ Buy me a coffee</AppleButton>
      )}
      <AppleButton href="/dashboard/homes" variant="secondary" full className="mb-3">Manage all my homes</AppleButton>
      <SignOutButton />
      </div>
      </div>
    </>
  );
}
