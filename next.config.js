const { BASE_HEADERS, pageHeaders } = require('./src/lib/security-headers');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The dev-mode status badge (bottom-left) would sit on top of the sidebar's collapse button.
  devIndicators: false,
  // Lint runs as its own step (npm run lint, in CI and before every deploy); `next build` also fails on lint errors.
  // Date of this build: the 'last modified' of pages whose content changes with each release (home, sign-up) in sitemap.xml.
  env: { BUILD_DATE: new Date().toISOString() },
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
  async rewrites() {
    return [{ source: '/.well-known/apple-developer-domainassociation.txt', destination: '/api/apple-domain-association' }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: BASE_HEADERS },
      { source: '/((?!api/|brand-asset/).*)', headers: pageHeaders(process.env.NODE_ENV !== 'production') },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
