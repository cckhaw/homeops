import 'server-only';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { isMember } from '@/lib/household';

/**
 * Links and QR stickers open an asset by id, but the app only shows the *active* home. If the asset belongs to
 * another home the user is a member of, send them through the home switcher and back instead of a "not found".
 * Returns normally (so the caller can 404) when the asset doesn't exist or isn't theirs.
 */
export async function followAssetToItsHome(userId: string, assetId: string, path: string): Promise<void> {
  const [a] = await db.select({ householdId: assets.householdId }).from(assets).where(eq(assets.id, assetId));
  if (a && (await isMember(userId, a.householdId))) redirect(`/api/switch-home?home=${a.householdId}&next=${encodeURIComponent(path)}`);
}
