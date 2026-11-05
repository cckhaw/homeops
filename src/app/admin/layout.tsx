import AccentScope from '@/components/AccentScope';
import AdminNav from '@/components/AdminNav';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };

/** Admin guard: unauthenticated users go to /login, signed-in non-admins go back to /dashboard. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <AccentScope />
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 md:pb-16">{children}</main>
    </div>
  );
}
