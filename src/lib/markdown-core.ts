/**
 * A small, safe Markdown parser for blog posts. It produces a plain AST (rendered by components/Markdown.tsx) and never
 * emits raw HTML, so an author can't inject markup or scripts. Supported: ## headings, paragraphs, **bold**, *italic*,
 * `code`, [links](url), - / 1. lists (with - [ ] checklists), > quotes, --- rules, ``` code blocks and | tables |.
 */
export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: Inline[] };

export type Block =
  | { t: 'heading'; level: 2 | 3 | 4; c: Inline[]; id: string }
  | { t: 'p'; c: Inline[] }
  | { t: 'list'; ordered: boolean; items: { c: Inline[]; checked: boolean | null }[] }
  | { t: 'quote'; c: Block[] }
  | { t: 'hr' }
  | { t: 'code'; v: string }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] };

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

/** Only web links, e-mail links, same-site paths and in-page anchors are allowed. Anything else renders as plain text. */
export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:\/\/|mailto:)/i.test(h)) return h;
  if (/^\/(?!\/)/.test(h) || /^#[\w-]+$/.test(h)) return h;
  return null;
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf });
    buf = '';
  };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\' && i + 1 < src.length && /[\\`*_[\]()#>|-]/.test(src[i + 1])) {
      buf += src[i + 1];
      i += 2;
      continue;
    }
    if (ch === '`') {
      const end = src.indexOf('`', i + 1);
      if (end > i) {
        flush();
        out.push({ t: 'code', v: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (ch === '*' && src[i + 1] === '*') {
      const end = src.indexOf('**', i + 2);
      if (end > i + 2) {
        flush();
        out.push({ t: 'strong', c: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if ((ch === '*' || ch === '_') && src[i + 1] !== ch && src[i + 1] !== ' ' && (ch === '*' || i === 0 || /\W/.test(src[i - 1]))) {
      const end = src.indexOf(ch, i + 1);
      if (end > i + 1 && src[end - 1] !== ' ' && (ch === '*' || end + 1 === src.length || /\W/.test(src[end + 1]))) {
        flush();
        out.push({ t: 'em', c: parseInline(src.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    if (ch === '[') {
      const close = src.indexOf('](', i + 1);
      let end = -1;
      if (close > 0) {
        // the closing ")" is the one that balances the opening, so URLs like /a_(b) work
        for (let j = close + 2, depth = 1; j < src.length; j++) {
          if (src[j] === '(') depth++;
          else if (src[j] === ')' && --depth === 0) { end = j; break; }
        }
      }
      if (close > i && end > close) {
        const label = src.slice(i + 1, close);
        const href = safeHref(src.slice(close + 2, end));
        flush();
        if (href) out.push({ t: 'link', href, c: parseInline(label) });
        else out.push(...parseInline(label));
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

export const inlineText = (c: Inline[]): string => c.map((n) => (n.t === 'text' || n.t === 'code' ? n.v : inlineText(n.c))).join('');

const splitRow = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
const isTableSep = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line) && line.includes('-');

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  const used = new Map<string, number>();
  const uniqueId = (text: string) => {
    const base = slugify(text) || 'section';
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (/^```/.test(line)) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push({ t: 'code', v: code.join('\n') });
      continue;
    }
    const h = /^(#{1,4})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      const level = (h[1].length <= 2 ? 2 : h[1].length) as 2 | 3 | 4;
      const c = parseInline(h[2]);
      blocks.push({ t: 'heading', level, c, id: uniqueId(inlineText(c)) });
      i++;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push({ t: 'hr' }); i++; continue; }
    if (/^>/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ t: 'quote', c: parseMarkdown(q.join('\n')) });
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = splitRow(line).map(parseInline);
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(splitRow(lines[i++]).map(parseInline));
      blocks.push({ t: 'table', head, rows });
      continue;
    }
    const li = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      const ordered = /\d/.test(li[1]);
      const items: { c: Inline[]; checked: boolean | null }[] = [];
      while (i < lines.length) {
        const m = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
        if (!m || /\d/.test(m[1]) !== ordered) break;
        let text = m[2];
        let checked: boolean | null = null;
        const box = /^\[( |x|X)\]\s+(.*)$/.exec(text);
        if (box) { checked = box[1] !== ' '; text = box[2]; }
        i++;
        // wrapped continuation lines (indented, not a new item)
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) text += ' ' + lines[i++].trim();
        items.push({ c: parseInline(text), checked });
      }
      blocks.push({ t: 'list', ordered, items });
      continue;
    }
    // paragraph: consecutive plain lines
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*([-*+]|\d+[.)])\s+)/.test(lines[i]) && !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])) para.push(lines[i++].trim());
    if (!para.length) { para.push(line.trim()); i++; }
    blocks.push({ t: 'p', c: parseInline(para.join(' ')) });
  }
  return blocks;
}

export function blocksText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.t) {
        case 'heading': case 'p': return inlineText(b.c);
        case 'list': return b.items.map((x) => inlineText(x.c)).join(' ');
        case 'quote': return blocksText(b.c);
        case 'code': return b.v;
        case 'table': return [...b.head, ...b.rows.flat()].map(inlineText).join(' ');
        default: return '';
      }
    })
    .join(' ');
}

export const readingMinutes = (md: string) => Math.max(1, Math.round(blocksText(parseMarkdown(md)).split(/\s+/).filter(Boolean).length / 200));

/** Contents list for long posts: the ## and ### headings with their anchor ids. */
export const outline = (blocks: Block[]) => blocks.filter((b): b is Extract<Block, { t: 'heading' }> => b.t === 'heading' && b.level <= 3).map((b) => ({ id: b.id, level: b.level, text: inlineText(b.c) }));

/** A one-sentence summary taken from the first paragraph, for use when the author didn't write an excerpt. */
export function firstParagraph(md: string, max = 180): string {
  const p = parseMarkdown(md).find((b) => b.t === 'p');
  const text = p && p.t === 'p' ? inlineText(p.c) : '';
  return text.length <= max ? text : text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}
