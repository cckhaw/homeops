import { describe, expect, it } from 'vitest';
import { checkBrandUpload, detectImage, svgProblem } from '@/lib/brand-core';

function png(w: number, h: number, extra = 0) {
  const b = new Uint8Array(33 + extra);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
}
const text = (s: string) => new TextEncoder().encode(s);

describe('detectImage', () => {
  it('reads PNG size from the header', () => expect(detectImage(png(1200, 630))).toEqual({ type: 'png', width: 1200, height: 630 }));
  it('detects JPEG size', () => {
    const j = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0x02, 0x76, 0x04, 0xb0, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
    expect(detectImage(j)).toEqual({ type: 'jpeg', width: 1200, height: 630 });
  });
  it('detects svg with xml prolog', () => expect(detectImage(text('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>'))?.type).toBe('svg'));
  it('rejects other content', () => expect(detectImage(text('<html></html>'))).toBeNull());
});

describe('svgProblem', () => {
  it.each(['<svg><script>alert(1)</script></svg>', '<svg onload="x()"/>', '<svg><foreignObject/></svg>', '<svg><image href="https://evil/x.png"/></svg>', '<svg><a href="javascript:alert(1)"/></svg>'])('refuses %s', (s) => expect(svgProblem(s)).toBeTruthy());
  it('allows a plain svg', () => expect(svgProblem('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z" fill="#123"/><image href="data:image/png;base64,AAAA"/></svg>')).toBeNull());
});

describe('checkBrandUpload', () => {
  it('accepts a square icon', () => expect(checkBrandUpload('icon', png(1024, 1024)).ok).toBe(true));
  it('rejects non-square or tiny icons', () => {
    expect(checkBrandUpload('icon', png(1024, 512))).toMatchObject({ ok: false });
    expect(checkBrandUpload('icon', png(256, 256))).toMatchObject({ ok: false });
    expect(checkBrandUpload('icon', png(4096, 4096))).toMatchObject({ ok: false });
  });
  it('icon must be PNG, not svg', () => expect(checkBrandUpload('icon', text('<svg xmlns="x"/>'))).toMatchObject({ ok: false }));
  it('accepts svg logo and png logo', () => {
    expect(checkBrandUpload('logo', text('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toMatchObject({ ok: true, contentType: 'image/svg+xml' });
    expect(checkBrandUpload('logo', png(800, 200))).toMatchObject({ ok: true, contentType: 'image/png' });
  });
  it('refuses a dangerous svg logo', () => expect(checkBrandUpload('logo', text('<svg><script/></svg>'))).toMatchObject({ ok: false }));
  it('share image must be ~1.9:1 and at least 1200×630', () => {
    expect(checkBrandUpload('share', png(1200, 630)).ok).toBe(true);
    expect(checkBrandUpload('share', png(1000, 500))).toMatchObject({ ok: false });
    expect(checkBrandUpload('share', png(1200, 1200))).toMatchObject({ ok: false });
  });
  it('enforces size limits and empty files', () => {
    expect(checkBrandUpload('logo', png(800, 200, 1_100_000))).toMatchObject({ ok: false });
    expect(checkBrandUpload('logo', new Uint8Array())).toMatchObject({ ok: false });
  });
  it('does not trust file names: random bytes are rejected', () => expect(checkBrandUpload('logo', text('hello world'))).toMatchObject({ ok: false }));
});
