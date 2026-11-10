import { parseMarkdown, safeHref, type Block, type Inline } from './markdown-core';

/** Newsletter rules with no database or network: address checks, signed-link payloads and the Markdown → e-mail HTML renderer. Unit-tested. */
export const normalizeEmail = (s: string) => s.trim().toLowerCase();
export const isEmail = (s: string) => s.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && !/[<>"',;]/.test(s);

export type LinkKind = 'confirm' | 'unsub';
const TTL: Record<LinkKind, number> = { confirm: 3 * 86_400_000, unsub: 0 }; // unsubscribe links never expire

/** "confirm|a@b.com|1760000000000" as base64url. The signature is added by the server (newsletter.ts). */
export const encodePayload = (kind: LinkKind, email: string, now = Date.now()) => Buffer.from(`${kind}|${email}|${TTL[kind] ? now + TTL[kind] : 0}`).toString('base64url');
export function decodePayload(p: string, now = Date.now()): { kind: LinkKind; email: string } | null {
  let raw = '';
  try { raw = Buffer.from(p, 'base64url').toString(); } catch { return null; }
  const m = /^(confirm|unsub)\|([^|]+)\|(\d+)$/.exec(raw);
  if (!m) return null;
  const exp = Number(m[3]);
  if (exp !== 0 && exp < now) return null;
  if (m[1] === 'unsub' && exp !== 0) return null;
  return { kind: m[1] as LinkKind, email: m[2] };
}

// ---------------------------------------------------------------- Markdown → e-mail HTML (inline styles, no scripts, links checked)
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function inline(nodes: Inline[], base: string): string {
  return nodes.map((n) => {
    switch (n.t) {
      case 'text': return esc(n.v);
      case 'strong': return `<strong>${inline(n.c, base)}</strong>`;
      case 'em': return `<em>${inline(n.c, base)}</em>`;
      case 'code': return `<code style="background:#f2f2f4;padding:1px 5px;border-radius:4px">${esc(n.v)}</code>`;
      case 'link': {
        const h = safeHref(n.href);
        if (!h || h.startsWith('#')) return inline(n.c, base);
        const url = h.startsWith('/') ? `${base}${h}` : h;
        return `<a href="${esc(url)}" style="color:#1F3A6B">${inline(n.c, base)}</a>`;
      }
    }
  }).join('');
}

function blocks(bs: Block[], base: string): string {
  return bs.map((b) => {
    switch (b.t) {
      case 'heading': return `<h${b.level === 2 ? 2 : 3} style="margin:22px 0 6px;font-size:${b.level === 2 ? 20 : 17}px">${inline(b.c, base)}</h${b.level === 2 ? 2 : 3}>`;
      case 'p': return `<p style="margin:0 0 14px;line-height:1.6">${inline(b.c, base)}</p>`;
      case 'list': { const tag = b.ordered ? 'ol' : 'ul'; return `<${tag} style="margin:0 0 14px;padding-left:22px;line-height:1.6">${b.items.map((i) => `<li>${inline(i.c, base)}</li>`).join('')}</${tag}>`; }
      case 'quote': return `<blockquote style="margin:0 0 14px;padding-left:12px;border-left:3px solid #d2d2d7;color:#515154">${blocks(b.c, base)}</blockquote>`;
      case 'hr': return '<hr style="border:0;border-top:1px solid #e5e5ea;margin:20px 0">';
      case 'code': return `<pre style="background:#f2f2f4;padding:10px;border-radius:8px;overflow:auto">${esc(b.v)}</pre>`;
      case 'table': return `<table style="border-collapse:collapse;margin:0 0 14px;font-size:14px"><tr>${b.head.map((h) => `<th style="border:1px solid #d2d2d7;padding:5px 8px;text-align:left">${inline(h, base)}</th>`).join('')}</tr>${b.rows.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #d2d2d7;padding:5px 8px">${inline(c, base)}</td>`).join('')}</tr>`).join('')}</table>`;
    }
  }).join('');
}

export const markdownToEmailHtml = (md: string, base: string) => blocks(parseMarkdown(md), base);

/** The issue e-mail: Markdown body inside the Wodejia shell, with the unsubscribe link every bulk message must carry. */
export function issueHtml(subject: string, md: string, base: string, unsubscribeUrl: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1d1d1f">
<h1 style="margin:0 0 16px;font-size:24px">${esc(subject)}</h1>${markdownToEmailHtml(md, base)}
<hr style="border:0;border-top:1px solid #e5e5ea;margin:28px 0 12px">
<p style="color:#86868b;font-size:12px;line-height:1.5">You are receiving this because you subscribed to the Wodejia newsletter. <a href="${esc(unsubscribeUrl)}" style="color:#86868b">Unsubscribe</a> at any time.<br>Wodejia — the digital passport for your home.</p></div>`;
}

export const SEND_BATCH = 300; // recipients per press of "Send"; press again to continue (already-sent people are skipped)
