/** Channel-neutral reminder items, so e-mail, push and WhatsApp all say the same thing. Pure (unit-tested). */
export type DigestItem = { kind: 'task' | 'warranty' | 'document'; title: string; when: string; home?: string };

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export const whenTask = (days: number) => (days < 0 ? `${plural(-days, 'day')} overdue` : days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : `due in ${days} days`);
export const whenExpiry = (days: number) => (days <= 0 ? 'expires today' : days === 1 ? 'expires tomorrow' : `expires in ${days} days`);

export const digestHeadline = (items: DigestItem[]) => `${plural(items.length, 'thing')} need${items.length === 1 ? 's' : ''} your attention`;

const line = (i: DigestItem, withHome: boolean) =>
  `${i.title}${i.kind === 'warranty' ? ' (warranty)' : ''} — ${i.when}${withHome && i.home ? ` [${i.home}]` : ''}`;

/** "Wodejia: Fix gutter — due today · Aircon (warranty) — expires in 5 days · +2 more", cut to fit `max` characters. */
export function digestOneLine(items: DigestItem[], max = 600): string {
  const multi = new Set(items.map((i) => i.home).filter(Boolean)).size > 1;
  const parts: string[] = [];
  let used = 'Wodejia: '.length;
  for (let n = 0; n < items.length; n++) {
    const l = line(items[n], multi);
    const rest = items.length - n - 1;
    const more = rest > 0 ? ` · +${rest} more` : '';
    if (parts.length && used + l.length + 3 + more.length > max) {
      parts.push(`+${items.length - n} more`);
      break;
    }
    parts.push(l);
    used += l.length + 3;
  }
  return `Wodejia: ${parts.join(' · ')}`.slice(0, max);
}

/** Push notification content: short title, a few lines of body, where a tap should go. */
export function pushPayload(items: DigestItem[], base = ''): { title: string; body: string; url: string } {
  const top = items.slice(0, 3).map((i) => line(i, false));
  const rest = items.length - top.length;
  const onlyDocs = items.every((i) => i.kind === 'document');
  const onlyWarranty = items.every((i) => i.kind === 'warranty');
  return {
    title: digestHeadline(items),
    body: top.join('\n') + (rest > 0 ? `\n+${rest} more` : ''),
    url: `${base}${onlyDocs ? '/dashboard/documents' : onlyWarranty ? '/dashboard/assets' : '/dashboard/schedule'}`,
  };
}

/** WhatsApp template variables may not contain newlines, tabs or runs of 4+ spaces, and are length-limited. */
export const whatsappParam = (s: string, max = 900) => s.replace(/\s*[\r\n\t]+\s*/g, ' · ').replace(/ {4,}/g, '   ').trim().slice(0, max);
