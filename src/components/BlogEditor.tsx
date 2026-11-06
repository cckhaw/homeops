'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useServerForm } from './useServerForm';
import { Field, Msg } from './forms';
import AppleButton, { SubmitButton } from './AppleButton';
import { ConfirmButton } from './misc';
import { deleteBlogPost, saveBlogPost, unpublishBlogPost } from '@/app/blog-actions';
import { BLOG_CATEGORIES, BLOG_TZ_LABEL } from '@/lib/blog-core';
import { slugify } from '@/lib/markdown-core';
import { cn } from '@/lib/utils';

export type EditorPost = { id: string; slug: string; title: string; excerpt: string; body: string; category: string; tags: string; authorName: string; state: 'draft' | 'scheduled' | 'published'; publishAtLocal: string };

const MODES = [
  { id: 'draft', label: 'Save as draft', hint: 'Not visible to readers' },
  { id: 'publish', label: 'Publish now', hint: 'Goes live immediately' },
  { id: 'schedule', label: 'Schedule', hint: 'Goes live by itself at the time you choose' },
] as const;

export default function BlogEditor({ post, minLocal }: { post?: EditorPost; minLocal: string }) {
  const { state, pending, formProps } = useServerForm(saveBlogPost.bind(null, post?.id ?? null));
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [mode, setMode] = useState<'draft' | 'publish' | 'schedule'>(post ? (post.state === 'draft' ? 'draft' : post.state === 'scheduled' ? 'schedule' : 'publish') : 'draft');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      <form {...formProps} className="space-y-6">
        <div className="glass space-y-4 rounded-apple p-5">
          <Field label="Title">
            <input name="title" required maxLength={160} className="input" value={title} placeholder="A clear, searchable headline"
              onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="URL name (the link ends with this)">
              <input name="slug" required maxLength={100} className="input font-mono text-[15px]" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} />
            </Field>
            <Field label="Category">
              <select name="category" defaultValue={post?.category ?? BLOG_CATEGORIES[0]} className="input">{BLOG_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
          </div>
          <Field label={`Summary shown in lists and search results (${excerpt.length}/300)`}>
            <textarea name="excerpt" rows={2} maxLength={300} className="input" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="One or two sentences. Leave empty to use the first paragraph." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tags (comma separated)"><input name="tags" maxLength={300} defaultValue={post?.tags.split(',').join(', ') ?? ''} className="input" placeholder="aircon, maintenance, singapore" /></Field>
            <Field label="Author name"><input name="author" maxLength={80} defaultValue={post?.authorName ?? 'HomeOps Team'} className="input" /></Field>
          </div>
        </div>

        <div className="glass space-y-3 rounded-apple p-5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="body" className="text-[17px] font-semibold">Article</label>
            <span className="text-[13px] text-secondary">{words.toLocaleString()} words · about {Math.max(1, Math.round(words / 200))} min read</span>
          </div>
          <textarea id="body" name="body" required rows={24} className="input !h-auto min-h-[28rem] py-3 font-mono text-[14.5px] leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} spellCheck />
          <details className="rounded-xl bg-label/5 px-4 py-1 text-[14px]">
            <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold text-tint">Formatting help</summary>
            <pre className="overflow-x-auto pb-3 text-[13px] leading-relaxed text-secondary">{`## Heading        ### Smaller heading
**bold**   *italic*   [link text](https://example.com)   [internal](/register)
- bullet            1. numbered
- [ ] checklist item        - [x] done item
> A highlighted quote or tip
---  (divider)

| Column | Column |
|---|---|
| cell | cell |`}</pre>
          </details>
        </div>

        <fieldset className="glass space-y-3 rounded-apple p-5">
          <legend className="px-1 text-[17px] font-semibold">Publishing</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="When to publish">
            {MODES.map((m) => (
              <label key={m.id} className="relative cursor-pointer">
                <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="peer sr-only" />
                <span className="flex min-h-[64px] flex-col justify-center rounded-xl border px-4 py-2 transition hairline peer-checked:border-tint peer-checked:bg-tint/10 peer-focus-visible:ring-2 peer-focus-visible:ring-tint/50">
                  <span className="text-[16px] font-semibold">{m.label}</span>
                  <span className="text-[12.5px] text-secondary">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {mode === 'schedule' && (
            <div className="max-w-sm">
              <Field label={`Publish on (${BLOG_TZ_LABEL})`}>
                <input name="publishAt" type="datetime-local" required min={minLocal} defaultValue={post?.state === 'scheduled' ? post.publishAtLocal : ''} className="input" />
              </Field>
            </div>
          )}
          <Msg state={state} />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton pending={pending}>{mode === 'draft' ? 'Save draft' : mode === 'publish' ? 'Publish' : 'Schedule post'}</SubmitButton>
            {post && <a href={`/admin/blog/${post.id}/preview`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-tint/10 px-5 text-[17px] font-semibold text-tint transition active:scale-[0.97]">Preview (saved version)</a>}
          </div>
        </fieldset>
      </form>

      {post && (
        <div className="flex flex-wrap gap-3">
          {post.state !== 'draft' && (
            <form action={unpublishBlogPost.bind(null, post.id)}><AppleButton type="submit" variant="secondary">Move back to draft</AppleButton></form>
          )}
          <form action={deleteBlogPost.bind(null, post.id)}>
            <ConfirmButton message={`Delete “${post.title}” permanently?`} label={`Delete ${post.title}`}><Trash2 className="h-4 w-4" aria-hidden /> Delete post</ConfirmButton>
          </form>
        </div>
      )}
    </div>
  );
}
