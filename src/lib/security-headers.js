/**
 * Security headers for every response (next.config.js). Plain CommonJS so the config file can require it.
 *
 * The CSP keeps 'unsafe-inline' for scripts and styles: Next.js writes inline bootstrap scripts, and a per-request nonce
 * would force every public page to be rendered on demand instead of cached. Everything else is locked down: framing is
 * refused, plug-ins and <base> hijacking are blocked, and scripts may only come from this site and Cloudflare Turnstile.
 */
const CSP = (dev) =>
  [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:", // brand logos can come from favicon services
    "font-src 'self' data:",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    'frame-src https://challenges.cloudflare.com',
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
  ].join('; ');

/** Applied to every path, including /api. */
const BASE_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
];

/** Pages only: the file routes (under /api, and /brand-asset) send their own stricter policy. */
const pageHeaders = (dev) => [{ key: 'Content-Security-Policy', value: CSP(dev) }];

module.exports = { CSP, BASE_HEADERS, pageHeaders };
