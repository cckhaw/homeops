/**
 * Identifies an uploaded file from its own first bytes. The type the browser reports (`file.type`) is chosen by the client,
 * so an HTML or SVG file can be labelled "image/png"; the bytes cannot lie as easily. Pure, so it is unit-tested.
 */
export type SniffedType = 'jpeg' | 'png' | 'webp' | 'gif' | 'heic' | 'pdf';

export const SNIFF_MIME: Record<SniffedType, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  pdf: 'application/pdf',
};

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.slice(from, to));
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);

export function sniffFileType(b: Uint8Array): SniffedType | null {
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 4) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return 'webp';
  if (b.length >= 6 && (ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a')) return 'gif';
  if (b.length >= 12 && ascii(b, 4, 8) === 'ftyp' && HEIC_BRANDS.has(ascii(b, 8, 12))) return 'heic';
  // PDF readers accept the header anywhere in the first kilobyte
  if (ascii(b, 0, Math.min(b.length, 1024)).includes('%PDF-')) return 'pdf';
  return null;
}

/** Reads the start of a File and returns what it really is (null if it is none of the supported types). */
export async function sniffFile(file: Blob): Promise<SniffedType | null> {
  return sniffFileType(new Uint8Array(await file.slice(0, 1024).arrayBuffer()));
}
