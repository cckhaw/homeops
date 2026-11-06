import 'server-only';
import { randomInt } from 'crypto';
import { sign, safeEqual } from '@/lib/security';
import { whatsappParam } from '@/lib/digest-core';

/**
 * WhatsApp Business Cloud API (Meta). Business-initiated messages must use pre-approved *templates*:
 *   WHATSAPP_CODE_TEMPLATE      (default wodejia_code)      body: "Your Wodejia verification code is {{1}}"
 *   WHATSAPP_REMINDER_TEMPLATE  (default wodejia_reminder)  body: "{{1}}"
 * Both take exactly one body variable. Language: WHATSAPP_LANG (default en).
 *
 * STATUS: coming soon. The code is complete but switched off — it only runs when WHATSAPP_ENABLED=1 *and* the credentials
 * are set. Until then Settings shows "Coming soon" and no WhatsApp number is ever collected or messaged.
 */
export const whatsappConfigured = () => process.env.WHATSAPP_ENABLED === '1' && !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

export async function sendWhatsappTemplate(to: string, kind: 'code' | 'reminder', text: string): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  const template = kind === 'code' ? process.env.WHATSAPP_CODE_TEMPLATE ?? 'wodejia_code' : process.env.WHATSAPP_REMINDER_TEMPLATE ?? 'wodejia_reminder';
  const base = process.env.WHATSAPP_API_URL ?? 'https://graph.facebook.com/v21.0';
  try {
    const res = await fetch(`${base}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_LANG ?? 'en' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: whatsappParam(text) }] }],
        },
      }),
    });
    if (!res.ok) console.error('WhatsApp error', res.status, (await res.text().catch(() => '')).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error('WhatsApp request failed', e instanceof Error ? e.message : e);
    return false;
  }
}

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
/** The code is stored only as a keyed hash bound to the number, so a leaked row can't be replayed for another number. */
export const hashCode = (number: string, code: string) => sign(`wa-code:${number}:${code}`);
export const codeMatches = (number: string, code: string, stored: string | null | undefined) => !!stored && safeEqual(hashCode(number, code.replace(/\D/g, '')), stored);

export const CODE_TTL_MS = 10 * 60_000;
export const MAX_CODE_ATTEMPTS = 5;
