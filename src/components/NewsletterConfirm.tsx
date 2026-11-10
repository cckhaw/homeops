'use client';

import { useState, useTransition } from 'react';
import AppleButton from './AppleButton';
import { Msg } from './forms';
import { confirmNewsletter, unsubscribeNewsletter } from '@/app/newsletter-actions';

/** A button on purpose: mail scanners that open links automatically must not confirm or unsubscribe anyone. */
export default function NewsletterConfirm({ token, mode }: { token: string; mode: 'confirm' | 'unsub' }) {
  const [res, setRes] = useState<{ error?: string; ok?: string }>();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      {!res?.ok && <AppleButton type="button" disabled={pending} variant={mode === 'unsub' ? 'destructive' : 'primary'} onClick={() => start(async () => setRes(await (mode === 'confirm' ? confirmNewsletter(token) : unsubscribeNewsletter(token))))}>{mode === 'confirm' ? 'Confirm my subscription' : 'Unsubscribe'}</AppleButton>}
      <div role="status"><Msg state={res} /></div>
    </div>
  );
}
