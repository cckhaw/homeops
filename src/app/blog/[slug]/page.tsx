import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { livePostBySlug, relatedPosts } from '@/lib/blog';
import { siteBaseUrl } from '@/lib/donate';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import BlogArticle from '@/components/BlogArticle';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await livePostBySlug(slug).catch(() => null);
  if (!post) return { title: 'Post not found', robots: { index: false } };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    keywords: post.tags.split(',').filter(Boolean),
    openGraph: { type: 'article', title: post.title, description: post.excerpt, url: `/blog/${post.slug}`, publishedTime: post.publishAt?.toISOString(), authors: [post.authorName], tags: post.tags.split(',').filter(Boolean) },
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await livePostBySlug(slug);
  if (!post) notFound(); // drafts and not-yet-scheduled posts are indistinguishable from missing ones
  const related = await relatedPosts(post);
  const base = siteBaseUrl('http://localhost:3000');
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: post.authorName },
    publisher: { '@type': 'Organization', name: 'HomeOps', url: base },
    mainEntityOfPage: `${base}/blog/${post.slug}`,
    keywords: post.tags,
  };
  return (
    <div className="min-h-dvh">
      <SiteHeader active="blog" />
      <main className="pb-20"><BlogArticle post={post} related={related} /></main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </div>
  );
}
