import 'server-only';
import { and, count, eq, gte, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { errorLog } from '@/db/schema';
import { adminEmails } from '@/lib/accounts';
import { emailConfigured, emailLayout, escapeHtml, sendEmail } from '@/lib/email';
import { siteBaseUrl } from '@/lib/donate';
import { fingerprint, isBenign, normalizeRoute, sanitizeText } from '@/lib/error-core';

const ALERTS_PER_HOUR = 5; // never let an error storm flood the owner's inbox
const NEW_ERRORS_PER_HOUR = 100; // never let an attacker flood the table with distinct messages

/**
 * Stores one occurrence of an error. New (or re-opened) errors e-mail the admins, throttled. Never throws:
 * error tracking must not turn into a source of errors.
 */
export async function recordError(input: { source: 'server' | 'client'; route?: string | null; message: string; stack?: string | null; digest?: string | null }) {
  try {
    if (isBenign(input.message, input.digest)) return;
    const message = sanitizeText(input.message || 'Unknown error', 300);
    const route = normalizeRoute(input.route);
    const fp = fingerprint(input.source, route, message);
    const [existing] = await db.select().from(errorLog).where(eq(errorLog.fingerprint, fp));

    if (!existing) {
      const [{ n }] = await db.select({ n: count() }).from(errorLog).where(gte(errorLog.firstSeenAt, new Date(Date.now() - 3_600_000)));
      if (n >= NEW_ERRORS_PER_HOUR) return;
    }
    await db
      .insert(errorLog)
      .values({ fingerprint: fp, source: input.source, route, message, stack: input.stack ? sanitizeText(input.stack, 3000) : null })
      .onConflictDoUpdate({ target: errorLog.fingerprint, set: { count: (existing?.count ?? 0) + 1, lastSeenAt: new Date(), resolvedAt: null } });

    const worthAlerting = !existing || existing.resolvedAt !== null;
    if (worthAlerting) await alertAdmins(fp, message, route, input.source);
  } catch (e) {
    console.error('error tracking failed:', e instanceof Error ? e.message : e);
  }
}

async function alertAdmins(fp: string, message: string, route: string | null, source: string) {
  const to = adminEmails();
  if (!to.length || !emailConfigured()) return;
  const [{ n }] = await db.select({ n: count() }).from(errorLog).where(and(isNotNull(errorLog.notifiedAt), gte(errorLog.notifiedAt, new Date(Date.now() - 3_600_000))));
  if (n >= ALERTS_PER_HOUR) return;
  await db.update(errorLog).set({ notifiedAt: new Date() }).where(eq(errorLog.fingerprint, fp));
  const html = emailLayout(
    'A new error was recorded',
    `<p><b>${escapeHtml(message)}</b></p><p style="color:#6e6e73">${source === 'client' ? 'In the browser' : 'On the server'}${route ? ` · ${escapeHtml(route)}` : ''}</p><p>No personal data is stored with errors.</p>`,
    { label: 'Open the error log', url: `${siteBaseUrl('http://localhost:3000')}/admin/errors` },
  );
  await Promise.all(to.map((addr) => sendEmail(addr, `Wodejia error: ${message.slice(0, 80)}`, html)));
}
