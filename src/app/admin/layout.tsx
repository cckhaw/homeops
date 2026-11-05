import Link from 'next/link';
import { ArrowLeft, BarChart3, Settings, Tags, Users } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import AccentScope from '@/components/AccentScope';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };

const links = [
  { href: '/admin', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/brands', label: 'Brands', icon: Tags },
  { href: '/admin/settings', label: 'Site config', icon: Settings },
];

/** Admin guard: unauthenticated users go to /login, signed-in non-admins go back to /dashboard. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <AccentScope />
      <header className="glass sticky top-0 z-20 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-3 py-1.5">
          <Link href="/dashboard" className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-3 text-[15px] text-tint">
            <ArrowLeft className="h-4 w-4" aria-hidden /> App
          </Link>
          <span className="mx-1 shrink-0 text-[15px] font-bold">Admin</span>
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3 text-[15px] font-medium hover:bg-label/5">
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </Link>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
    </div>
  );
}
