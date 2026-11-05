'use client';

import { useState } from 'react';
import { useServerForm } from './useServerForm';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Check } from 'lucide-react';
import AppleButton, { SubmitButton } from './AppleButton';
import { Field, Msg } from './forms';
import { completePassword, registerAccount, requestPasswordReset, type FormState } from '@/app/security-actions';
import { cn } from '@/lib/utils';

const MIN = 12;

export function PasswordField({ name = 'password', label = 'Password', autoComplete = 'new-password', showRule = false, value, onChange }: {
  name?: string; label?: string; autoComplete?: string; showRule?: boolean; value?: string; onChange?: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [inner, setInner] = useState('');
  const v = value ?? inner;
  return (
    <Field label={label}>
      <div className="relative">
        <input
          name={name}
          type={show ? 'text' : 'password'}
          required
          maxLength={128}
          autoComplete={autoComplete}
          value={v}
          onChange={(e) => (onChange ? onChange(e.target.value) : setInner(e.target.value))}
          className="input pr-12"
        />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-0 top-0 grid h-[44px] w-12 place-items-center text-secondary">
          {show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      {showRule && (
        <span className={cn('mt-1.5 flex items-center gap-1.5 px-1 text-[13px]', v.length >= MIN ? 'text-ok' : 'text-secondary')}>
          <Check className="h-3.5 w-3.5" aria-hidden /> At least {MIN} characters ({v.length}/{MIN})
        </span>
      )}
    </Field>
  );
}

const loginErrors: Record<string, string> = {
  INVALID: 'Incorrect e-mail or password.',
  LOCKED: 'Too many failed attempts. Please wait 15 minutes, or reset your password.',
  EMAIL_NOT_VERIFIED: 'Please confirm your e-mail address first. Use “Forgot password?” to get a fresh link.',
  INVALID_CODE: 'That code is not correct.',
  SUSPENDED: 'This account has been suspended. Please contact support.',
  CredentialsSignin: 'Incorrect e-mail or password.',
};

export function LoginForm({ callbackUrl, notice }: { callbackUrl: string; notice?: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needCode, setNeedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn('credentials', { email, password, code, redirect: false, callbackUrl });
    if (res?.error === 'TWO_FACTOR_REQUIRED') {
      setNeedCode(true);
      setBusy(false);
      return;
    }
    if (res?.error || !res?.ok) {
      setError(loginErrors[res?.error ?? ''] ?? 'We could not sign you in. Please try again.');
      setBusy(false);
      return;
    }
    window.location.assign(res.url ?? callbackUrl);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {notice && <p role="status" className="rounded-xl bg-ok/10 px-3 py-2.5 text-center text-[14px] text-ok">{notice}</p>}
      <Field label="E-mail">
        <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" readOnly={needCode} />
      </Field>
      <PasswordField autoComplete="current-password" value={password} onChange={setPassword} />
      {needCode && (
        <Field label="Authentication code">
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={12}
            className="input tracking-widest"
            placeholder="6-digit code or recovery code"
          />
          <span className="mt-1.5 block px-1 text-[13px] text-secondary">Open your authenticator app and enter the current code.</span>
        </Field>
      )}
      {error && <p role="alert" className="px-1 text-[15px] text-bad">{error}</p>}
      <AppleButton type="submit" full disabled={busy}>{needCode ? 'Verify and sign in' : 'Sign in'}</AppleButton>
      <p className="text-center text-[14px]">
        <Link href="/forgot-password" className="font-semibold text-tint">Forgot password?</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ emailReady }: { emailReady: boolean }) {
  const [state, setState] = useState<FormState>();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setState(undefined);
    const res = await registerAccount(undefined, fd); // called exactly once
    if (res?.signIn) {
      // No e-mail service configured: the account exists already, so sign straight in.
      await signIn('credentials', { email: String(fd.get('email')), password: String(fd.get('password')), redirect: true, callbackUrl: '/dashboard' });
      return;
    }
    setState(res);
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Name (optional)">
        <input name="name" maxLength={120} autoComplete="name" className="input" />
      </Field>
      <Field label="E-mail">
        <input name="email" type="email" required autoComplete="username" className="input" placeholder="you@example.com" />
      </Field>
      {emailReady ? (
        <p className="px-1 text-[14px] text-secondary">We&apos;ll e-mail you a link to confirm your address and choose a password.</p>
      ) : (
        <>
          <PasswordField showRule value={pw} onChange={setPw} />
          <PasswordField name="confirm" label="Confirm password" />
        </>
      )}
      <Msg state={state} />
      <AppleButton type="submit" full disabled={busy}>{emailReady ? 'Continue' : 'Create account'}</AppleButton>
    </form>
  );
}

export function ForgotForm() {
  const { state, pending, formProps } = useServerForm(requestPasswordReset);
  return (
    <form {...formProps} className="space-y-3">
      <Field label="E-mail">
        <input name="email" type="email" required autoComplete="username" className="input" placeholder="you@example.com" />
      </Field>
      <Msg state={state} />
      <SubmitButton full pending={pending}>Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { state, pending, formProps } = useServerForm<FormState & { done?: boolean }>(completePassword.bind(null, token));
  const [pw, setPw] = useState('');
  if (state?.done) {
    return (
      <div className="space-y-4 text-center">
        <p role="status" className="text-[16px] text-ok">{state.ok}</p>
        <AppleButton href="/login?reset=1" full>Go to sign in</AppleButton>
      </div>
    );
  }
  return (
    <form {...formProps} className="space-y-3">
      <PasswordField label="New password" showRule value={pw} onChange={setPw} />
      <PasswordField name="confirm" label="Confirm new password" />
      <Msg state={state} />
      <SubmitButton full pending={pending}>Save password</SubmitButton>
    </form>
  );
}
