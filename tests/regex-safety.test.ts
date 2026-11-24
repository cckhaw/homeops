import { describe, expect, it } from 'vitest';
import { detectImage, looksLikeSvg, svgProblem } from '@/lib/brand-core';
import { parseMarkdown } from '@/lib/markdown-core';
import { parseCommand } from '@/lib/telegram-core';
import { parseDollarsToCents } from '@/lib/donate';
import { normalizeDomain } from '@/lib/brands';

/**
 * ReDoS guard. These functions run on text that people (or the Telegram webhook) control. Each is fed long adversarial input and must
 * finish quickly; a backtracking regex takes seconds to minutes on these. The limits are generous so slow CI machines do not flake.
 */
const fast = (label: string, fn: () => unknown, ms = 400) => {
  const t = performance.now();
  fn();
  const took = performance.now() - t;
  expect(took, `${label} took ${Math.round(took)} ms`).toBeLessThan(ms);
};
const N = 30_000;

describe('regex safety', () => {
  it('markdown parsing stays fast on pathological lines', () => {
    for (const [label, src] of [
      ['whitespace row', ' '.repeat(N) + '!'],
      ['table rows', `a|b\n${'|--'.repeat(N / 3)}!\nx|y`],
      ['dash run', '-'.repeat(N) + 'x'],
      ['hr with gaps', '- '.repeat(N / 2) + 'x'],
      ['heading marks', '#'.repeat(N)],
      ['list numbers', ' '.repeat(N / 2) + '1'.repeat(N / 2)],
      ['unclosed emphasis', '*a '.repeat(N / 3)],
      ['brackets', '[a]('.repeat(N / 4)],
    ] as const) fast(`markdown ${label}`, () => parseMarkdown(src));
  });

  it('recognises table separators and horizontal rules as before', () => {
    expect(parseMarkdown('a | b\n--- | :---:\n1 | 2').some((b) => b.t === 'table')).toBe(true);
    expect(parseMarkdown('| a | b |\n|---|---|\n| 1 | 2 |').some((b) => b.t === 'table')).toBe(true);
    expect(parseMarkdown('text\n\n---\n\nmore').some((b) => b.t === 'hr')).toBe(true);
    expect(parseMarkdown('a | b\nnot a separator\n1 | 2').some((b) => b.t === 'table')).toBe(false);
  });

  it('SVG sniffing stays fast and still detects real SVGs', () => {
    for (const s of ['<!--a-->'.repeat(130) + 'x', '<!--'.repeat(256), ' '.repeat(1024) + 'x', '<?xml '.repeat(150), '<!DOCTYPE '.repeat(100)]) {
      fast('looksLikeSvg', () => looksLikeSvg(s.slice(0, 1024)));
      fast('detectImage', () => detectImage(new TextEncoder().encode(s)));
    }
    expect(looksLikeSvg('<svg xmlns="http://www.w3.org/2000/svg"/>')).toBe(true);
    expect(looksLikeSvg('<?xml version="1.0"?>\n<!-- made by hand -->\n<!DOCTYPE svg PUBLIC "x" "y">\n<svg viewBox="0 0 1 1"/>')).toBe(true);
    expect(looksLikeSvg('﻿  <svg>')).toBe(true);
    expect(looksLikeSvg('<html><svg></svg></html>')).toBe(false);
    expect(looksLikeSvg('<!-- unclosed <svg>')).toBe(false);
    expect(looksLikeSvg('')).toBe(false);
    expect(detectImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))?.type).toBe('svg');
  });

  it('SVG content checks stay fast', () => {
    for (const s of ['href=' + '"'.repeat(N), 'href' + ' '.repeat(N) + '=', 'xlink:href'.repeat(N / 10)]) fast('svgProblem', () => svgProblem(s));
  });

  it('small parsers stay fast', () => {
    fast('telegram', () => { parseCommand('/' + 'a'.repeat(N) + '!'); parseCommand('/a@' + 'b'.repeat(N)); parseCommand('/a' + ' '.repeat(N) + 'x'); });
    fast('donate', () => { parseDollarsToCents('$' + ' '.repeat(N) + '!'); parseDollarsToCents('1,'.repeat(N / 2) + '!'); });
    fast('domain', () => { normalizeDomain('a.'.repeat(120) + '!'); normalizeDomain('a'.repeat(N) + '.com'); normalizeDomain(('a-'.repeat(30) + 'a.').repeat(4) + '1'); });
  });
});
