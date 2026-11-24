import { describe, expect, it } from 'vitest';
import { sniffFileType } from '@/lib/file-sniff';

const bytes = (...n: number[]) => new Uint8Array(n);
const ascii = (s: string) => new TextEncoder().encode(s);
const cat = (...a: Uint8Array[]) => Uint8Array.from(a.flatMap((x) => [...x]));

describe('sniffFileType', () => {
  it('recognises the supported formats from their bytes', () => {
    expect(sniffFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))).toBe('png');
    expect(sniffFileType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe('jpeg');
    expect(sniffFileType(cat(ascii('RIFF'), bytes(0, 0, 0, 0), ascii('WEBPVP8 ')))).toBe('webp');
    expect(sniffFileType(ascii('GIF89a......'))).toBe('gif');
    expect(sniffFileType(cat(bytes(0, 0, 0, 0x18), ascii('ftypheic'), bytes(0, 0, 0, 0)))).toBe('heic');
    expect(sniffFileType(cat(bytes(0, 0, 0, 0x18), ascii('ftypmif1')))).toBe('heic');
    expect(sniffFileType(ascii('%PDF-1.7\n%âãÏÓ'))).toBe('pdf');
    expect(sniffFileType(cat(ascii('\n\n  '), ascii('%PDF-1.4')))).toBe('pdf');
  });
  it('rejects HTML, SVG, scripts and other content labelled as an image', () => {
    expect(sniffFileType(ascii('<!DOCTYPE html><script>alert(1)</script>'))).toBeNull();
    expect(sniffFileType(ascii('<svg xmlns="http://www.w3.org/2000/svg"><script>x</script></svg>'))).toBeNull();
    expect(sniffFileType(ascii('#!/bin/sh\nrm -rf /'))).toBeNull();
    expect(sniffFileType(ascii('PK\u0003\u0004 zip file'))).toBeNull();
    expect(sniffFileType(new Uint8Array(0))).toBeNull();
    expect(sniffFileType(bytes(0x89, 0x50))).toBeNull();
  });
  it('does not treat other ISO media as HEIC', () => {
    expect(sniffFileType(cat(bytes(0, 0, 0, 0x18), ascii('ftypmp42')))).toBeNull();
  });
});
