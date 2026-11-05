import Link from 'next/link';
import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { HouseholdForm, LocaleForm, ProfileForm } from '@/components/forms';
import { getPrefs } from '@/lib/prefs';
import { headers } from 'next/headers';
import { pickLocale } from '@/lib/locale';
import SignOutButton from './SignOutButton';
import AppearanceSettings from '@/components/AppearanceSettings';
import AppleButton, { SubmitButton } from '@/components/AppleButton';
import { replayWelcome } from '@/app/security-actions';
import { donationsEnabled } from '@/lib/donate';
import { emailConfigured } from '@/lib/email';
import { CalendarFeed, DeleteAccountForm, PasswordChangeForm, ReminderForm, TwoFactorSettings } from '@/components/security-forms';
import { siteBaseUrl } from '@/lib/donate';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { vapidPublicKey } from '@/lib/push';
import { whatsappConfigured } from '@/lib/whatsapp';
import { PushSettings, WhatsappSettings } from '@/components/notify-forms';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { user, household, role } = await requireHousehold();
  const prefs = await getPrefs();
  const detected = pickLocale((await headers()).get('accept-language'));
  const devices = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id)).orderBy(pushSubscriptions.createdAt);
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid items-start gap-x-8 xl:grid-cols-2">
      <div>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Appearance</h2>
      <GlassCard className="mb-8"><AppearanceSettings /></GlassCard>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Language &amp; region</h2>
      <GlassCard className="mb-8"><LocaleForm locale={user.locale} detected={detected} /></GlassCard>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Notifications</h2>
      <GlassCard className="mb-4"><ReminderForm on={user.notifyReminders} lead={user.reminderLeadDays} warranty={user.warrantyLeadDays} emailReady={emailConfigured()} /></GlassCard>
      <GlassCard className="mb-4"><PushSettings publicKey={vapidPublicKey()} devices={devices.map((d) => ({ id: d.id, label: d.label, createdAt: d.createdAt.toISOString() }))} /></GlassCard>
      <GlassCard className="mb-8"><WhatsappSettings configured={whatsappConfigured()} number={user.whatsappNumber} verified={!!user.whatsappVerifiedAt} enabled={user.notifyWhatsapp} awaitingCode={!!user.whatsappCodeHash && !!user.whatsappCodeExpires && user.whatsappCodeExpires.getTime() > Date.now()} /></GlassCard>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Calendar</h2>
      <GlassCard className="mb-8"><CalendarFeed token={user.calendarToken} baseUrl={siteBaseUrl('http://localhost:3000')} /></GlassCard>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Account</h2>
      <GlassCard className="mb-8"><ProfileForm fullName={user.fullName} email={user.email} /></GlassCard>
      </div>
      <div>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Security</h2>
      <GlassCard className="mb-4 space-y-2"><p className="text-[17px] font-semibold">Password</p><PasswordChangeForm hasPassword={!!user.passwordHash} /></GlassCard>
      <GlassCard className="mb-8"><TwoFactorSettings enabled={user.totpEnabled} recoveryLeft={(user.recoveryCodes ? JSON.parse(user.recoveryCodes) : []).length} /></GlassCard>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Privacy &amp; data</h2>
      <GlassCard className="mb-8 space-y-4">
        <p className="text-[14px] text-secondary">Your data is yours. Download a copy any time, or read our <Link href="/privacy" className="font-semibold text-tint">Privacy Policy</Link> and <Link href="/terms" className="font-semibold text-tint">Terms</Link>.</p>
        <div className="flex flex-wrap gap-3">
          <a href="/api/export" download className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-tint/10 px-5 text-[17px] font-semibold text-tint">Download my data (JSON)</a>
          <a href="/api/export?format=csv" download className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-tint/10 px-5 text-[17px] font-semibold text-tint">Assets (CSV)</a>
        </div>
        <details className="rounded-xl border p-3 hairline">
          <summary className="min-h-[44px] cursor-pointer py-2.5 text-[17px] font-semibold text-bad">Delete my account…</summary>
          <div className="pt-3"><DeleteAccountForm hasPassword={!!user.passwordHash} needsCode={user.totpEnabled} /></div>
        </details>
      </GlassCard>
      <h2 className="mb-2 px-1 text-[22px] font-bold">Current home</h2>
      <GlassCard className="mb-8"><HouseholdForm name={household.name} address={household.address} disabled={role === 'member'} currency={prefs.currency} climate={household.climate} icon={household.icon} /></GlassCard>
      {user.isAdmin && (
        <AppleButton href="/admin" variant="secondary" full className="mb-3">Admin portal</AppleButton>
      )}
      {donationsEnabled() && (
        <AppleButton href="/support" variant="secondary" full className="mb-3">☕ Buy me a coffee</AppleButton>
      )}
      <AppleButton href="/dashboard/homes" variant="secondary" full className="mb-3">Manage all my homes</AppleButton>
      <form action={replayWelcome} className="mb-3">
        <SubmitButton variant="plain" full>Replay the welcome tour</SubmitButton>
      </form>
      <SignOutButton />
      </div>
      </div>
    </>
  );
}
