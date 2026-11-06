/**
 * Rules for the logo / icon / share images an admin can upload. Pure (no I/O) so they are unit-tested.
 */
export type BrandKind = 'logo' | 'icon' | 'share';
export const BRAND_KINDS: BrandKind[] = ['logo', 'icon', 'share'];
export const isBrandKind = (k: string): k is BrandKind => (BRAND_KINDS as string[]).includes(k);

export type ImageInfo = { type: 'png' | 'jpeg' | 'webp' | 'svg'; width: number | null; height: number | null };

export const BRAND_RULES: Record<BrandKind, { label: string; types: ImageInfo['type'][]; maxBytes: number; help: string }> = {
  logo: { label: 'Logo', types: ['png', 'svg', 'webp'], maxBytes: 1_000_000, help: 'Transparent PNG, SVG or WebP, up to 1 MB. Shown wherever the full logo appears (site header, footer, sign-in, app menu). Wide or square both work.' },
  icon: { label: 'Icon', types: ['png'], maxBytes: 1_000_000, help: 'Square PNG, between 512×512 and 2048×2048, up to 1 MB. Used for the browser tab icon, the home-screen / app icon and wherever only the symbol is shown. Keep the artwork inside the central 80% so rounded icon masks do not cut it off.' },
  share: { label: 'Social share image', types: ['png'], maxBytes: 1_500_000, help: 'PNG, 1200×630 (or larger, same shape), up to 1.5 MB. Shown when a page of the site is shared on WhatsApp, Facebook, X, LinkedIn and in search previews.' },
};

const u32 = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const sig = (b: Uint8Array, s: number[]) => s.every((v, i) => b[i] === v);

/** Reads the image type and size from the file's own bytes (the browser-supplied type is not trusted). */
export function detectImage(b: Uint8Array): ImageInfo | null {
  if (b.length > 24 && sig(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) && String.fromCharCode(b[12], b[13], b[14], b[15]) === 'IHDR') {
    return { type: 'png', width: u32(b, 16), height: u32(b, 20) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    // walk the JPEG segments to the first SOFn marker
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { type: 'jpeg', height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + ((b[i + 2] << 8) | b[i + 3]);
    }
    return { type: 'jpeg', width: null, height: null };
  }
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return { type: 'webp', width: null, height: null };
  const head = new TextDecoder().decode(b.slice(0, 1024)).replace(/^﻿/, '');
  if (/^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return { type: 'svg', width: null, height: null };
  return null;
}

/** An SVG shown through <img> can't run scripts, but it is also served on its own URL, so anything active is refused outright. */
export function svgProblem(text: string): string | null {
  if (/<\s*script|<\s*foreignObject|<\s*iframe|<\s*embed|<\s*object|<!ENTITY|javascript:|data:text\/html/i.test(text)) return 'That SVG contains scripts or embedded content. Export a plain SVG with only shapes and text outlines.';
  if (/\son[a-z]+\s*=/i.test(text)) return 'That SVG contains event handlers. Export a plain SVG.';
  if (/(?:xlink:)?href\s*=\s*["']\s*(?:https?:)?\/\//i.test(text)) return 'That SVG links to external files. Embed everything inside the SVG.';
  return null;
}

export type BrandCheck = { ok: true; info: ImageInfo; contentType: string } | { ok: false; error: string };

const TYPE_LABEL: Record<ImageInfo['type'], string> = { png: 'PNG', jpeg: 'JPEG', webp: 'WebP', svg: 'SVG' };
const MIME: Record<ImageInfo['type'], string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };

export function checkBrandUpload(kind: BrandKind, bytes: Uint8Array): BrandCheck {
  const rule = BRAND_RULES[kind];
  if (!bytes.length) return { ok: false, error: 'Choose a file to upload.' };
  if (bytes.length > rule.maxBytes) return { ok: false, error: `That file is ${(bytes.length / 1_000_000).toFixed(1)} MB. The ${rule.label.toLowerCase()} must be ${(rule.maxBytes / 1_000_000).toFixed(rule.maxBytes % 1_000_000 ? 1 : 0)} MB or smaller.` };
  const info = detectImage(bytes);
  if (!info) return { ok: false, error: 'That does not look like an image. Upload a ' + rule.types.map((t) => TYPE_LABEL[t]).join(', ').replace(/, ([^,]*)$/, ' or $1') + ' file.' };
  if (!rule.types.includes(info.type)) return { ok: false, error: `The ${rule.label.toLowerCase()} must be a ${rule.types.map((t) => TYPE_LABEL[t]).join(', ').replace(/, ([^,]*)$/, ' or $1')} file (this one is ${TYPE_LABEL[info.type]}).` };
  if (info.type === 'svg') {
    const problem = svgProblem(new TextDecoder().decode(bytes));
    if (problem) return { ok: false, error: problem };
  }
  const { width: w, height: h } = info;
  if (w && h) {
    if (kind === 'icon') {
      if (w !== h) return { ok: false, error: `The icon must be square (this one is ${w}×${h}).` };
      if (w < 512 || w > 2048) return { ok: false, error: `The icon must be between 512×512 and 2048×2048 (this one is ${w}×${h}).` };
    }
    if (kind === 'share') {
      if (w < 1200 || h < 630) return { ok: false, error: `The share image must be at least 1200×630 (this one is ${w}×${h}).` };
      if (Math.abs(w / h - 1200 / 630) > 0.05) return { ok: false, error: `The share image must be about 1.9 times wider than tall, like 1200×630 (this one is ${w}×${h}).` };
      if (w > 4000 || h > 2200) return { ok: false, error: 'That image is larger than needed; export it at 1200×630.' };
    }
    if (kind === 'logo' && (w < 64 || h < 24 || w > 4000 || h > 4000)) return { ok: false, error: `The logo should be between 64 and 4000 pixels wide (this one is ${w}×${h}).` };
  }
  return { ok: true, info, contentType: MIME[info.type] };
}
