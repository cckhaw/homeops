'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, type Prefs } from '@/lib/locale';

const Ctx = createContext<Prefs>({ locale: DEFAULT_LOCALE, currency: DEFAULT_CURRENCY });

export function PrefsProvider({ prefs, children }: { prefs: Prefs; children: React.ReactNode }) {
  return <Ctx.Provider value={prefs}>{children}</Ctx.Provider>;
}

export const usePrefs = () => useContext(Ctx);
