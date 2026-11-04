import Navbar from '@/components/Navbar';
import { LiveRefresh } from '@/components/misc';
import { requireHousehold } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, household } = await requireHousehold();
  return (
    <div className="min-h-dvh">
      <Navbar isAdmin={!!user.isAdmin} homeName={household.name} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6 md:ml-64 md:max-w-none md:pb-12 md:pl-10 md:pr-10 lg:[&>*]:max-w-3xl">
        {children}
      </main>
      <LiveRefresh />
    </div>
  );
}
