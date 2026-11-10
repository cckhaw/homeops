'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, Mail, Printer } from 'lucide-react';
import AppleButton from './AppleButton';
import { RESOLUTIONS, buildClaim, claimStatus, claimWarnings, mailtoLink, type Resolution } from '@/lib/claim-core';

type Props = {
  assetId: string;
  homeAddress: string | null;
  asset: { name: string; make: string | null; model: string | null; serialNumber: string | null; installDate: string | null; warrantyExpiry: string | null; priceLabel: string | null };
  attachments: { receipt: boolean; manual: boolean; photo: boolean };
  contact: { name: string; email: string };
  today: string;
};

/** Writes the claim letter as you type, then lets you copy it, e-mail it, print/save it as PDF or download it with the receipt in one zip. */
export default function ClaimBuilder({ assetId, homeAddress, asset, attachments, contact, today }: Props) {
  const [issue, setIssue] = useState('');
  const [since, setSince] = useState('');
  const [resolution, setResolution] = useState<Resolution>('repair');
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(contact.email);
  const [to, setTo] = useState('');
  const [copied, setCopied] = useState(false);

  const letter = useMemo(
    () => buildClaim({ homeAddress, asset, issue, issueSince: since || null, resolution, contact: { name, phone, email }, attachments, today }),
    [homeAddress, asset, issue, since, resolution, name, phone, email, attachments, today],
  );
  const warnings = claimWarnings({ asset, attachments, today, issue });
  const status = claimStatus(asset.warrantyExpiry, today);
  const text = `Subject: ${letter.subject}\n\n${letter.body}`;
  const zipHref = `/api/claim/${assetId}?${new URLSearchParams({ issue, since, resolution, name, phone, email }).toString()}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked: the letter is on screen to select */
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 print:hidden">
        {warnings.length > 0 && (
          <ul className="space-y-2 rounded-2xl bg-warn/10 p-4 text-[14px]" aria-label="Before you send">
            {warnings.map((w) => (
              <li key={w} className="flex items-start gap-2 text-label"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />{w}</li>
            ))}
          </ul>
        )}
        {warnings.length === 0 && status.state === 'active' && (
          <p className="flex items-center gap-2 rounded-2xl bg-ok/10 p-4 text-[14px] text-ok"><Check className="h-4 w-4" aria-hidden />Under warranty for {status.daysLeft} more day{status.daysLeft === 1 ? '' : 's'}. Everything the support team usually asks for is in the letter.</p>
        )}
        <label className="block">
          <span className="field-label">What is wrong?</span>
          <textarea value={issue} onChange={(e) => setIssue(e.target.value.slice(0, 1500))} rows={5} className="input" placeholder="e.g. The aircon blows warm air and leaks water from the indoor unit. It started after the last service." aria-label="What is wrong?" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="field-label">When did it start? (optional)</span><input type="date" value={since} max={today} onChange={(e) => setSince(e.target.value)} className="input" aria-label="When did it start" /></label>
          <label className="block"><span className="field-label">What would you like?</span>
            <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)} className="input" aria-label="What would you like">
              {RESOLUTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="field-label">Your name</span><input value={name} onChange={(e) => setName(e.target.value)} className="input" autoComplete="name" /></label>
          <label className="block"><span className="field-label">Phone (optional)</span><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" autoComplete="tel" inputMode="tel" /></label>
        </div>
        <label className="block"><span className="field-label">Your e-mail</span><input value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" inputMode="email" /></label>
        <label className="block"><span className="field-label">Send to (the maker&apos;s or shop&apos;s support e-mail, optional)</span><input value={to} onChange={(e) => setTo(e.target.value)} className="input" inputMode="email" placeholder="support@brand.com" aria-label="Send to" /></label>
      </div>

      <div className="space-y-4">
        <article id="claim-letter" className="rounded-2xl border bg-surface p-5 hairline print:rounded-none print:border-0 print:p-0" aria-label="Claim letter preview">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-secondary print:hidden">Preview</p>
          <p className="mt-1 text-[15px] font-semibold" data-testid="claim-subject">{letter.subject}</p>
          <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-[14.5px] leading-relaxed" data-testid="claim-body">{letter.body}</pre>
        </article>
        <div className="flex flex-wrap gap-2 print:hidden">
          <AppleButton type="button" onClick={copy}>{copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}{copied ? 'Copied' : 'Copy letter'}</AppleButton>
          <AppleButton href={mailtoLink(to, letter.subject, letter.body)} variant="secondary"><Mail className="h-4 w-4" aria-hidden />Open in e-mail app</AppleButton>
          <AppleButton type="button" variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />Print / save as PDF</AppleButton>
          <a href={zipHref} download className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-tint/10 px-4 text-[17px] font-semibold text-tint" data-testid="claim-zip"><Download className="h-4 w-4" aria-hidden />Download claim pack</a>
        </div>
        <p className="text-[13px] text-secondary print:hidden">The claim pack is a zip with this letter and your saved receipt, manual and photo, ready to attach. E-mail apps cannot attach files for you, so attach them from the pack.</p>
      </div>
    </div>
  );
}
