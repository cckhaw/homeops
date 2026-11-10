import 'server-only';
import { sign, safeEqual } from '@/lib/security';
import { siteBaseUrl } from '@/lib/donate';
import { decodePayload, encodePayload, type LinkKind } from '@/lib/newsletter-core';

/** Signed, self-contained links for confirming and unsubscribing, so no per-person token has to be stored. */
export function makeLink(kind: LinkKind, email: string, now = Date.now()): string {
  const p = encodePayload(kind, email, now);
  return `${p}.${sign(`nl:${p}`)}`;
}

export function readLink(token: string | undefined | null, now = Date.now()): { kind: LinkKind; email: string } | null {
  const [p, sig] = String(token ?? '').split('.');
  if (!p || !sig || !safeEqual(sig, sign(`nl:${p}`))) return null;
  return decodePayload(p, now);
}

const base = () => siteBaseUrl('http://localhost:3000');
export const confirmUrl = (email: string) => `${base()}/newsletter/confirm?t=${makeLink('confirm', email)}`;
export const unsubscribeUrl = (email: string) => `${base()}/newsletter/unsubscribe?t=${makeLink('unsub', email)}`;
/** Headers that let Gmail and Apple Mail show their own "Unsubscribe" button (RFC 8058 one-click). */
export const unsubscribeHeaders = (email: string) => ({
  'List-Unsubscribe': `<${base()}/api/newsletter/unsubscribe?t=${makeLink('unsub', email)}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
});
