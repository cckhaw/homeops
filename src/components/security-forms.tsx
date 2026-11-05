'use client';

import { useState, useTransition, useActionState } from 'react';
import { Copy, Lock, ShieldCheck } from 'lucide-react';
import AppleButton, { SubmitButton } from './AppleButton';
import { Field, Msg } from './forms';
import { PasswordField } from './auth-forms';
import {
  beginTwoFactor, changePassword, confirmTwoFactor, disableTwoFactor, removePassportPassword, saveReminderSettings,
  deleteMyAccount, sendTestReminder, setPassportPassword, unlockPassport, type FormState,
} from '@/app/security-actions';

export function PasswordChangeForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState(changePassword, undefined);
  const [pw, setPw] = useState('');
  return (
    <form action={action} className="space-y-3">
      {hasPassword && <PasswordField name="current" label="Current password" autoComplete="current-password" />}
      <PasswordField label={hasPassword ? 'New password' : 'Set a password'} showRule value={pw} onChange={setPw} />
      <PasswordField name="confirm" label="Confirm new password" />
      <p className="px-1 text-[13px] text-secondary">You&apos;ll be signed out everywhere after changing your password.</p>
      <Msg state={state} />
      <SubmitButton>{hasPassword ? 'Change password' : 'Set password'}</SubmitButton>
    </form>
  );
}

