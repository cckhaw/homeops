'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import AppleButton from './AppleButton';
import { draftFromLatestPost, sendNewsletter, sendNewsletterTest, type NewsletterResult } from '@/app/newsletter-admin-actions';

export default function NewsletterAdmin({ subscribed }: { subscribed: number }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [issueId, setIssueId] = useState<string>();
  const [res, setRes] = useState<NewsletterResult>();
  const [pending, start] = useTransition();
  const edit = (f: () => void) => { f(); setIssueId(undefined); setRes(undefined); }; // changing the text starts a new issue
  return (
    <div className="space-y-3" data-testid="newsletter-composer">
      <label className="block"><span className="field-label">Subject</span><input value={subject} maxLength={150} onChange={(e) => edit(() => setSubject(e.target.value))} className="input" aria-label="Newsletter subject" /></label>
      <label className="block"><span className="field-label">Message (Markdown: **bold**, [links](/blog), - lists, ## headings)</span><textarea value={body} onChange={(e) => edit(() => setBody(e.target.value))} rows={12} className="input font-mono text-[14px]" aria-label="Newsletter message" /></label>
      <div className="flex flex-wrap gap-3">
        <AppleButton type="button" variant="secondary" disabled={pending} onClick={() => start(async () => { const d = await draftFromLatestPost(); if (d) edit(() => { setSubject(d.subject); setBody(d.body); }); else setRes({ ok: false, message: 'There is no published post yet.' }); })}>Start from the latest blog post</AppleButton>
        <AppleButton type="button" variant="secondary" disabled={pending} onClick={() => start(async () => setRes(await sendNewsletterTest(subject, body)))}>Send me a test</AppleButton>
        <AppleButton type="button" disabled={pending || subscribed === 0} onClick={() => { if (confirm(`Send this to ${subscribed} confirmed subscriber${subscribed === 1 ? '' : 's'}?`)) start(async () => { const r = await sendNewsletter(subject, body, issueId); if (r.issueId) setIssueId(r.issueId); setRes(r); }); }}>{issueId ? 'Send to the rest' : `Send to ${subscribed} subscriber${subscribed === 1 ? '' : 's'}`}</AppleButton>
      </div>
      {res && (
        <div role="status" className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-[15px] ${res.ok ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>
          {res.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
          <span>{res.message}</span>
        </div>
      )}
    </div>
  );
}
