'use client';

import { createContext, useContext } from 'react';
import { defaultBrands, type BrandRecord } from '@/lib/brands';

// Default = the built-in list, so components still work if rendered outside a provider.
const Ctx = createContext<BrandRecord[]>(defaultBrands());

export function BrandsProvider({ brands, children }: { brands: BrandRecord[]; children: React.ReactNode }) {
  return <Ctx.Provider value={brands}>{children}</Ctx.Provider>;
}

export const useBrands = () => useContext(Ctx);
