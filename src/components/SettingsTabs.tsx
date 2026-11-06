'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SETTINGS_SECTIONS } from './settingsSections';

/** Phones have no left menu: a scrollable row of the Settings pages. Larger screens use the Settings entry in the sidebar. */
export default function SettingsTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Settings pages" className="-mx-4 mb-4 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6 md:hidden">
      <ul className="flex gap-2">
        {SETTINGS_SECTIONS.map(({ id, href, label, icon: Icon }) => (
          <li key={id} className="shrink-0">
            <Link href={href} aria-current={path === href ? 'page' : undefined} className={cn('flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[15px] font-medium hairline transition', path === href ? 'bg-tint text-ontint' : 'bg-surface hover:bg-label/5')}>
              <Icon className={cn('h-[18px] w-[18px]', path === href ? '' : 'text-tint')} aria-hidden />{label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
