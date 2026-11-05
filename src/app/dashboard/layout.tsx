import AccentScope from '@/components/AccentScope';
import AppShell from '@/components/AppShell';
import { LiveRefresh } from '@/components/misc';
import { requireHousehold } from '@/lib/auth';
import { donationsEnabled } from '@/lib/donate';
import { BrandsProvider } from '@/components/BrandsProvider';
import { getBrands } from '@/lib/brand-store';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, household, homes } = await requireHousehold();
  const brands = await getBrands();
  return (
    <BrandsProvider brands={brands}>
      <AccentScope />
      <AppShell isAdmin={!!user.isAdmin} homes={homes} activeId={household.id} donate={donationsEnabled()}>
        {children}
      </AppShell>
      <LiveRefresh />
    </BrandsProvider>
  );
}
