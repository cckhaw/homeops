import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/misc';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

// Geometric bold face used only for the HomeOps wordmark.
const brandFont = Montserrat({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-brand', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')),
  title: { default: 'HomeOps — the digital passport for your home', template: '%s · HomeOps' },
  description: 'Track appliances, warranties and seasonal maintenance in one place. Share a certified Home Service Passport when you sell or rent.',
  manifest: '/manifest.webmanifest',
  applicationName: 'HomeOps',
  appleWebApp: { capable: true, title: 'HomeOps', statusBarStyle: 'default' },
  icons: { apple: '/icons/180' }, // favicon.ico + icon.svg are picked up from src/app/
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={brandFont.variable}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
