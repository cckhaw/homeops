/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The dev-mode status badge (bottom-left) would sit on top of the sidebar's collapse button.
  devIndicators: false,
  eslint: { ignoreDuringBuilds: true },
  // Date of this build: the 'last modified' of pages whose content changes with each release (home, sign-up) in sitemap.xml.
  env: { BUILD_DATE: new Date().toISOString() },
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
  async rewrites() {
    return [{ source: '/.well-known/apple-developer-domainassociation.txt', destination: '/api/apple-domain-association' }];
  },
  async headers() {
    return [
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
