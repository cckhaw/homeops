import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { livePosts } from '@/lib/blog';
import { BLOG_CATEGORIES, categoryFromSlug, categorySlug } from '@/lib/blog-core';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import BlogList from '@/components/BlogList';

// Incremental static regeneration: the page is cached at the CDN and refreshed every 5 minutes (and at once when an admin saves),
// so a scheduled post appears within five minutes of its time. Public pages must not depend on cookies or the visitor.
export const revalidate = 300;

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return BLOG_CATEGORIES.map((c) => ({ category: categorySlug(c) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = categoryFromSlug((await params).category);
  if (!category) return { title: 'Category not found', robots: { index: false } };
  return {
    title: `${category} guides for your home`,
    description: `Practical ${category.toLowerCase()} advice for homes in Singapore, Malaysia and beyond, from the HomeOps team.`,
    alternates: { canonical: `/blog/category/${categorySlug(category)}` },
  };
}

export default async function BlogCategory({ params }: Props) {
  const category = categoryFromSlug((await params).category);
  if (!category) notFound();
  if (!(await livePosts()).some((p) => p.category === category)) notFound(); // empty categories aren't indexable pages
  return (
    <div className="min-h-dvh">
      <SiteHeader active="blog" />
      <main>
        <BlogList category={category} />
        <p className="px-5 pb-16 text-center"><Link href="/blog" className="text-[15px] font-semibold text-tint">← All posts</Link></p>
      </main>
      <SiteFooter />
    </div>
  );
}
