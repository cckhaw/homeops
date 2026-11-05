'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';

type Result = { error?: string; ok?: string } | undefined;

/**
 * Form wiring for server actions that avoids React 19's automatic form reset.
 *
 * With `<form action={…}>` React resets every field to its *initial* value once the action finishes, which
 * (a) wipes what the user typed when the server returns a validation error and (b) snaps dropdowns back to the
 * values the page loaded with, even though the save succeeded. Submitting via a transition keeps the fields as
 * the user left them. Pass `resetOnSuccess` for "add another" forms that should empty after a successful save.
 */
export function useServerForm<S extends Result>(
  action: (prev: S, fd: FormData) => Promise<S>,
  opts: { resetOnSuccess?: boolean } = {},
) {
  const [state, formAction, pending] = useActionState<Result, FormData>(action as unknown as (prev: Result, fd: FormData) => Promise<Result>, undefined);
  const [, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (opts.resetOnSuccess && state?.ok) setFormKey((k) => k + 1); // remount → fields (and controlled inputs) start empty
  }, [state, opts.resetOnSuccess]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };

  return { state: state as S, pending, formKey, formProps: { onSubmit } };
}
