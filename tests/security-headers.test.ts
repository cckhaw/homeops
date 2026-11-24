import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CSP, BASE_HEADERS, pageHeaders } = require('../src/lib/security-headers.js');

describe('security headers', () => {
  const get = (k: string) => BASE_HEADERS.find((h: { key: string }) => h.key === k)?.value as string;
  it('sets the baseline headers', () => {
    expect(get('Strict-Transport-Security')).toMatch(/max-age=31536000/);
    expect(get('X-Content-Type-Options')).toBe('nosniff');
    expect(get('X-Frame-Options')).toBe('DENY');
    expect(get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(get('Permissions-Policy')).toMatch(/microphone=\(\)/);
  });
  it('refuses framing, plug-ins and base hijacking in production', () => {
    const p = CSP(false);
    expect(p).toContain("frame-ancestors 'none'");
    expect(p).toContain("object-src 'none'");
    expect(p).toContain("base-uri 'self'");
    expect(p).not.toContain('unsafe-eval');
    expect(p).toMatch(/script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
    expect(p).toMatch(/frame-src https:\/\/challenges\.cloudflare\.com/);
  });
  it('allows eval and websockets only in development', () => {
    expect(CSP(true)).toContain("'unsafe-eval'");
    expect(CSP(true)).toContain('ws:');
    expect(CSP(false)).not.toContain('ws:');
  });
  it('is applied to pages through one header entry', () => expect(pageHeaders(false)).toHaveLength(1));
});
