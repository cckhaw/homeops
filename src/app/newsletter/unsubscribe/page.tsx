import type { Metadata } from 'next';
import Link from 'next/link';
import { readLink } from '@/lib/newsletter';
import NewsletterConfirm from '@/components/NewsletterConfirm';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';

export const metadata: Metadata = { title: 'Unsubscribe from the newsletter', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const token = (await searchParams).t ?? '';
  const link = readLink(token);
  const ok = link?.kind === 'unsub';
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-5 py-16">
        <h1 className="text-[32px] font-bold tracking-tight">Unsubscribe from the newsletter</h1>
        {ok ? (
          <div className="mt-4 space-y-4">
            <p className="text-[17px] text-secondary">Press the button to stop all Wodejia newsletters to this address. <span className="font-medium text-label">{link!.email}</span></p>
            <NewsletterConfirm token={token} mode="unsub" />
          </div>
        ) : (
          <p className="mt-4 text-[17px] text-secondary">This link has expired or is not valid. <Link href="/blog" className="font-semibold text-tint">Go to the blog</Link> to sign up again.</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
