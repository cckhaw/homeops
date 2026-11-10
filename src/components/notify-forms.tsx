'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, ExternalLink, MessageCircle, Send, Smartphone, Trash2 } from 'lucide-react';
import { useServerForm } from './useServerForm';
import { Field, Msg } from './forms';
import AppleButton, { SubmitButton } from './AppleButton';
import { confirmWhatsapp, removePushDevice, removePushSubscription, removeTelegram, removeWhatsapp, savePushSubscription, sendTestPush, sendTestTelegram, setTelegramReminders, setWhatsappReminders, startTelegramLink, startWhatsappVerification } from '@/app/notify-actions';

type FormState = { error?: string; ok?: string } | undefined;

const b64urlToBytes = (s: string) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const bytesToB64url = (b: ArrayBuffer | null) => (b ? btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '');

function deviceLabel() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${br}${os ? ' on ' + os : ''}`;
}

type Device = { id: string; label: string | null; createdAt: string };

/** Turn push notifications on or off for *this* browser, and manage the other devices. */
export function PushSettings({ publicKey, devices }: { publicKey: string | null; devices: Device[] }) {
  const [support, setSupport] = useState<'checking' | 'yes' | 'no' | 'ios-install'>('checking');
  const [here, setHere] = useState(false);
  const [msg, setMsg] = useState<FormState>();
  const [pending, start] = useTransition();

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!ok) {
      // iPhones only offer push to apps added to the Home Screen.
      setSupport(/iPhone|iPad/.test(navigator.userAgent) ? 'ios-install' : 'no');
      return;
    }
    setSupport('yes');
    navigator.serviceWorker.getRegistration('/').then((r) => r?.pushManager.getSubscription()).then((s) => setHere(!!s)).catch(() => {});
  }, []);

  if (!publicKey) return <p className="text-[14px] text-secondary">Push notifications aren&apos;t set up on this site yet.</p>;

  const enable = () =>
    start(async () => {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return setMsg({ error: 'Notifications are blocked. Allow them for this site in your browser settings, then try again.' });
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(publicKey) }));
        const r = await savePushSubscription({ endpoint: sub.endpoint, p256dh: bytesToB64url(sub.getKey('p256dh')), auth: bytesToB64url(sub.getKey('auth')), label: deviceLabel() });
        if (r?.ok) setHere(true);
        setMsg(r);
      } catch (e) {
        setMsg({ error: e instanceof Error ? e.message : 'Could not turn notifications on.' });
      }
    });

  const disable = () =>
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setHere(false);
        setMsg({ ok: 'Notifications are off for this device.' });
      } catch {
        setMsg({ error: 'Could not turn notifications off.' });
      }
    });

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint/10 text-tint"><BellRing className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0">
          <p className="text-[17px] font-semibold">Push notifications</p>
          <p className="text-[13px] text-secondary">The same reminders, as a notification on this device. Works even when Wodejia is closed.</p>
        </div>
      </div>
      {support === 'ios-install' && <p className="rounded-xl bg-warn/10 px-3 py-2 text-[14px] text-warn">On iPhone and iPad, add Wodejia to your Home Screen first (Share → Add to Home Screen), then open it from there to turn notifications on.</p>}
      {support === 'no' && <p className="rounded-xl bg-warn/10 px-3 py-2 text-[14px] text-warn">This browser doesn&apos;t support push notifications.</p>}
      {support === 'yes' && (
        <div className="flex flex-wrap gap-3">
          {here ? (
            <>
              <AppleButton type="button" variant="secondary" disabled={pending} onClick={() => start(async () => setMsg(await sendTestPush()))}>Send a test</AppleButton>
              <AppleButton type="button" variant="plain" disabled={pending} onClick={disable}>Turn off on this device</AppleButton>
            </>
          ) : (
            <AppleButton type="button" disabled={pending} onClick={enable}>Turn on for this device</AppleButton>
          )}
        </div>
      )}
      <Msg state={msg} />
      {devices.length > 0 && (
        <ul className="divide-y border-t hairline [&>li]:border-inherit" aria-label="Devices with notifications on">
          {devices.map((d) => (
            <li key={d.id} className="flex min-h-[48px] items-center justify-between gap-3" data-testid="push-device">
              <span className="flex min-w-0 items-center gap-2 text-[15px]"><Smartphone className="h-4 w-4 shrink-0 text-secondary" aria-hidden /><span className="truncate">{d.label ?? 'Device'}</span></span>
              <form action={removePushDevice.bind(null, d.id)}><button aria-label={`Remove ${d.label ?? 'device'}`} className="grid h-11 w-11 place-items-center rounded-xl text-secondary hover:text-bad"><Trash2 className="h-[18px] w-[18px]" aria-hidden /></button></form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** WhatsApp reminders: enter number → code arrives on WhatsApp → type it → on. */
export function WhatsappSettings({ configured, number, verified, enabled, awaitingCode }: { configured: boolean; number: string | null; verified: boolean; enabled: boolean; awaitingCode: boolean }) {
  const start = useServerForm(startWhatsappVerification);
  const confirm = useServerForm(confirmWhatsapp);
  const [msg, setMsg] = useState<FormState>();
  const [pending, run] = useTransition();
  const [on, setOn] = useState(enabled); // optimistic: flips at once, reverts if the server says no
  useEffect(() => setOn(enabled), [enabled]);
  if (!configured) {
    return (
      <div className="flex items-start gap-3" data-testid="whatsapp-soon">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-label/5 text-secondary"><MessageCircle className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold">
            WhatsApp reminders
            <span className="rounded-full bg-tint/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-tint">Coming soon</span>
          </p>
          <p className="text-[13px] text-secondary">We&apos;re working on reminders by WhatsApp. Until then, use e-mail or push notifications above — we&apos;ll announce it here when it&apos;s ready.</p>
        </div>
      </div>
    );
  }
  const asked = awaitingCode || !!start.state?.ok;
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint/10 text-tint"><MessageCircle className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0">
          <p className="text-[17px] font-semibold">WhatsApp reminders</p>
          <p className="text-[13px] text-secondary">Get the same digest as a WhatsApp message. We only message you about your reminders, and you can turn it off or remove your number at any time.</p>
        </div>
      </div>

      {verified && number ? (
        <div className="space-y-3">
          <label className="flex min-h-[44px] items-center justify-between gap-4">
            <span className="text-[15px]">Send reminders to <b>+{number.slice(0, 2)}••••{number.slice(-3)}</b></span>
            <input type="checkbox" aria-label="WhatsApp reminders on" checked={on} disabled={pending} onChange={(e) => { const v = e.target.checked; setOn(v); run(async () => { const r = await setWhatsappReminders(v); if (r?.error) setOn(!v); setMsg(r); }); }} className="h-7 w-12 shrink-0 cursor-pointer accent-[rgb(var(--tint))]" />
          </label>
          <AppleButton type="button" variant="plain" disabled={pending} onClick={() => run(async () => setMsg(await removeWhatsapp()))}>Remove my number</AppleButton>
        </div>
      ) : (
        <>
          <form {...start.formProps} className="space-y-3">
            <Field label="WhatsApp number (with country code)">
              <input name="phone" type="tel" inputMode="tel" required maxLength={40} className="input" placeholder="+60 12-345 6789" />
            </Field>
            <p className="px-1 text-[13px] text-secondary">By continuing you agree to receive Wodejia reminders on WhatsApp. We&apos;ll send a code to confirm the number is yours.</p>
            <Msg state={start.state} />
            <SubmitButton pending={start.pending} variant={asked ? 'secondary' : 'primary'}>{asked ? 'Send a new code' : 'Send code'}</SubmitButton>
          </form>
          {asked && (
            <form {...confirm.formProps} className="space-y-3 border-t pt-3 hairline">
              <Field label="6-digit code from WhatsApp">
                <input name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} className="input" />
              </Field>
              <Msg state={confirm.state} />
              <SubmitButton pending={confirm.pending}>Confirm and turn on</SubmitButton>
            </form>
          )}
        </>
      )}
      <Msg state={msg} />
    </div>
  );
}

/** Telegram reminders: press Connect → open the link in Telegram → press Start. The page notices the link by itself. */
export function TelegramSettings({ configured, linked, enabled }: { configured: boolean; linked: boolean; enabled: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<FormState>();
  const [link, setLink] = useState<string>();
  const [pending, run] = useTransition();
  const [on, setOn] = useState(enabled);
  useEffect(() => setOn(enabled), [enabled]);
  // while a link is waiting to be opened, check every 3 seconds (for up to 5 minutes) whether the connection has happened
  useEffect(() => {
    if (!link || linked) return;
    let n = 0;
    const t = setInterval(() => { router.refresh(); if (++n > 100) clearInterval(t); }, 3000);
    return () => clearInterval(t);
  }, [link, linked, router]);
  useEffect(() => { if (linked) setLink(undefined); }, [linked]);

  const head = (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint/10 text-tint"><Send className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0">
        <p className="text-[17px] font-semibold">Telegram reminders</p>
        <p className="text-[13px] text-secondary">The same daily reminders as a Telegram message. Free, and no phone number is shared with Wodejia.</p>
      </div>
    </div>
  );
  if (!configured) {
    return (
      <div className="space-y-3" data-testid="telegram-card">
        {head}
        <p className="rounded-xl bg-label/5 px-3 py-2 text-[14px] text-secondary" data-testid="telegram-off">Telegram reminders are not set up on this site yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3" data-testid="telegram-card">
      {head}
      {!linked ? (
        <div className="space-y-3">
          {!link ? (
            <AppleButton type="button" disabled={pending} onClick={() => run(async () => { const r = await startTelegramLink(); if (r.error) setMsg({ error: r.error }); else { setMsg(undefined); setLink(r.url); } })}>Connect Telegram</AppleButton>
          ) : (
            <div className="space-y-2 rounded-xl bg-tint/5 p-3" data-testid="telegram-link-box">
              <p className="text-[14px]">Open this link in Telegram and press <b>Start</b>. It works once and expires in 15 minutes.</p>
              <div className="flex flex-wrap gap-2">
                <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-tint px-4 text-[17px] font-semibold text-ontint" data-testid="telegram-link"><ExternalLink className="h-4 w-4" aria-hidden />Open Telegram</a>
                <AppleButton type="button" variant="plain" onClick={() => setLink(undefined)}>Cancel</AppleButton>
              </div>
              <p className="text-[13px] text-secondary" role="status">Waiting for you to press Start in Telegram…</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex min-h-[44px] items-center gap-3 text-[16px]">
            <input type="checkbox" checked={on} disabled={pending} onChange={(e) => { const v = e.target.checked; setOn(v); run(async () => { const r = await setTelegramReminders(v); setMsg(r); if (r?.error) setOn(!v); }); }} className="h-5 w-5 accent-[rgb(var(--tint))]" />
            Send my reminders on Telegram
          </label>
          <div className="flex flex-wrap gap-3">
            <AppleButton type="button" variant="secondary" disabled={pending} onClick={() => run(async () => setMsg(await sendTestTelegram()))}>Send a test</AppleButton>
            <AppleButton type="button" variant="plain" disabled={pending} onClick={() => run(async () => setMsg(await removeTelegram()))}>Disconnect</AppleButton>
          </div>
        </div>
      )}
      <Msg state={msg} />
    </div>
  );
}
