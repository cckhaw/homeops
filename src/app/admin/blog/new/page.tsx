import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { utcToLocal } from '@/lib/blog-core';
import PageHeader from '@/components/PageHeader';
import BlogEditor from '@/components/BlogEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New post · Admin' };

export default function NewPost() {
  return (
    <>
      <Link href="/admin/blog" className="mb-3 -ml-2 flex min-h-[44px] w-fit items-center gap-1 px-2 text-[17px] text-tint"><ArrowLeft className="h-5 w-5" aria-hidden /> Blog</Link>
      <PageHeader title="New post" />
      <BlogEditor minLocal={utcToLocal(new Date())} />
    </>
  );
}
