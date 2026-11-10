import { describe, expect, it } from 'vitest';
import { escapeHtml, hashToken, isLinkToken, newLinkToken, parseCommand, telegramDigest } from '@/lib/telegram-core';

describe('telegram link tokens', () => {
  it('makes unique URL-safe tokens that pass the format check', () => {
    const a = newLinkToken(), b = newLinkToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(isLinkToken(a)).toBe(true);
  });
  it('rejects malformed tokens', () => {
    for (const t of ['', 'short', 'has spaces in it here!!', 'x'.repeat(65), "a'; drop table--------"]) expect(isLinkToken(t)).toBe(false);
  });
  it('hashes deterministically without revealing the token', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).toHaveLength(64);
    expect(hashToken('abc')).not.toContain('abc');
  });
});

describe('parseCommand', () => {
  it('reads /start with a payload, with or without the bot name', () => {
    expect(parseCommand('/start abc123')).toEqual({ cmd: 'start', arg: 'abc123' });
    expect(parseCommand('/start@WodejiaBot abc123')).toEqual({ cmd: 'start', arg: 'abc123' });
    expect(parseCommand('  /STOP ')).toEqual({ cmd: 'stop', arg: '' });
  });
  it('ignores ordinary text', () => {
    expect(parseCommand('hello')).toBeNull();
    expect(parseCommand(undefined)).toBeNull();
    expect(parseCommand('please /start')).toBeNull();
  });
});

describe('telegramDigest', () => {
  const items = [
    { kind: 'task' as const, title: 'Service <aircon> & filters', when: 'due today', home: 'Main' },
    { kind: 'warranty' as const, title: 'Fridge', when: 'expires in 5 days', home: 'Main' },
    { kind: 'document' as const, title: 'Insurance', when: 'expires tomorrow', home: 'Cabin' },
  ];
  it('escapes HTML and shows the home only when there are several', () => {
    const t = telegramDigest(items, 'https://wodejia.example');
    expect(t).toContain('3 things need your attention');
    expect(t).toContain('Service &lt;aircon&gt; &amp; filters');
    expect(t).toContain('Fridge (warranty)');
    expect(t).toContain('[Cabin]');
    expect(t).toContain('https://wodejia.example/dashboard/schedule');
    expect(telegramDigest([items[0]], 'https://x.test')).not.toContain('[Main]');
    expect(telegramDigest([items[0]], 'https://x.test')).toContain('1 thing needs');
  });
  it('stays under Telegram\'s length limit', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ kind: 'task' as const, title: 'T'.repeat(200) + i, when: 'due today' }));
    const t = telegramDigest(many, 'https://x.test');
    expect(t.length).toBeLessThanOrEqual(4000);
    expect(escapeHtml('<a&b>')).toBe('&lt;a&amp;b&gt;');
  });
});
