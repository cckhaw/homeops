'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import AppleButton from './AppleButton';
import { checkTelegramWebhook, registerTelegramWebhook, type TelegramAdminResult } from '@/app/telegram-admin-actions';

export default function TelegramAdmin({ configured }: { configured: boolean }) {
  const [res, setRes] = useState<TelegramAdminResult>();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3" data-testid="telegram-admin">
      <p className="text-[14px] text-secondary">
        Reminders on Telegram need a bot from <b>@BotFather</b>. Set <code>TELEGRAM_BOT_TOKEN</code>, <code>TELEGRAM_BOT_USERNAME</code> (without the @) and <code>TELEGRAM_WEBHOOK_SECRET</code> (any random string) in the environment, redeploy, then register the webhook here.
        Status: <b className={configured ? 'text-ok' : 'text-secondary'}>{configured ? 'configured' : 'not configured'}</b>.
      </p>
      <div className="flex flex-wrap gap-3">
        <AppleButton type="button" disabled={pending || !configured} onClick={() => start(async () => setRes(await registerTelegramWebhook()))}>Register webhook</AppleButton>
        <AppleButton type="button" variant="secondary" disabled={pending || !configured} onClick={() => start(async () => setRes(await checkTelegramWebhook()))}>Check webhook</AppleButton>
      </div>
      {res && (
        <div role="status" className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-[15px] ${res.ok ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>
          {res.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
          <span>{res.message}</span>
        </div>
      )}
    </div>
  );
}
