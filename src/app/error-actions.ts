'use server';

import { enforceIp } from '@/lib/rate-limit';
import { recordError } from '@/lib/errors';

/** Called by the error pages when something breaks in the browser. Rate-limited, sanitised, stored privately. */
export async function reportClientError(message: string, path: string) {
  if (await enforceIp('client-error', 10, 60)) return;
  await recordError({ source: 'client', route: String(path).slice(0, 200), message: String(message).slice(0, 500) });
}
