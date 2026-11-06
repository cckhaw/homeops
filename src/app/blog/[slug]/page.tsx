import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { livePosts, livePostBySlug, relatedPosts } from '@/lib/blog';
import { categorySlug, searchDescription, searchTitle } from '@/lib/blog-core';
import { siteBaseUrl } from '@/lib/donate';
import { blocksText, parseMarkdown } from '@/lib/markdown-core';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import BlogArticle from '@/components/BlogArticle';

// Incremental static regeneration: the page is cached at the CDN and refreshed every minute (and at once when an admin saves),
// so a scheduled post appears about a minute after its time. Public pages must not depend on cookies or the visitor.
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

/** Live posts are generated at build time; anything else (e.g. a post that goes live later) is generated on first request. Both are cached and refreshed every minute. */
export async function generateStaticParams() {
  return (await livePosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await livePostBySlug(slug).catch(() => null);
  if (!post) return { title: 'Post not found', robots: { index: false } };
  const tags = post.tags.split(',').filter(Boolean);
  const description = searchDescription(post);
  return {
    // The site title template appends " · Wodejia"; the dedicated search title keeps the total near 60 characters.
    title: searchTitle(post),
    description,
    alternates: { canonical: `/blog/${post.slug}`, types: { 'application/rss+xml': '/blog/rss.xml' } },
    keywords: tags,
    authors: [{ name: post.authorName }],
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      section: post.category,
      authors: [post.authorName],
      tags,
      locale: 'en_SG',
      images: [{ url: `/blog/${post.slug}/og`, width: 1200, height: 630, alt: post.title }],
    },
    twitter: { card: 'summary_large_image', title: post.title, description, images: [`/blog/${post.slug}/og`] },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await livePostBySlug(slug);
  if (!post) notFound(); // drafts and not-yet-scheduled posts are indistinguishable from missing ones
  const related = await relatedPosts(post);
  const base = siteBaseUrl('http://localhost:3000');
  const url = `${base}/blog/${post.slug}`;
  const words = blocksText(parseMarkdown(post.body)).split(/\s+/).filter(Boolean).length;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: post.title,
        description: searchDescription(post),
        image: [`${url}/og`],
        datePublished: post.publishAt?.toISOString(),
        dateModified: post.updatedAt.toISOString(),
        author: { '@type': 'Organization', name: post.authorName, url: base },
        publisher: { '@type': 'Organization', name: 'Wodejia', url: base, logo: { '@type': 'ImageObject', url: `${base}/icons/512` } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        isPartOf: { '@type': 'Blog', name: 'Wodejia blog', url: `${base}/blog` },
        articleSection: post.category,
        keywords: post.tags,
        wordCount: words,
        inLanguage: 'en',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: base },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${base}/blog` },
          { '@type': 'ListItem', position: 3, name: post.category, item: `${base}/blog/category/${categorySlug(post.category)}` },
          { '@type': 'ListItem', position: 4, name: post.title, item: url },
        ],
      },
    ],
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
