import { NextResponse } from 'next/server';
import { MAX_DONATION_CENTS, MIN_DONATION_CENTS, parseDollarsToCents, donationCurrency, siteBaseUrl } from '@/lib/donate';
import { enforceIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const back = (base: string, error: string) => NextResponse.redirect(`${base}/support?error=${error}`, 303);

/**
 * Creates a Stripe Checkout Session for a one-off donation and redirects the visitor to Stripe's hosted page.
 * No card data ever touches this server. Amount is validated here, never trusted from the client.
 */
export async function POST(req: Request) {
  const base = siteBaseUrl(new URL(req.url).origin);
  if (await enforceIp('donate', 15, 3600)) return back(base, 'rate');
  const form = await req.formData().catch(() => null);
  const custom = String(form?.get('custom') ?? '').trim();
  const cents = parseDollarsToCents(custom || String(form?.get('amount') ?? ''));
  if (cents === null || cents < MIN_DONATION_CENTS || cents > MAX_DONATION_CENTS) return back(base, 'amount');

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Fallback: a hosted Stripe Payment Link (or similar) the owner configured.
    const link = process.env.DONATE_URL;
    if (link && /^https:\/\//.test(link)) return NextResponse.redirect(link, 303);
    return back(base, 'unavailable');
  }

  const params = new URLSearchParams({
    mode: 'payment',
    submit_type: 'donate',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': donationCurrency().toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(cents),
    'line_items[0][price_data][product_data][name]': 'Buy me a coffee ☕ — support HomeOps',
    'custom_text[submit][message]': 'Thank you for supporting HomeOps!',
    success_url: `${base}/support/thanks`,
    cancel_url: `${base}/support`,
  });

  try {
    const res = await fetch(`${process.env.STRIPE_API_URL ?? 'https://api.stripe.com'}/v1/checkout/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const data = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !data.url) {
      console.error('Stripe checkout failed:', res.status, data.error?.message);
      return back(base, 'stripe');
    }
    return NextResponse.redirect(data.url, 303);
  } catch (err) {
    console.error('Stripe request error:', err instanceof Error ? err.message : err);
    return back(base, 'stripe');
  }
}
