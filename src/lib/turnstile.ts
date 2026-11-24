import 'server-only';

/** Cloudflare Turnstile (free CAPTCHA). Active only when both keys are configured; otherwise everything passes. */
export const turnstileSiteKey = () => (process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY ? process.env.TURNSTILE_SITE_KEY : null);
export const turnstileEnabled = () => !!turnstileSiteKey();

/**
 * Verifies a widget token with Cloudflare. A missing/invalid token fails. When Cloudflare itself is unreachable the check fails OPEN
 * (rate limits still apply) so sign-ups and forms keep working, unless `failClosed` is set: the sign-in step uses that, because it only
 * asks for the check after repeated failures, and an attacker must not be able to switch the protection off by blocking the verify call.
 */
export async function verifyTurnstile(token: FormDataEntryValue | string | null | undefined, ip?: string, opts: { failClosed?: boolean } = {}): Promise<boolean> {
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
    console.error(`Turnstile verification unavailable (${opts.failClosed ? 'refusing' : 'allowing'} request):`, e instanceof Error ? e.message : e);
    return !opts.failClosed;
  }
}

export const CAPTCHA_FAILED = 'Please complete the security check and try again.';
