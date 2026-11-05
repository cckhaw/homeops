/** Calling codes by currency of the home — a hint for numbers typed without a country code (e.g. "012-345 6789" in Malaysia). */
const DIAL_BY_CURRENCY: Record<string, string> = {
  MYR: '60', SGD: '65', BND: '673', IDR: '62', THB: '66', VND: '84', PHP: '63', CNY: '86', HKD: '852', JPY: '81', KRW: '82',
  INR: '91', AUD: '61', NZD: '64', CAD: '1', USD: '1', GBP: '44', EUR: '49',
};

/**
 * Normalises a typed phone number to international digits without "+" (what wa.me and WhatsApp Cloud API expect).
 * "+60 12-345 6789" → 60123456789; "0123456789" with MYR → 60123456789; "00 44 …" → 44…. Returns null if it can't be trusted.
 */
export function toInternational(raw: string | null | undefined, currency = 'USD'): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let digits = s.replace(/\D/g, '');
  if (!digits) return null;
  if (s.startsWith('+')) {
    // as typed
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    const dial = DIAL_BY_CURRENCY[currency];
    if (!dial) return null;
    digits = dial + digits.slice(1);
  } else {
    return null; // no "+", no leading 0: ambiguous
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export const whatsappLink = (intl: string, text?: string) => `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
export const maskPhone = (intl: string) => `+${intl.slice(0, 2)}••••${intl.slice(-3)}`;
