import type { Metadata } from 'next';
import Link from 'next/link';
import { livePosts } from '@/lib/blog';
import { siteBaseUrl } from '@/lib/donate';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import BlogList from '@/components/BlogList';

// Incremental static regeneration: the page is cached at the CDN and refreshed every minute (and at once when an admin saves),
// so a scheduled post appears about a minute after its time. Public pages must not depend on cookies or the visitor.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Blog: home care guides for Singapore and Malaysia',
  description: 'Practical guides on home maintenance, appliance warranties and keeping your home organised, from the Wodejia team.',
  alternates: { canonical: '/blog', types: { 'application/rss+xml': '/blog/rss.xml' } },
  openGraph: { type: 'website', title: 'The Wodejia blog', description: 'Practical guides on home maintenance, appliance warranties and keeping your home organised.', url: '/blog' },
};

export default async function BlogIndex() {
  const posts = await livePosts(20);
  const base = siteBaseUrl('http://localhost:3000');
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Wodejia blog',
    url: `${base}/blog`,
    inLanguage: 'en',
    publisher: { '@type': 'Organization', name: 'Wodejia', url: base },
    blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${base}/blog/${p.slug}`, datePublished: p.publishAt?.toISOString() })),
  };
  return (
    <div className="min-h-dvh">
      <SiteHeader active="blog" />
      <main>
        <BlogList />
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="rounded-[28px] bg-tint px-6 py-12 text-center text-ontint sm:px-12">
            <h2 className="text-balance text-[28px] font-bold leading-tight tracking-tight sm:text-[36px]">Put the advice on autopilot.</h2>
            <p className="mx-auto mt-3 max-w-xl text-[17px] opacity-90">Wodejia keeps your appliances, warranties and maintenance in one place and reminds you before anything slips.</p>
            <Link href="/register" className="mt-6 inline-flex min-h-[50px] items-center justify-center rounded-xl bg-white px-7 text-[17px] font-semibold text-black shadow-lg transition active:scale-[0.97]">Get started — it&apos;s free</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </div>
  );
}
