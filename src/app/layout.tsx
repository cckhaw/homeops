import type { Metadata, Viewport } from 'next';
import { SiteBrandProvider } from '@/components/Logo';
import { siteBrand } from '@/lib/brand';
import localFont from 'next/font/local';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/misc';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

// Geometric bold face used only for the Wodejia wordmark. Bundled in the repo (see app/fonts/README.md) so builds need no network.
const brandFont = localFont({ src: './fonts/montserrat-latin.woff2', weight: '100 900', variable: '--font-brand', display: 'swap' });

const baseMetadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')),
  title: { default: 'Wodejia — the digital passport for your home', template: '%s · Wodejia' },
  description: 'Track appliances, warranties and seasonal maintenance in one place. Share a certified Home Service Passport when you sell or rent.',
  manifest: '/manifest.webmanifest',
  openGraph: { type: 'website', siteName: 'Wodejia', title: 'Wodejia — the digital passport for your home', description: 'Track appliances, warranties and seasonal maintenance in one place.' },
  twitter: { card: 'summary_large_image' },
  applicationName: 'Wodejia',
  appleWebApp: { capable: true, title: 'Wodejia', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export async function generateMetadata(): Promise<Metadata> {
  const b = await siteBrand();
  const v = b.icon ? `?${b.icon.split('?')[1]}` : '';
  return {
    ...baseMetadata,
    icons: {
      icon: b.icon ? [{ url: b.icon }] : [{ url: '/favicon.ico?v=3', sizes: 'any' }, { url: '/brand/icon.svg?v=3', type: 'image/svg+xml' }],
      apple: `/icons/180${v}`,
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F5F7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await siteBrand();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={brandFont.variable}>
        <SiteBrandProvider value={{ logo: brand.logo, icon: brand.icon }}>{children}</SiteBrandProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
