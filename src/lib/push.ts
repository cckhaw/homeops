import 'server-only';
import webpush from 'web-push';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';

/** Web Push needs a VAPID key pair (`npx web-push generate-vapid-keys`). Off when the keys are missing. */
export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

let ready = false;
function init() {
  if (ready) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

/** Sends to every device the user enabled. Subscriptions the push service says are gone (404/410) are removed. */
export async function sendPushToUser(userId: string, payload: { title: string; body: string; url: string }): Promise<{ sent: number; removed: number }> {
  if (!pushConfigured()) return { sent: 0, removed: 0 };
  init();
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 86_400, urgency: 'normal' });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.id);
        else console.error('Push failed', status ?? (e instanceof Error ? e.message : e));
      }
    }),
  );
  if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
  return { sent, removed: gone.length };
}
