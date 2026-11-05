export const MIN_DONATION_CENTS = 100; // 1.00 in the donation currency
export const MAX_DONATION_CENTS = 50_000; // 500.00
export const COFFEE_PRESETS = [3, 5, 10];

/** ISO currency code from STRIPE_CURRENCY (e.g. "SGD"); falls back to USD when unset or not a 3-letter code. */
export function donationCurrency(): string {
  const c = (process.env.STRIPE_CURRENCY ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : 'USD';
}

/** "SGD 5" style amounts rendered with the currency's own symbol, e.g. "S$5" or "$5". */
export function formatDonation(amount: number, currency = donationCurrency()): string {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** Donations are on when Stripe is configured, or a hosted Stripe Payment Link / Buy Me a Coffee URL is supplied. */
export function donationsEnabled(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY || process.env.DONATE_URL);
}

export function siteBaseUrl(fallbackOrigin: string): string {
  return (
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : fallbackOrigin)
  ).replace(/\/$/, '');
}

/** "5", "$5", "1,000", "4.50" → cents; null for anything else (negatives, exponents, letters, >2 decimals). */
export function parseDollarsToCents(input: string | null | undefined): number | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!/^\$?\s*\d[\d,]*(\.\d{1,2})?$/.test(trimmed)) return null;
  const cents = Math.round(Number.parseFloat(trimmed.replace(/[$,\s]/g, '')) * 100);
  return Number.isFinite(cents) ? cents : null;
}
