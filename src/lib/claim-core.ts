/** Warranty claim letter: plain text built from what Wodejia already knows about the item. Pure, so it is unit-tested. */
export type Resolution = 'repair' | 'replace' | 'refund';
export const RESOLUTIONS: { id: Resolution; label: string; sentence: string }[] = [
  { id: 'repair', label: 'Repair it', sentence: 'I would like the product repaired under warranty.' },
  { id: 'replace', label: 'Replace it', sentence: 'I would like the product replaced under warranty.' },
  { id: 'refund', label: 'Refund', sentence: 'I would like a refund.' },
];
export const isResolution = (r: unknown): r is Resolution => RESOLUTIONS.some((x) => x.id === r);

export type ClaimInput = {
  homeAddress?: string | null;
  asset: { name: string; make?: string | null; model?: string | null; serialNumber?: string | null; installDate?: string | null; warrantyExpiry?: string | null; priceLabel?: string | null };
  issue: string;
  issueSince?: string | null;
  resolution: Resolution;
  contact: { name?: string; phone?: string; email?: string };
  attachments: { receipt: boolean; manual: boolean; photo: boolean };
  today: string; // YYYY-MM-DD
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-03-09" → "9 Mar 2026": unambiguous in every country, so a support desk abroad reads it right. */
export function longDate(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}` : '';
}

export function claimStatus(warrantyExpiry: string | null | undefined, today: string): { state: 'none' | 'active' | 'expired'; daysLeft: number | null } {
  if (!warrantyExpiry) return { state: 'none', daysLeft: null };
  const days = Math.round((Date.parse(warrantyExpiry) - Date.parse(today)) / 86_400_000);
  return { state: days >= 0 ? 'active' : 'expired', daysLeft: days };
}

/** Things worth fixing before sending, shown as a checklist. */
export function claimWarnings(i: Pick<ClaimInput, 'asset' | 'attachments' | 'today' | 'issue'>): string[] {
  const w: string[] = [];
  const st = claimStatus(i.asset.warrantyExpiry, i.today);
  if (st.state === 'expired') w.push(`The warranty ended on ${longDate(i.asset.warrantyExpiry)}. You can still ask; some makers help with goodwill repairs or paid service.`);
  if (st.state === 'none') w.push('No warranty end date is saved for this item, so the letter does not state one.');
  if (!i.asset.serialNumber) w.push('Add the serial number to the item (or read it from the model sticker): makers almost always ask for it.');
  if (!i.attachments.receipt) w.push('No receipt is saved. Proof of purchase is usually required, so attach one if you find it.');
  if (!i.issue.trim()) w.push('Describe the fault so the support team can act on the first reply.');
  return w;
}

export function buildClaim(i: ClaimInput): { subject: string; body: string } {
  const a = i.asset;
  const product = [a.make, a.model].filter(Boolean).join(' ') || a.name;
  const subject = `Warranty claim: ${product}${a.serialNumber ? ` (serial ${a.serialNumber})` : ''}`;
  const st = claimStatus(a.warrantyExpiry, i.today);
  const res = RESOLUTIONS.find((r) => r.id === i.resolution) ?? RESOLUTIONS[0];
  const line = (label: string, v?: string | null) => (v && v.trim() ? `${label}: ${v.trim()}` : null);
  const warranty = a.warrantyExpiry ? `${longDate(a.warrantyExpiry)}${st.state === 'expired' ? ' (expired)' : ''}` : null;
  const proof = [i.attachments.receipt && 'my receipt / proof of purchase', i.attachments.photo && 'a photo of the product', i.attachments.manual && 'the product manual'].filter(Boolean) as string[];
  const lines = [
    i.asset.make ? `Dear ${a.make} Customer Support,` : 'Dear Customer Support,',
    '',
    st.state === 'expired'
      ? 'I am writing about a fault with the product below. I understand the warranty period has ended, and I would be grateful for your help.'
      : 'I am writing to make a claim under the warranty for the product below.',
    '',
    'PRODUCT',
    line('Product', a.name),
    line('Brand', a.make),
    line('Model', a.model),
    line('Serial number', a.serialNumber),
    line('Date of purchase / installation', longDate(a.installDate)),
    line('Warranty valid until', warranty),
    line('Purchase price', a.priceLabel),
    '',
    'THE PROBLEM',
    i.issue.trim() || '(please describe the fault)',
    line('First noticed', longDate(i.issueSince)),
    '',
    'WHAT I WOULD LIKE',
    res.sentence,
    '',
    proof.length ? `I have ${proof.join(', ')} and can send them on request.` : 'I can provide further details on request.',
    'Please confirm receipt of this claim and let me know the next steps, including how a collection or service visit can be arranged.',
    '',
    'Thank you,',
    i.contact.name?.trim() || null,
    line('Phone', i.contact.phone),
    line('E-mail', i.contact.email),
    line('Address', i.homeAddress),
  ].filter((l): l is string => l !== null);
  // collapse accidental blank runs
  const body = lines.join('\n').replace(/\n{3,}/g, '\n\n');
  return { subject, body };
}

/** mailto: link. Mail apps cap the URL length, so a very long body is trimmed with a pointer to the pasted/printed copy. */
export function mailtoLink(to: string, subject: string, body: string, max = 1900): string {
  const base = `mailto:${encodeURIComponent(to.trim())}`;
  const enc = (b: string) => `${base}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(b)}`;
  let b = body;
  while (enc(b).length > max && b.length > 80) b = b.slice(0, Math.floor(b.length * 0.9));
  return enc(b === body ? b : `${b.trimEnd()}…\n\n[Message shortened. Full details in the attached letter.]`);
}
