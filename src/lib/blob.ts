import 'server-only';
import { del, get, put } from '@vercel/blob';

/**
 * Storage layer for Vercel Blob. Works with the newer "keyless" setup (BLOB_STORE_ID + OIDC, injected by the
 * Vercel ↔ Blob integration) as well as a classic BLOB_READ_WRITE_TOKEN.
 * Stores are PRIVATE by default: files have no public link and are served through authenticated routes.
 */
export const blobConfigured = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export const BLOB_ACCESS: 'private' | 'public' = process.env.BLOB_ACCESS === 'public' ? 'public' : 'private';

export const isPrivateBlobUrl = (url: string | null | undefined) => {
  try {
    return !!url && new URL(url).hostname.endsWith('.private.blob.vercel-storage.com');
  } catch {
    return false;
  }
};

export async function putBlob(pathname: string, file: File): Promise<{ url: string; pathname: string }> {
  const r = await put(pathname, file, { access: BLOB_ACCESS, addRandomSuffix: true, contentType: file.type });
  return { url: r.url, pathname: r.pathname };
}

/** Opens a stored file for streaming. Returns null if it no longer exists. */
export async function openBlob(url: string) {
  const r = await get(url, { access: isPrivateBlobUrl(url) ? 'private' : 'public' });
  return r && r.statusCode === 200 ? r : null;
}

/** Best-effort removal of stored files (never throws; logs failures). */
export async function deleteBlobs(urls: (string | null | undefined)[]) {
  const list = urls.filter((u): u is string => !!u);
  if (!list.length || !blobConfigured()) return;
  try {
    await del(list);
  } catch (e) {
    console.error('Blob cleanup failed', e instanceof Error ? e.message : e);
  }
}

/** Round-trips a tiny file through the store (write → read → delete). Used by the admin storage check. */
export async function selfTest(): Promise<{ ok: boolean; steps: string[]; error?: string }> {
  const steps: string[] = [];
  try {
    if (!blobConfigured()) return { ok: false, steps, error: 'No Blob credentials found (need BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN).' };
    const f = new File([`homeops storage check ${new Date().toISOString()}`], 'check.txt', { type: 'text/plain' });
    const w = await putBlob('health/check.txt', f);
    steps.push(`write ok (${BLOB_ACCESS} store)`);
    const r = await openBlob(w.url);
    if (!r) throw new Error('written file could not be read back');
    const text = await new Response(r.stream).text();
    if (!text.startsWith('homeops storage check')) throw new Error('read-back content mismatch');
    steps.push('read ok');
    await del(w.url);
    steps.push('delete ok');
    return { ok: true, steps };
  } catch (e) {
    return { ok: false, steps, error: e instanceof Error ? e.message : String(e) };
  }
}
