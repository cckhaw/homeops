/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The dev-mode status badge (bottom-left) would sit on top of the sidebar's collapse button.
  devIndicators: false,
  eslint: { ignoreDuringBuilds: true },
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
  async rewrites() {
    return [{ source: '/.well-known/apple-developer-domainassociation.txt', destination: '/api/apple-domain-association' }];
  },
  async headers() {
    // Public blog pages don't depend on who is looking, so let the CDN serve them: fast pages rank better, and a scheduled
    // post still appears within five minutes of its time.
    const publicCache = [{ key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' }];
    return [
      { source: '/blog', headers: publicCache },
      { source: '/blog/:path*', headers: publicCache },
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
