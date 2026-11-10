import { describe, expect, it } from 'vitest';
import { decodePayload, encodePayload, isEmail, issueHtml, markdownToEmailHtml, normalizeEmail } from '@/lib/newsletter-core';

describe('addresses', () => {
  it('normalises and validates', () => {
    expect(normalizeEmail('  Una@Example.COM ')).toBe('una@example.com');
    for (const ok of ['a@b.co', 'una.tan+news@example.com.sg']) expect(isEmail(ok)).toBe(true);
    for (const bad of ['', 'plain', 'a@b', 'a b@c.com', 'a@b.c', '<x>@y.com', 'a@b.com,c@d.com', 'x'.repeat(200) + '@a.com']) expect(isEmail(bad)).toBe(false);
  });
});

describe('signed link payloads', () => {
  it('round-trips a confirm link and expires it after three days', () => {
    const p = encodePayload('confirm', 'a@b.com', 1_000);
    expect(decodePayload(p, 2_000)).toEqual({ kind: 'confirm', email: 'a@b.com' });
    expect(decodePayload(p, 1_000 + 3 * 86_400_000 + 1)).toBeNull();
  });
  it('unsubscribe links never expire', () => {
    const p = encodePayload('unsub', 'a@b.com', 1_000);
    expect(decodePayload(p, 9_999_999_999_999)).toEqual({ kind: 'unsub', email: 'a@b.com' });
  });
  it('rejects garbage and tampered kinds', () => {
    for (const x of ['', 'abc', Buffer.from('other|a@b.com|0').toString('base64url'), Buffer.from('unsub|a@b.com|99').toString('base64url'), Buffer.from('confirm|a@b.com|x').toString('base64url')]) expect(decodePayload(x)).toBeNull();
  });
});

describe('markdownToEmailHtml', () => {
  const base = 'https://wodejia.example';
  it('renders headings, lists, emphasis and links (relative links made absolute)', () => {
    const h = markdownToEmailHtml('## Hello\n\nSome **bold** and *soft* text with [a link](/faq) and [out](https://x.com).\n\n- one\n- two', base);
    expect(h).toContain('<h2');
    expect(h).toContain('<strong>bold</strong>');
    expect(h).toContain('href="https://wodejia.example/faq"');
    expect(h).toContain('href="https://x.com"');
    expect(h).toContain('<ul');
    expect(h).toContain('<li>two</li>');
  });
  it('never emits raw HTML or unsafe links', () => {
    const h = markdownToEmailHtml('<script>alert(1)</script> [bad](javascript:alert(1)) [ok](mailto:a@b.com) <img src=x onerror=1>', base);
    expect(h).not.toContain('<script');
    expect(h).not.toContain('<img');
    expect(h).not.toContain('javascript:');
    expect(h).toContain('&lt;script&gt;');
    expect(h).toContain('href="mailto:a@b.com"');
  });
  it('wraps an issue with the unsubscribe link and escapes the subject', () => {
    const html = issueHtml('Tips & <tricks>', 'Body', base, 'https://wodejia.example/newsletter/unsubscribe?t=abc');
    expect(html).toContain('Tips &amp; &lt;tricks&gt;');
    expect(html).toContain('Unsubscribe</a>');
    expect(html).toContain('https://wodejia.example/newsletter/unsubscribe?t=abc');
  });
});
