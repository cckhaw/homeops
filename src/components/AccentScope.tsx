'use client';

import { useEffect } from 'react';
import { readAccent } from '@/lib/theme';

/**
 * Applies the user's chosen accent colour only while the signed-in app (dashboard/admin) is mounted.
 * Leaving it (e.g. client-side navigation to a public page) restores the default brand blue.
 */
export default function AccentScope() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-accent', readAccent());
    return () => root.removeAttribute('data-accent');
  }, []);
  return null;
}
