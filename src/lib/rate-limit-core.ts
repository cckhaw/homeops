/** Pure helpers for rate limiting (no I/O, so they are unit-tested). */

export const TOO_MANY = 'Too many attempts. Please wait a few minutes and try again.';

/** Start (ms) of the fixed window that contains `nowMs`. */
export function windowStartMs(nowMs: number, windowSec: number): number {
  const w = windowSec * 1000;
  return Math.floor(nowMs / w) * w;
}

type HeaderBag = { get(name: string): string | null } | Record<string, string | string[] | undefined>;

function header(h: HeaderBag, name: string): string | undefined {
  if (typeof (h as { get?: unknown }).get === 'function') return (h as { get(n: string): string | null }).get(name) ?? undefined;
  const v = (h as Record<string, string | string[] | undefined>)[name] ?? (h as Record<string, string | string[] | undefined>)[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * The caller's IP as set by the hosting platform. On Vercel `x-forwarded-for` is overwritten by the edge, so its first
 * entry is the real client. Anything that is not a plausible IP is ignored; the fallback keeps limits working (shared bucket).
 */
export function clientIpFrom(h: HeaderBag): string {
  const raw = header(h, 'x-forwarded-for')?.split(',')[0]?.trim() || header(h, 'x-real-ip')?.trim() || '';
  return /^[0-9a-fA-F:.]{3,45}$/.test(raw) ? raw : 'unknown';
}
