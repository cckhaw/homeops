/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The dev-mode status badge (bottom-left) would sit on top of the sidebar's collapse button.
  devIndicators: false,
  eslint: { ignoreDuringBuilds: true },
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
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
