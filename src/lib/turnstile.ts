import 'server-only';

/** Cloudflare Turnstile (free CAPTCHA). Active only when both keys are configured; otherwise everything passes. */
export const turnstileSiteKey = () => (process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY ? process.env.TURNSTILE_SITE_KEY : null);
export const turnstileEnabled = () => !!turnstileSiteKey();

/** Verifies a widget token with Cloudflare. A missing/invalid token fails; a Cloudflare outage fails OPEN (rate limits still apply). */
export async function verifyTurnstile(token: FormDataEntryValue | string | null | undefined, ip?: string): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  const t = typeof token === 'string' ? token : '';
  if (!t || t.length > 4096) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: t });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);
    const res = await fetch(process.env.TURNSTILE_VERIFY_URL ?? 'https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch (e) {
    console.error('Turnstile verification unavailable (allowing request):', e instanceof Error ? e.message : e);
    return true;
  }
}

export const CAPTCHA_FAILED = 'Please complete the security check and try again.';
