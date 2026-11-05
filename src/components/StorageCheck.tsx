'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import AppleButton from './AppleButton';
import { runStorageCheck, type StorageCheck as Result } from '@/app/storage-actions';

export default function StorageCheck() {
  const [res, setRes] = useState<Result>();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <p className="text-[14px] text-secondary">Receipts, manuals and custom brand logos are stored in your Vercel Blob store. This writes, reads and deletes a tiny test file to confirm it works.</p>
      <AppleButton type="button" variant="secondary" disabled={pending} onClick={() => start(async () => setRes(await runStorageCheck()))}>
        {pending ? 'Testing…' : 'Test file storage'}
      </AppleButton>
      {res && (
        <div role="status" className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-[15px] ${res.ok ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>
          {res.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
          <span>{res.ok ? `Storage works: ${res.steps.join(', ')}.` : `Storage check failed${res.steps.length ? ` after: ${res.steps.join(', ')}` : ''}: ${res.error}`}</span>
        </div>
      )}
    </div>
  );
}
