import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { livePosts } from '@/lib/blog';
import { categoryFromSlug, categorySlug } from '@/lib/blog-core';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import BlogList from '@/components/BlogList';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ category: string }> };

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
