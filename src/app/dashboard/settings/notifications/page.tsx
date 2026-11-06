import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { CalendarFeed, ReminderForm } from '@/components/security-forms';
import { PushSettings, WhatsappSettings } from '@/components/notify-forms';
import { emailConfigured } from '@/lib/email';
import { siteBaseUrl } from '@/lib/donate';
import { vapidPublicKey } from '@/lib/push';
import { whatsappConfigured } from '@/lib/whatsapp';

export const metadata = { title: 'Notifications · Settings' };

export default async function NotificationsPage() {
  const { user } = await requireHousehold();
  const devices = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id)).orderBy(pushSubscriptions.createdAt);
  return (
    <>
      <PageHeader title="Notifications" subtitle="Choose how Wodejia reminds you about tasks, warranties and documents." />
      <GlassCard><ReminderForm on={user.notifyReminders} lead={user.reminderLeadDays} warranty={user.warrantyLeadDays} emailReady={emailConfigured()} /></GlassCard>
      <GlassCard><PushSettings publicKey={vapidPublicKey()} devices={devices.map((d) => ({ id: d.id, label: d.label, createdAt: d.createdAt.toISOString() }))} /></GlassCard>
      <GlassCard><WhatsappSettings configured={whatsappConfigured()} number={user.whatsappNumber} verified={!!user.whatsappVerifiedAt} enabled={user.notifyWhatsapp} awaitingCode={!!user.whatsappCodeHash} /></GlassCard>
      <GlassCard><CalendarFeed token={user.calendarToken} baseUrl={siteBaseUrl('http://localhost:3000')} /></GlassCard>
    </>
  );
}
