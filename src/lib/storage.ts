import 'server-only';
import { blobConfigured, putBlob } from '@/lib/blob';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export type UploadResult = { url: string | null; error?: string };

const NOT_CONFIGURED = 'File storage is not configured yet (connect a Vercel Blob store to this project).';

/** Uploads a user file (receipt / manual) to private storage. Returns url=null when no file was supplied. */
export async function uploadFile(file: File | null, folder: string): Promise<UploadResult> {
  if (!file || file.size === 0) return { url: null };
  if (file.size > MAX_BYTES) return { url: null, error: 'Files must be under 10 MB.' };
  if (!ALLOWED.includes(file.type)) return { url: null, error: 'Upload a JPG, PNG, WebP, HEIC or PDF file.' };
  if (!blobConfigured()) return { url: null, error: NOT_CONFIGURED };
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  try {
    return { url: (await putBlob(`${folder}/${safe}`, file)).url };
  } catch (e) {
    console.error('Upload failed', e instanceof Error ? e.message : e);
    return { url: null, error: 'The file could not be saved. Please try again.' };
  }
}

/** Uploads a brand logo (small raster image). SVG is deliberately not accepted. */
export async function uploadLogo(file: File | null): Promise<UploadResult> {
  if (!file || file.size === 0) return { url: null };
  if (file.size > 1024 * 1024) return { url: null, error: 'Logos must be under 1 MB.' };
  if (!LOGO_TYPES.includes(file.type)) return { url: null, error: 'Upload a PNG, JPG, WebP or GIF logo.' };
  if (!blobConfigured()) return { url: null, error: `${NOT_CONFIGURED} Or paste a logo link instead.` };
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
  try {
    return { url: (await putBlob(`brand-logos/${safe}`, file)).url };
  } catch (e) {
    console.error('Logo upload failed', e instanceof Error ? e.message : e);
    return { url: null, error: 'The logo could not be saved. Please try again.' };
  }
}
