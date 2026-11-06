import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import AppleButton from '@/components/AppleButton';
import { HouseholdForm } from '@/components/forms';
import { getPrefs } from '@/lib/prefs';

export const metadata = { title: 'Home · Settings' };

export default async function HomeSettings() {
  const { household, role } = await requireHousehold();
  const prefs = await getPrefs();
  return (
    <>
      <PageHeader title="Current home" subtitle="Details of the home you are viewing. Switch homes from the menu." />
      <GlassCard><HouseholdForm name={household.name} address={household.address} disabled={role === 'member'} currency={prefs.currency} climate={household.climate} icon={household.icon} /></GlassCard>
      <AppleButton href="/dashboard/homes" variant="secondary" full>Manage all my homes</AppleButton>
    </>
  );
}
