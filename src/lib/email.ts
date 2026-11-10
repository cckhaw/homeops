import 'server-only';

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Branded e-mail shell. `bodyHtml` must already be escaped/safe. */
export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1d1d1f">
<h2 style="margin:0 0 12px">${escapeHtml(title)}</h2>${bodyHtml}
${cta ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#1F3A6B;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:600">${escapeHtml(cta.label)}</a></p>` : ''}
<p style="color:#86868b;font-size:12px;margin-top:28px">Wodejia — the digital passport for your home.</p></div>`;
}

/** Sends via Resend. Returns false (and logs) on failure; never throws. */
export async function sendEmail(to: string, subject: string, html: string, opts: { headers?: Record<string, string> } = {}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch(process.env.RESEND_API_URL ?? 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? 'Wodejia <onboarding@resend.dev>', to, subject, html, ...(opts.headers ? { headers: opts.headers } : {}) }),
    });
    if (!res.ok) console.error('Resend error', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (e) {
    console.error('Resend request failed', e instanceof Error ? e.message : e);
    return false;
  }
}
