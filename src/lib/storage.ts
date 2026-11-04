import 'server-only';
import { put } from '@vercel/blob';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

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
