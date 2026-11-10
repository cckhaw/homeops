'use server';

import { revalidatePath } from 'next/cache';
import { and, count, eq, isNull, ne, or } from 'drizzle-orm';
import { db } from '@/db';
import { newsletterIssues, newsletterSubscribers } from '@/db/schema';
import { audit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { siteBaseUrl } from '@/lib/donate';
import { emailConfigured, sendEmail } from '@/lib/email';
import { livePosts } from '@/lib/blog';
import { SEND_BATCH, issueHtml } from '@/lib/newsletter-core';
import { unsubscribeHeaders, unsubscribeUrl } from '@/lib/newsletter';

export type NewsletterResult = { ok: boolean; message: string; issueId?: string; remaining?: number };
const base = () => siteBaseUrl('http://localhost:3000');

function check(subject: string, body: string): string | null {
  if (!subject.trim() || subject.length > 150) return 'Write a subject (up to 150 characters).';
  if (body.trim().length < 20) return 'Write the message (at least a few lines).';
  if (body.length > 20000) return 'The message is too long (20,000 characters at most).';
  if (!emailConfigured()) return 'E-mail is not configured (RESEND_API_KEY), so nothing can be sent.';
  return null;
}

/** A preview to the signed-in admin's own address, through exactly the same template. */
export async function sendNewsletterTest(subject: string, body: string): Promise<NewsletterResult> {
  const admin = await requireAdmin();
  const err = check(subject, body);
  if (err) return { ok: false, message: err };
  const ok = await sendEmail(admin.email, `[Test] ${subject.trim()}`, issueHtml(subject.trim(), body, base(), unsubscribeUrl(admin.email)), { headers: unsubscribeHeaders(admin.email) });
  return ok ? { ok: true, message: `Test sent to ${admin.email}.` } : { ok: false, message: 'The test could not be sent. Check the e-mail settings.' };
}

/**
 * Sends the issue to confirmed subscribers who have not had it yet, up to one batch per press.
 * Pass the returned `issueId` back to continue: people already sent this issue are skipped, so it is safe to press again.
 */
export async function sendNewsletter(subject: string, body: string, issueId?: string): Promise<NewsletterResult> {
  const admin = await requireAdmin();
  const err = check(subject, body);
  if (err) return { ok: false, message: err };
  let id = issueId;
  if (id) {
    const [i] = await db.select({ id: newsletterIssues.id }).from(newsletterIssues).where(eq(newsletterIssues.id, id));
    if (!i) id = undefined;
  }
  if (!id) [{ id }] = await db.insert(newsletterIssues).values({ subject: subject.trim(), bodyMd: body, createdBy: admin.id }).returning({ id: newsletterIssues.id });
  const notYet = and(eq(newsletterSubscribers.status, 'subscribed'), or(isNull(newsletterSubscribers.lastIssueId), ne(newsletterSubscribers.lastIssueId, id!)));
  const batch = await db.select({ id: newsletterSubscribers.id, email: newsletterSubscribers.email }).from(newsletterSubscribers).where(notYet).limit(SEND_BATCH);
  let sent = 0, failed = 0;
  for (let i = 0; i < batch.length; i += 5) {
    await Promise.all(batch.slice(i, i + 5).map(async (s) => {
      const ok = await sendEmail(s.email, subject.trim(), issueHtml(subject.trim(), body, base(), unsubscribeUrl(s.email)), { headers: unsubscribeHeaders(s.email) });
      if (ok) { sent++; await db.update(newsletterSubscribers).set({ lastIssueId: id }).where(eq(newsletterSubscribers.id, s.id)); } else failed++;
    }));
  }
  const [{ n: remaining }] = await db.select({ n: count() }).from(newsletterSubscribers).where(notYet);
  const [cur] = await db.select({ c: newsletterIssues.sentCount }).from(newsletterIssues).where(eq(newsletterIssues.id, id!));
  await db.update(newsletterIssues).set({ sentCount: (cur?.c ?? 0) + sent, lastSentAt: new Date() }).where(eq(newsletterIssues.id, id!));
  await audit(admin, 'newsletter.send', `Issue "${subject.trim().slice(0, 80)}": ${sent} sent, ${failed} failed, ${remaining} remaining`);
  revalidatePath('/admin/newsletter');
  const more = remaining > 0 && failed < batch.length;
  return { ok: failed === 0, issueId: id, remaining, message: `${sent} sent${failed ? `, ${failed} failed (press Send again to retry them)` : ''}.${more ? ` ${remaining} more subscribers are waiting: press Send again to continue.` : remaining === 0 ? ' Everyone has this issue now.' : ''}` };
}

/** Pre-fills the editor from the newest published blog post. */
export async function draftFromLatestPost(): Promise<{ subject: string; body: string } | null> {
  await requireAdmin();
  const [p] = await livePosts(1);
  if (!p) return null;
  return { subject: p.title, body: `${p.excerpt ?? ''}\n\n[Read the full article](/blog/${p.slug})\n\nHave a great week,\nThe Wodejia team` };
}
