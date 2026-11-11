import AccentScope from '@/components/AccentScope';
import AppShell from '@/components/AppShell';
import { LiveRefresh } from '@/components/misc';
import { requireHousehold } from '@/lib/auth';
import { donationsEnabled } from '@/lib/donate';
import { BrandsProvider } from '@/components/BrandsProvider';
import { getBrands } from '@/lib/brand-store';
import { PrefsProvider } from '@/components/PrefsProvider';
import { getPrefs } from '@/lib/prefs';
import DemoBanner from '@/components/DemoBanner';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, household, homes } = await requireHousehold();
  const [brands, prefs] = await Promise.all([getBrands(), getPrefs()]);
  return (
    <BrandsProvider brands={brands}>
      <PrefsProvider prefs={prefs}>
      <AccentScope />
      <AppShell isAdmin={!!user.isAdmin} homes={homes} activeId={household.id} donate={donationsEnabled()}>
        {user.isDemo && <DemoBanner />}
        {children}
      </AppShell>
      <LiveRefresh />
      </PrefsProvider>
    </BrandsProvider>
  );
}
