'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { useServerForm } from './useServerForm';
import { Field, Msg } from './forms';
import AppleButton, { SubmitButton } from './AppleButton';
import { cleanDemoNow, saveDemoSettings } from '@/app/demo-admin-actions';

const makePassword = () => {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const a = new Uint32Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => alphabet[n % alphabet.length]).join('');
};

export default function DemoAdmin({ enabled, email, password, showHint, hours, active }: { enabled: boolean; email: string; password: string; showHint: boolean; hours: number; active: number }) {
  const { state, pending, formProps } = useServerForm(saveDemoSettings);
  const [pw, setPw] = useState(password);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>();
  const [busy, run] = useTransition();
  return (
    <div className="space-y-6" data-testid="demo-admin">
      <form {...formProps} noValidate className="space-y-4">
        <label className="flex min-h-[44px] items-center gap-3 text-[16px] font-medium"><input type="checkbox" name="enabled" defaultChecked={enabled} className="h-5 w-5 accent-[rgb(var(--tint))]" aria-label="Demo enabled" /> Demo enabled</label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Demo e-mail (what visitors type)"><input name="email" defaultValue={email} className="input" inputMode="email" placeholder="demo@wodejia.khaw.cc" autoComplete="off" /></Field>
          <Field label="Demo password">
            <div className="flex gap-2"><input name="password" value={pw} onChange={(e) => setPw(e.target.value)} className="input min-w-0 flex-1" autoComplete="off" placeholder="8 to 64 characters" /><AppleButton type="button" variant="secondary" aria-label="Generate a password" onClick={() => setPw(makePassword())}><RefreshCw className="h-4 w-4" aria-hidden /></AppleButton></div>
          </Field>
          <Field label="Each visitor's demo lasts (hours)"><input name="hours" type="number" min={1} max={168} defaultValue={hours} className="input" /></Field>
        </div>
        <label className="flex min-h-[44px] items-start gap-3 text-[15px]"><input type="checkbox" name="showHint" defaultChecked={showHint} className="mt-1 h-5 w-5 accent-[rgb(var(--tint))]" aria-label="Show the demo login publicly" /><span>Show the demo e-mail and password on the sign-in page, with a <b>Try the live demo</b> button on the homepage. The password is public by design: it only ever opens a throw-away sample account.</span></label>
        <Msg state={state} />
        <SubmitButton pending={pending}>Save</SubmitButton>
      </form>
      <div className="rounded-2xl bg-label/5 p-4 text-[14px]">
        <p><b>{active}</b> demo sandbox{active === 1 ? '' : 'es'} currently exist (each visitor gets their own, with twelve sample homes). They are deleted automatically after {hours} hour{hours === 1 ? '' : 's'}.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <AppleButton type="button" variant="secondary" disabled={busy} onClick={() => run(async () => setMsg(await cleanDemoNow(false)))}>Remove expired now</AppleButton>
          <AppleButton type="button" variant="secondary" disabled={busy} onClick={() => { if (confirm('Remove every demo sandbox, including ones visitors are using right now?')) run(async () => setMsg(await cleanDemoNow(true))); }}>Remove all</AppleButton>
        </div>
        <div className="mt-2"><Msg state={msg} /></div>
      </div>
    </div>
  );
}
