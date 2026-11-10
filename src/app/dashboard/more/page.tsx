import Link from 'next/link';
import { BarChart3, Building2, ChevronRight, CircleHelp, Coffee, Landmark, FileArchive, FolderLock, HardHat, QrCode, Receipt, Settings, ShieldCheck } from 'lucide-react';
import { donationsEnabled } from '@/lib/donate';
import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';

export const metadata = { title: 'More' };

const GROUPS = [
  {
    title: 'Records',
    items: [
      { href: '/dashboard/documents', label: 'Document vault', hint: 'Insurance, mortgage, deeds', icon: FolderLock },
      { href: '/dashboard/contractors', label: 'Contractors', hint: 'Plumber, electrician, …', icon: HardHat },
      { href: '/dashboard/bills', label: 'Utility bills', hint: 'Track spend, spot spikes', icon: Receipt },
      { href: '/dashboard/property', label: 'Property dates', hint: 'Quit rent, property tax, condo fees', icon: Landmark },
      { href: '/dashboard/reports', label: 'Spending', hint: 'Yearly report', icon: BarChart3 },
    ],
  },
  {
    title: 'Share and print',
    items: [
      { href: '/dashboard/pack', label: 'Move-out pack', hint: 'Everything for a buyer or tenant', icon: FileArchive },
      { href: '/dashboard/labels', label: 'QR labels', hint: 'Stickers for appliances', icon: QrCode },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/dashboard/homes', label: 'My homes', hint: 'Switch, edit or add homes', icon: Building2 },
      { href: '/dashboard/settings', label: 'Settings', hint: 'Reminders, security, appearance', icon: Settings },
    ],
  },
];

export default async function MorePage() {
  const { user } = await requireHousehold();
  const groups = [...GROUPS];
  groups.push({
    title: 'Support',
    items: [
      { href: '/dashboard/help', label: 'Help & FAQ', hint: 'Answers to common questions', icon: CircleHelp },
      ...(donationsEnabled() ? [{ href: '/support', label: 'Buy me a coffee', hint: 'Support Wodejia', icon: Coffee }] : []),
    ],
  });
  if (user.isAdmin) groups.push({ title: 'Admin', items: [{ href: '/admin', label: 'Admin portal', hint: 'Users, blog, branding, site config', icon: ShieldCheck }] });
  return (
    <>
      <PageHeader title="More" />
      {groups.map((g) => (
        <section key={g.title} className="mb-6">
          <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-secondary">{g.title}</h2>
          <GlassCard className="py-1">
            <ul className="divide-y hairline [&>li]:border-inherit">
              {g.items.map(({ href, label, hint, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="flex min-h-[56px] items-center gap-3 py-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-tint/10 text-tint"><Icon className="h-5 w-5" aria-hidden /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[16px] font-medium">{label}</span><span className="block text-[13px] text-secondary">{hint}</span></span>
                    <ChevronRight className="h-4 w-4 text-secondary" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </GlassCard>
        </section>
      ))}
    </>
  );
}
