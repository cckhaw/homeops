'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { newsletterSubscribers } from '@/db/schema';
import { emailConfigured, emailLayout, sendEmail } from '@/lib/email';
import { enforce, enforceIp } from '@/lib/rate-limit';
import { isEmail, normalizeEmail } from '@/lib/newsletter-core';
import { confirmUrl, readLink } from '@/lib/newsletter';

type FormState = { error?: string; ok?: string } | undefined;
const SOURCES = ['blog', 'faq', 'tools', 'footer'];

/** Step 1: ask for an address. Always answers the same ("check your inbox") so the form cannot be used to find out who is subscribed. */
export async function subscribeNewsletter(_: FormState, fd: FormData): Promise<FormState> {
  if (String(fd.get('website') ?? '').trim()) return { ok: 'Check your inbox to confirm your subscription.' }; // honeypot: bots fill hidden fields
  const email = normalizeEmail(String(fd.get('email') ?? ''));
  if (!isEmail(email)) return { error: 'Enter a valid e-mail address.' };
  const limited = (await enforceIp('nl-sub', 8, 3600)) ?? (await enforce('nl-sub-email', email, 3, 3600));
  if (limited) return { error: limited };
  if (!emailConfigured()) return { error: 'Newsletter sign-up is not available right now. Please try again later.' };
  const src = String(fd.get('source') ?? '');
  const source = SOURCES.includes(src) ? src : 'footer';
  const [row] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
  if (!row) await db.insert(newsletterSubscribers).values({ email, source, status: 'pending' });
  else if (row.status !== 'subscribed') await db.update(newsletterSubscribers).set({ status: 'pending' }).where(eq(newsletterSubscribers.id, row.id));
  if (!row || row.status !== 'subscribed') {
    await sendEmail(email, 'Confirm your Wodejia subscription', emailLayout('One more step', `<p>Please confirm that you want home-care tips and Wodejia news by e-mail. If it wasn't you, just ignore this message and nothing will be sent.</p><p style="color:#86868b;font-size:13px">This link works for 3 days.</p>`, { label: 'Confirm my subscription', url: confirmUrl(email) }));
  }
  return { ok: 'Check your inbox to confirm your subscription.' };
}

export async function confirmNewsletter(token: string): Promise<FormState> {
  const t = readLink(token);
  if (!t || t.kind !== 'confirm') return { error: 'This confirmation link has expired or is not valid. Please sign up again.' };
  const done = await db.update(newsletterSubscribers).set({ status: 'subscribed', confirmedAt: new Date(), unsubscribedAt: null }).where(eq(newsletterSubscribers.email, t.email)).returning({ id: newsletterSubscribers.id });
  if (!done.length) return { error: 'We could not find that subscription. Please sign up again.' };
  revalidatePath('/admin/newsletter');
  return { ok: 'You are subscribed. Thank you!' };
}

export async function unsubscribeNewsletter(token: string): Promise<FormState> {
  const t = readLink(token);
  if (!t || t.kind !== 'unsub') return { error: 'This unsubscribe link is not valid.' };
  await db.update(newsletterSubscribers).set({ status: 'unsubscribed', unsubscribedAt: new Date() }).where(eq(newsletterSubscribers.email, t.email));
  revalidatePath('/admin/newsletter');
  return { ok: 'You have been unsubscribed. You will not receive any more newsletters.' };
}

