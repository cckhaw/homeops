import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { HouseholdForm, ProfileForm } from '@/components/forms';
import SignOutButton from './SignOutButton';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { user, household, role } = await requireHousehold();
  return (
    <>
      <PageHeader title="Settings" />
      <h2 className="mb-2 px-1 text-[22px] font-bold">Account</h2>
      <GlassCard className="mb-8"><ProfileForm fullName={user.fullName} email={user.email} /></GlassCard>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Home</h2>
      <GlassCard className="mb-8"><HouseholdForm name={household.name} address={household.address} disabled={role === 'member'} /></GlassCard>
      <SignOutButton />
    </>
  );
}
