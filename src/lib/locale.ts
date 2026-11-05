/** Regional formats (dates, numbers, currency). The interface language stays English. */

export const LOCALES = [
  { code: 'en-US', label: 'English — United States' },
  { code: 'en-GB', label: 'English — United Kingdom' },
  { code: 'en-MY', label: 'English — Malaysia' },
  { code: 'en-SG', label: 'English — Singapore' },
  { code: 'en-AU', label: 'English — Australia' },
  { code: 'en-NZ', label: 'English — New Zealand' },
  { code: 'en-CA', label: 'English — Canada' },
  { code: 'en-IN', label: 'English — India' },
  { code: 'ms-MY', label: 'Bahasa Melayu — Malaysia' },
  { code: 'id-ID', label: 'Bahasa Indonesia' },
  { code: 'zh-CN', label: '中文 — China' },
  { code: 'zh-SG', label: '中文 — Singapore' },
  { code: 'th-TH', label: 'ไทย — Thailand' },
  { code: 'vi-VN', label: 'Tiếng Việt — Vietnam' },
  { code: 'ja-JP', label: '日本語 — Japan' },
  { code: 'ko-KR', label: '한국어 — Korea' },
  { code: 'de-DE', label: 'Deutsch — Germany' },
  { code: 'fr-FR', label: 'Français — France' },
] as const;

export const CURRENCIES = [
  { code: 'USD', label: 'US dollar (USD)' },
  { code: 'MYR', label: 'Malaysian ringgit (MYR)' },
  { code: 'SGD', label: 'Singapore dollar (SGD)' },
  { code: 'BND', label: 'Brunei dollar (BND)' },
  { code: 'IDR', label: 'Indonesian rupiah (IDR)' },
  { code: 'THB', label: 'Thai baht (THB)' },
  { code: 'VND', label: 'Vietnamese dong (VND)' },
  { code: 'PHP', label: 'Philippine peso (PHP)' },
  { code: 'CNY', label: 'Chinese yuan (CNY)' },
  { code: 'HKD', label: 'Hong Kong dollar (HKD)' },
  { code: 'JPY', label: 'Japanese yen (JPY)' },
  { code: 'KRW', label: 'South Korean won (KRW)' },
  { code: 'INR', label: 'Indian rupee (INR)' },
  { code: 'AUD', label: 'Australian dollar (AUD)' },
  { code: 'NZD', label: 'New Zealand dollar (NZD)' },
  { code: 'CAD', label: 'Canadian dollar (CAD)' },
  { code: 'GBP', label: 'British pound (GBP)' },
  { code: 'EUR', label: 'Euro (EUR)' },
] as const;

export type Climate = 'temperate' | 'tropical';
export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_CURRENCY = 'USD';

const REGION_CURRENCY: Record<string, string> = {
  MY: 'MYR', SG: 'SGD', BN: 'BND', ID: 'IDR', TH: 'THB', VN: 'VND', PH: 'PHP', CN: 'CNY', HK: 'HKD', JP: 'JPY', KR: 'KRW',
  IN: 'INR', AU: 'AUD', NZ: 'NZD', CA: 'CAD', GB: 'GBP', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
};
// Year-round warm and wet: monsoon prep and aircon care matter more than frost and furnaces.
const TROPICAL_REGIONS = new Set(['MY', 'SG', 'BN', 'ID', 'TH', 'VN', 'PH', 'KH', 'LA', 'MM', 'LK']);

const region = (locale: string) => locale.split('-')[1]?.toUpperCase() ?? '';
const supported = new Set<string>(LOCALES.map((l) => l.code));

export const isSupportedLocale = (l: string | null | undefined): l is string => !!l && supported.has(l);
export const isSupportedCurrency = (c: string | null | undefined): c is string => !!c && CURRENCIES.some((x) => x.code === c);

export const currencyForLocale = (locale: string): string => REGION_CURRENCY[region(locale)] ?? DEFAULT_CURRENCY;
export const climateForLocale = (locale: string): Climate => (TROPICAL_REGIONS.has(region(locale)) ? 'tropical' : 'temperate');

/** Picks the best supported locale from an Accept-Language header ("ms-MY,ms;q=0.9,en;q=0.8"). */
export function pickLocale(acceptLanguage: string | null | undefined): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const tags = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.trim(), q: q ? Number.parseFloat(q) : 1 };
    })
    .filter((t) => t.tag && t.tag !== '*' && Number.isFinite(t.q))
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const exact = LOCALES.find((l) => l.code.toLowerCase() === tag.toLowerCase());
    if (exact) return exact.code;
    const lang = tag.split('-')[0].toLowerCase();
    const byLang = LOCALES.find((l) => l.code.toLowerCase().startsWith(lang + '-'));
    if (byLang) return byLang.code;
  }
  return DEFAULT_LOCALE;
}

export type Prefs = { locale: string; currency: string };
