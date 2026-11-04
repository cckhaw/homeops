import AppShell from '@/components/AppShell';
import { LiveRefresh } from '@/components/misc';
import { requireHousehold } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, household, homes } = await requireHousehold();
  return (
    <>
      <AppShell isAdmin={!!user.isAdmin} homes={homes} activeId={household.id}>
        {children}
      </AppShell>
      <LiveRefresh />
    </>
  );
}
