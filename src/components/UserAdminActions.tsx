'use client';

import { useActionState, useState, useTransition } from 'react';
import AppleButton, { SubmitButton } from './AppleButton';
import { Msg } from './forms';
import { adminDeleteUser, adminSendReset, adminSetSuspended, adminSignOutUser, adminUnlockUser, type AdminState } from '@/app/admin-actions';
import { setUserAdmin } from '@/app/actions';

export default function UserAdminActions(props: {
  userId: string;
  email: string;
  isSelf: boolean;
  isAdmin: boolean;
  suspended: boolean;
  locked: boolean;
  emailReady: boolean;
}) {
  const [msg, setMsg] = useState<AdminState>();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<AdminState | void>) => start(async () => setMsg((await fn()) ?? { ok: 'Done.' }));
  const [delState, delAction] = useActionState<AdminState, FormData>(adminDeleteUser.bind(null, props.userId), undefined);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <AppleButton type="button" variant="secondary" disabled={pending || !props.locked} onClick={() => run(() => adminUnlockUser(props.userId))}>
          Unlock account
        </AppleButton>
        <AppleButton type="button" variant="secondary" disabled={pending} onClick={() => run(() => adminSignOutUser(props.userId))}>
          Sign out everywhere
        </AppleButton>
        <AppleButton type="button" variant="secondary" disabled={pending || !props.emailReady} onClick={() => run(() => adminSendReset(props.userId))}>
          Send password-reset e-mail
        </AppleButton>
        {!props.isSelf && (
          <>
            <AppleButton type="button" variant={props.isAdmin ? 'destructive' : 'secondary'} disabled={pending} onClick={() => run(async () => { await setUserAdmin(props.userId, !props.isAdmin); return { ok: props.isAdmin ? 'Admin role removed.' : 'Admin role granted.' }; })}>
              {props.isAdmin ? 'Remove admin role' : 'Make admin'}
            </AppleButton>
            <AppleButton type="button" variant={props.suspended ? 'primary' : 'destructive'} disabled={pending} onClick={() => run(() => adminSetSuspended(props.userId, !props.suspended))}>
              {props.suspended ? 'Reinstate account' : 'Suspend account'}
            </AppleButton>
          </>
        )}
      </div>
      <Msg state={msg} />

      {!props.isSelf && (
        <form
          action={delAction}
          onSubmit={(e) => {
            if (!window.confirm(`Permanently delete ${props.email}? This cannot be undone.`)) e.preventDefault();
          }}
          className="space-y-3 rounded-2xl border p-4 hairline"
        >
          <p className="text-[15px] font-semibold text-bad">Delete this account</p>
          <p className="text-[14px] text-secondary">Erases the account and any home only this user belongs to. Shared homes stay with the other members. Type the e-mail address to confirm.</p>
          <input name="confirm" autoComplete="off" className="input" placeholder={props.email} aria-label="Type the e-mail address to confirm" />
          <Msg state={delState} />
          <SubmitButton variant="destructive">Delete account</SubmitButton>
        </form>
      )}
    </div>
  );
}
