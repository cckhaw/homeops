'use server';

import { requireAdmin } from '@/lib/auth';
import { BLOB_ACCESS, blobConfigured, selfTest } from '@/lib/blob';

export type StorageCheck = { configured: boolean; access: string; ok: boolean; steps: string[]; error?: string };

/** Admin-only: write → read → delete a tiny file to prove file storage works end to end. */
export async function runStorageCheck(): Promise<StorageCheck> {
  await requireAdmin();
  return { configured: blobConfigured(), access: BLOB_ACCESS, ...(await selfTest()) };
}
