import { describe, expect, it } from 'vitest';
import { digestHeadline, digestOneLine, pushPayload, whatsappParam, whenExpiry, whenTask, type DigestItem } from '@/lib/digest-core';

const items: DigestItem[] = [
  { kind: 'task', title: 'Replace filter', when: whenTask(0), home: 'Main' },
  { kind: 'warranty', title: 'Aircon', when: whenExpiry(5), home: 'Main' },
  { kind: 'task', title: 'Clean gutters', when: whenTask(-3), home: 'Cabin' },
];

describe('digest wording', () => {
  it('describes timing', () => {
    expect(whenTask(-1)).toBe('1 day overdue');
    expect(whenTask(-3)).toBe('3 days overdue');
    expect(whenTask(1)).toBe('due tomorrow');
    expect(whenTask(9)).toBe('due in 9 days');
    expect(whenExpiry(0)).toBe('expires today');
  });
  it('has a headline', () => {
    expect(digestHeadline(items.slice(0, 1))).toBe('1 thing needs your attention');
    expect(digestHeadline(items)).toBe('3 things need your attention');
  });
  it('builds a one-line message, naming homes only when there are several', () => {
    expect(digestOneLine(items)).toBe('Wodejia: Replace filter — due today [Main] · Aircon (warranty) — expires in 5 days [Main] · Clean gutters — 3 days overdue [Cabin]');
    expect(digestOneLine(items.slice(0, 2))).toBe('Wodejia: Replace filter — due today · Aircon (warranty) — expires in 5 days');
  });
  it('truncates with a "+N more" tail instead of cutting an item in half', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ kind: 'task' as const, title: `Task number ${i}`, when: 'due today' }));
    const out = digestOneLine(many, 120);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out).toMatch(/\+\d+ more$/);
  });
  it('builds a push payload that opens the right page', () => {
    expect(pushPayload(items).url).toBe('/dashboard/schedule');
    expect(pushPayload([items[1]], 'https://x.test').url).toBe('https://x.test/dashboard/assets');
    expect(pushPayload([{ kind: 'document', title: 'Insurance', when: 'expires today' }]).url).toBe('/dashboard/documents');
    expect(pushPayload(items).body.split('\n')).toHaveLength(3);
  });
  it('makes text safe for WhatsApp template variables', () => {
    expect(whatsappParam('a\nb\t c      d')).toBe('a · b · c   d');
    expect(whatsappParam('x'.repeat(2000))).toHaveLength(900);
  });
});
