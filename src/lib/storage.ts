import 'server-only';
import { put } from '@vercel/blob';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

/** Uploads a brand logo (small raster image). SVG is deliberately not accepted. */
export async function uploadLogo(file: File | null): Promise<UploadResult> {
  if (!file || file.size === 0) return { url: null };
  if (file.size > 1024 * 1024) return { url: null, error: 'Logos must be under 1 MB.' };
  if (!LOGO_TYPES.includes(file.type)) return { url: null, error: 'Upload a PNG, JPG, WebP or GIF logo.' };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { url: null, error: 'File storage is not configured (missing BLOB_READ_WRITE_TOKEN). Paste a logo link instead.' };
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
  const blob = await put(`brand-logos/${safe}`, file, { access: 'public', addRandomSuffix: true });
  return { url: blob.url };
}

export type UploadResult = { url: string | null; error?: string };

/** Uploads a user file to Vercel Blob. Returns url=null when no file was supplied. */
export async function uploadFile(file: File | null, folder: string): Promise<UploadResult> {
  if (!file || file.size === 0) return { url: null };
  if (file.size > MAX_BYTES) return { url: null, error: 'Files must be under 10 MB.' };
  if (!ALLOWED.includes(file.type)) return { url: null, error: 'Upload a JPG, PNG, WebP, HEIC or PDF file.' };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { url: null, error: 'File storage is not configured (missing BLOB_READ_WRITE_TOKEN).' };
  }
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const blob = await put(`${folder}/${safe}`, file, { access: 'public', addRandomSuffix: true });
  return { url: blob.url };
}
