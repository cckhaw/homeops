'use client';

import { useEffect, useState } from 'react';
import Navbar from './Navbar';
import { cn } from '@/lib/utils';

const KEY = 'homeops-sidebar';

/** Layout frame: collapsible sidebar + full-width content area. */
export default function AppShell({ isAdmin, homes, activeId, donate, children }: { isAdmin: boolean; donate?: boolean; homes: { id: string; name: string }[]; activeId: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(KEY) === '1');
    } catch {}
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? '0' : '1');
      } catch {}
      return !c;
    });

  return (
    <div className="min-h-dvh">
      <Navbar isAdmin={isAdmin} homes={homes} activeId={activeId} collapsed={collapsed} onToggle={toggle} donate={donate} />
      <main className={cn('w-full px-4 pb-28 pt-[76px] transition-[padding] duration-200 md:px-8 md:pb-12 md:pt-8', collapsed ? 'md:pl-[108px]' : 'md:pl-[288px]')}>
        {children}
      </main>
    </div>
  );
}
