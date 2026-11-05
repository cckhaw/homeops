import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { requireHousehold } from '@/lib/auth';
import { currencyForLocale, isSupportedCurrency, isSupportedLocale, pickLocale, type Prefs } from '@/lib/locale';

/** Locale: the user's saved choice, else the browser's language. Currency: the home's choice, else the locale's country. */
export function resolvePrefs(
  user: { locale: string | null },
  home: { currency: string | null },
  acceptLanguage: string | null,
): Prefs {
  const locale = isSupportedLocale(user.locale) ? user.locale : pickLocale(acceptLanguage);
  const currency = isSupportedCurrency(home.currency) ? home.currency : currencyForLocale(locale);
  return { locale, currency };
}

/** Preferences for the signed-in user's active home (dashboard pages). */
export const getPrefs = cache(async (): Promise<Prefs> => {
  const { user, household } = await requireHousehold();
  return resolvePrefs(user, household, (await headers()).get('accept-language'));
});

/** Preferences for an anonymous visitor viewing a public passport: the home's currency, the visitor's browser format. */
export async function getPublicPrefs(home: { currency: string | null }): Promise<Prefs> {
  return resolvePrefs({ locale: null }, home, (await headers()).get('accept-language'));
}