export function TwoFactorSettings({ enabled, recoveryLeft }: { enabled: boolean; recoveryLeft: number }) {
  const [step, setStep] = useState<'idle' | 'setup' | 'codes' | 'disable'>('idle');
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<FormState>();
  const [pending, start] = useTransition();
  const [isOn, setIsOn] = useState(enabled);

  const begin = () =>
    start(async () => {
      setMsg(undefined);
      const r = await beginTwoFactor();
      if (r.error || !r.secret || !r.qr) return setMsg({ error: r.error ?? 'Could not start setup.' });
      setSetup({ secret: r.secret, qr: r.qr });
      setStep('setup');
    });
  const confirm = () =>
    start(async () => {
      const r = await confirmTwoFactor(code);
      if (r.error || !r.recoveryCodes) return setMsg({ error: r.error ?? 'Could not confirm.' });
      setMsg(undefined);
      setCodes(r.recoveryCodes);
      setIsOn(true);
      setStep('codes');
      setCode('');
    });
  const disable = () =>
    start(async () => {
      const r = await disableTwoFactor(pw, code);
      if (r.error) return setMsg({ error: r.error });
      setIsOn(false);
      setStep('idle');
      setMsg({ ok: 'Two-factor authentication is off.' });
      setCode('');
      setPw('');
    });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isOn ? 'bg-ok/10 text-ok' : 'bg-label/5 text-secondary'}`}>
          {isOn ? <ShieldCheck className="h-6 w-6" aria-hidden /> : <Lock className="h-6 w-6" aria-hidden />}
        </span>
        <div>
          <p className="text-[17px] font-semibold">Two-factor authentication {isOn ? 'is on' : 'is off'}</p>
          <p className="text-[14px] text-secondary">
            {isOn ? `Sign-in needs a code from your authenticator app. ${recoveryLeft} recovery code${recoveryLeft === 1 ? '' : 's'} left.` : 'Add a second step with an authenticator app (Google Authenticator, 1Password, Authy…).'}
          </p>
        </div>
      </div>

      {step === 'idle' && !isOn && <AppleButton type="button" onClick={begin} disabled={pending}>Set up 2FA</AppleButton>}
      {step === 'idle' && isOn && <AppleButton type="button" variant="destructive" onClick={() => { setMsg(undefined); setStep('disable'); }}>Turn off 2FA</AppleButton>}

      {step === 'setup' && setup && (
        <div className="space-y-3 rounded-2xl bg-label/5 p-4">
          <p className="text-[15px]">1. Scan this QR code with your authenticator app.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="Two-factor setup QR code" width={220} height={220} className="mx-auto rounded-xl bg-white p-2" />
          <p className="text-[13px] text-secondary">Can&apos;t scan? Enter this key manually: <code className="break-all font-mono text-label">{setup.secret}</code></p>
          <p className="text-[15px]">2. Enter the 6-digit code it shows.</p>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} className="input tracking-widest" placeholder="123456" aria-label="6-digit code" />
          <div className="flex gap-2">
            <AppleButton type="button" onClick={confirm} disabled={pending || code.replace(/\s/g, '').length < 6}>Turn on</AppleButton>
            <AppleButton type="button" variant="plain" onClick={() => setStep('idle')}>Cancel</AppleButton>
          </div>
        </div>
      )}

      {step === 'codes' && (
        <div className="space-y-3 rounded-2xl border p-4 hairline">
          <p className="text-[15px] font-semibold">Save your recovery codes</p>
          <p className="text-[14px] text-secondary">Each code works once if you lose your phone. They won&apos;t be shown again.</p>
          <ul className="grid grid-cols-2 gap-2 font-mono text-[15px]">
            {codes.map((c) => <li key={c} className="rounded-lg bg-label/5 px-3 py-2 text-center">{c}</li>)}
          </ul>
          <div className="flex gap-2">
            <AppleButton type="button" variant="secondary" onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}><Copy className="h-4 w-4" aria-hidden /> Copy</AppleButton>
            <AppleButton type="button" onClick={() => setStep('idle')}>I&apos;ve saved them</AppleButton>
          </div>
        </div>
      )}

      {step === 'disable' && (
        <div className="space-y-3 rounded-2xl bg-label/5 p-4">
          <Field label="Your password"><input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="input" /></Field>
          <Field label="Authenticator or recovery code"><input value={code} onChange={(e) => setCode(e.target.value)} className="input" autoComplete="one-time-code" /></Field>
          <div className="flex gap-2">
            <AppleButton type="button" variant="destructive" onClick={disable} disabled={pending || !code}>Turn off</AppleButton>
            <AppleButton type="button" variant="plain" onClick={() => setStep('idle')}>Cancel</AppleButton>
          </div>
        </div>
      )}
      <Msg state={msg} />
    </div>
  );
}

export function ReminderForm({ on, lead, emailReady }: { on: boolean; lead: number; emailReady: boolean }) {
  const [state, action] = useActionState(saveReminderSettings, undefined);
  const [test, setTest] = useState<FormState>();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <label className="flex min-h-[44px] items-center justify-between gap-4">
          <span>
            <span className="block text-[17px] font-semibold">E-mail me maintenance reminders</span>
            <span className="block text-[13px] text-secondary">One digest when tasks are coming due, plus a weekly nudge for overdue ones.</span>
          </span>
          <input type="checkbox" name="notify" defaultChecked={on} className="h-7 w-12 shrink-0 cursor-pointer accent-[rgb(var(--tint))]" />
        </label>
        <Field label="Remind me this many days before a task is due">
          <select name="lead" defaultValue={String(lead)} className="input">
            {[1, 2, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d} day{d === 1 ? '' : 's'} before</option>)}
          </select>
        </Field>
        {!emailReady && <p className="rounded-xl bg-warn/10 px-3 py-2 text-[14px] text-warn">E-mail sending isn&apos;t configured on this site yet, so reminders can&apos;t be delivered.</p>}
        <Msg state={state} />
        <SubmitButton>Save</SubmitButton>
      </form>
      <div className="border-t pt-4 hairline">
        <AppleButton type="button" variant="secondary" disabled={pending} onClick={() => start(async () => setTest(await sendTestReminder()))}>Send me a test reminder</AppleButton>
        <div className="mt-2"><Msg state={test} /></div>
      </div>
    </div>
  );
}

export function PassportPasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState(setPassportPassword, undefined);
  const [pw, setPw] = useState('');
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[15px]">
        <Lock className={`h-4 w-4 ${hasPassword ? 'text-ok' : 'text-secondary'}`} aria-hidden />
        <span>{hasPassword ? 'Visitors need a password to view this passport.' : 'Anyone with the link can view. Add a password for extra privacy.'}</span>
      </div>
      <form action={action} className="space-y-3">
        <PasswordField label={hasPassword ? 'New passport password' : 'Passport password'} showRule value={pw} onChange={setPw} />
        <PasswordField name="confirm" label="Confirm password" />
        <Msg state={state} />
        <div className="flex flex-wrap gap-3">
          <SubmitButton>{hasPassword ? 'Change password' : 'Set password'}</SubmitButton>
        </div>
      </form>
      {hasPassword && (
        <form action={removePassportPassword}>
          <SubmitButton variant="destructive">Remove password</SubmitButton>
        </form>
      )}
    </div>
  );
}

/** Shown to visitors of a password-protected passport. */
export function PassportGate({ token, name }: { token: string; name?: string }) {
  const [state, action] = useActionState(unlockPassport.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-3">
      <PasswordField label={name ? `Password for ${name}` : 'Password'} autoComplete="off" />
      <Msg state={state} />
      <SubmitButton full>View passport</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm({ hasPassword, needsCode }: { hasPassword: boolean; needsCode: boolean }) {
  const [state, action] = useActionState(deleteMyAccount, undefined);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm('Delete your account and personal data permanently? This cannot be undone.')) e.preventDefault();
      }}
      className="space-y-3"
    >
      <p className="text-[14px] text-secondary">
        This immediately and permanently erases your account. Homes only you belong to are erased completely (assets, receipts, history). Homes shared with others stay with them, and ownership passes to another member.
      </p>
      {hasPassword && <PasswordField name="password" label="Your password" autoComplete="current-password" />}
      {needsCode && (
        <Field label="Authentication or recovery code">
          <input name="code" autoComplete="one-time-code" className="input" maxLength={12} />
        </Field>
      )}
      <Field label="Type DELETE to confirm">
        <input name="confirm" autoComplete="off" className="input" placeholder="DELETE" />
      </Field>
      <Msg state={state} />
      <SubmitButton variant="destructive">Delete my account</SubmitButton>
    </form>
  );
}
