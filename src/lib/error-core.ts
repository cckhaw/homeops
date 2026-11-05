import { createHash } from 'crypto';

/** Pure helpers for our error tracking (no I/O, so they are unit-tested). */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const TOKEN = /\b[A-Za-z0-9_-]{24,}\b/g;

/** Removes anything that could identify a person or act as a secret before an error is stored. */
export function sanitizeText(s: string, max = 400): string {
  return s
    .replace(EMAIL, '[email]')
    .replace(UUID, '[id]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [token]')
    .replace(TOKEN, '[token]')
    .slice(0, max);
}

/** "/passport/AbC…/x?y=1" → "/passport/[id]/x": store route patterns, never real URLs. */
export function normalizeRoute(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.split(/[?#]/)[0];
  const out = clean
    .split('/')
    .map((seg) => (/^\d+$/.test(seg) || /^[0-9a-f-]{32,36}$/i.test(seg) || seg.length >= 20 ? '[id]' : seg))
    .join('/');
  return out.slice(0, 200) || '/';
}

const BENIGN = [
  'NEXT_REDIRECT', 'NEXT_NOT_FOUND', 'NEXT_HTTP_ERROR_FALLBACK', 'DYNAMIC_SERVER_USAGE', 'BAILOUT_TO_CLIENT_SIDE_RENDERING',
  'AbortError', 'aborted', 'ResizeObserver loop', 'ChunkLoadError', 'Loading chunk', 'Failed to fetch', 'Load failed', 'NetworkError',
];

/** Control-flow signals and browser noise that are not bugs. */
export function isBenign(message: string, digest?: string | null): boolean {
  const hay = `${message} ${digest ?? ''}`;
  return BENIGN.some((b) => hay.includes(b));
}

/** Same bug → same fingerprint, however many times and for whomever it happens. */
export function fingerprint(source: string, route: string | null, message: string): string {
  return createHash('sha256').update(`${source}|${route ?? ''}|${message}`).digest('hex').slice(0, 24);
}
