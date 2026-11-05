import 'server-only';
import { and, asc, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { assets, householdMembers, households, loginTokens, profiles } from '@/db/schema';
import { deleteBlobs } from '@/lib/blob';
import { listMemberships } from '@/lib/household';

/**
 * Permanently deletes a user and their personal data.
 * - Homes where they are the only member are erased entirely (assets, tasks, history, invites, uploaded files).
 * - Homes shared with others survive: ownership passes to another member (an admin first); only the leaving
 *   user's membership and account are removed.
 */
export async function eraseAccount(user: { id: string; email: string }) {
  const fileUrls: string[] = [];
  for (const { household: h } of await listMemberships(user.id)) {
    if (h.ownerId !== user.id) continue;
    const others = await db
      .select()
      .from(householdMembers)
      .where(and(eq(householdMembers.householdId, h.id), ne(householdMembers.userId, user.id)))
      .orderBy(asc(householdMembers.createdAt));
    const successor = others.find((m) => m.role === 'admin') ?? others[0];
    if (successor) {
      await db.update(households).set({ ownerId: successor.userId }).where(eq(households.id, h.id));
      await db.update(householdMembers).set({ role: 'owner' }).where(eq(householdMembers.id, successor.id));
    } else {
      const homeAssets = await db.select({ r: assets.receiptUrl, m: assets.manualUrl, p: assets.photoUrl }).from(assets).where(eq(assets.householdId, h.id));
      for (const a of homeAssets) fileUrls.push(...[a.r, a.m, a.p].filter((u): u is string => !!u));
      await db.delete(households).where(eq(households.id, h.id)); // cascades assets, tasks, records, invites, members
    }
  }
  await deleteBlobs(fileUrls);
  await db.delete(loginTokens).where(eq(loginTokens.email, user.email));
  await db.delete(profiles).where(eq(profiles.id, user.id)); // cascades memberships, reminder logs, invites they created
}
