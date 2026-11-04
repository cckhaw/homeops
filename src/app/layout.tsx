import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/misc';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')),
  title: { default: 'HomeOps — the digital passport for your home', template: '%s · HomeOps' },
  description: 'Track appliances, warranties and seasonal maintenance in one place. Share a certified Home Service Passport when you sell or rent.',
  manifest: '/manifest.webmanifest',
  applicationName: 'HomeOps',
  appleWebApp: { capable: true, title: 'HomeOps', statusBarStyle: 'default' },
  icons: { icon: '/icons/192', apple: '/icons/180' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F5F7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
