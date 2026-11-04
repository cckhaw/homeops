export const MIN_DONATION_CENTS = 100; // $1
export const MAX_DONATION_CENTS = 50_000; // $500
export const COFFEE_PRESETS = [3, 5, 10];

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

/** "5", "$5", "4.50" → cents; null if not a valid positive amount. */
export function parseDollarsToCents(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number.parseFloat(cleaned) * 100);
  return Number.isFinite(cents) ? cents : null;
}
