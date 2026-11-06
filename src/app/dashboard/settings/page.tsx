import Link from 'next/link';
import { SETTINGS_SECTIONS as SECTIONS } from '@/components/settingsSections';
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
  const Section = ({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) => (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24">
      <h2 id={`${id}-h`} className="px-1 text-[22px] font-bold">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 px-1 text-[14px] text-secondary">{hint}</p>}
      {!hint && <div className="mb-2" />}
      <div className="space-y-4">{children}</div>
    </section>
  );
  return (
    <>
      <PageHeader title="Settings" />
      <div>
        {/* jump menu on phones; on larger screens the same sections are under Settings in the left menu */}
        <nav aria-label="Settings sections" className="-mx-4 mb-5 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6 md:hidden">
          <ul className="flex gap-2">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id} className="shrink-0">
                <a href={`#${id}`} className="flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border bg-surface px-4 text-[15px] font-medium hairline transition hover:bg-label/5">
                  <Icon className="h-[18px] w-[18px] text-tint" aria-hidden />{label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl space-y-10">
          <Section id="profile" title="Profile" hint="Your name and sign-in e-mail.">
            <GlassCard><ProfileForm fullName={user.fullName} email={user.email} /></GlassCard>
          </Section>

          <Section id="appearance" title="Appearance & region" hint="Day or night, accent colour, language and date format.">
            <GlassCard><AppearanceSettings /></GlassCard>
            <GlassCard><LocaleForm locale={user.locale} detected={detected} /></GlassCard>
          </Section>

          <Section id="notifications" title="Notifications" hint="Choose how Wodejia reminds you about tasks, warranties and documents.">
            <GlassCard><ReminderForm on={user.notifyReminders} lead={user.reminderLeadDays} warranty={user.warrantyLeadDays} emailReady={emailConfigured()} /></GlassCard>
            <GlassCard><PushSettings publicKey={vapidPublicKey()} devices={devices.map((d) => ({ id: d.id, label: d.label, createdAt: d.createdAt.toISOString() }))} /></GlassCard>
            <GlassCard><WhatsappSettings configured={whatsappConfigured()} number={user.whatsappNumber} verified={!!user.whatsappVerifiedAt} enabled={user.notifyWhatsapp} awaitingCode={!!user.whatsappCodeHash} /></GlassCard>
            <GlassCard><CalendarFeed token={user.calendarToken} baseUrl={siteBaseUrl('http://localhost:3000')} /></GlassCard>
          </Section>

          <Section id="security" title="Security" hint="Password and two-factor sign-in.">
            <GlassCard className="space-y-2"><p className="text-[17px] font-semibold">Password</p><PasswordChangeForm hasPassword={!!user.passwordHash} /></GlassCard>
            <GlassCard><TwoFactorSettings enabled={user.totpEnabled} recoveryLeft={(user.recoveryCodes ? JSON.parse(user.recoveryCodes) : []).length} /></GlassCard>
          </Section>

          <Section id="home" title="Current home" hint="Details of the home you are viewing. Switch homes from the menu.">
            <GlassCard><HouseholdForm name={household.name} address={household.address} disabled={role === 'member'} currency={prefs.currency} climate={household.climate} icon={household.icon} /></GlassCard>
            <AppleButton href="/dashboard/homes" variant="secondary" full>Manage all my homes</AppleButton>
          </Section>

          <Section id="privacy" title="Privacy & data" hint="Your data is yours.">
            <GlassCard className="space-y-4">
              <p className="text-[14px] text-secondary">Download a copy any time, or read our <Link href="/privacy" className="font-semibold text-tint">Privacy Policy</Link> and <Link href="/terms" className="font-semibold text-tint">Terms</Link>.</p>
              <div className="flex flex-wrap gap-3">
                <a href="/api/export" download className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-tint/10 px-5 text-[17px] font-semibold text-tint">Download my data (JSON)</a>
                <a href="/api/export?format=csv" download className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-tint/10 px-5 text-[17px] font-semibold text-tint">Assets (CSV)</a>
              </div>
              <details className="rounded-xl border p-3 hairline">
                <summary className="min-h-[44px] cursor-pointer py-2.5 text-[17px] font-semibold text-bad">Delete my account…</summary>
                <div className="pt-3"><DeleteAccountForm hasPassword={!!user.passwordHash} needsCode={user.totpEnabled} /></div>
              </details>
            </GlassCard>
          </Section>

          <div className="space-y-3 border-t pt-8 hairline">
            {user.isAdmin && <AppleButton href="/admin" variant="secondary" full>Admin portal</AppleButton>}
            {donationsEnabled() && <AppleButton href="/support" variant="secondary" full>☕ Buy me a coffee</AppleButton>}
            <form action={replayWelcome}><SubmitButton variant="plain" full>Replay the welcome tour</SubmitButton></form>
            <SignOutButton />
          </div>
        </div>
      </div>
    </>
  );
}
