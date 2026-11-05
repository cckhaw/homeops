export const DOCUMENT_CATEGORIES = ['Insurance', 'Mortgage / loan', 'Title / deed', 'Tenancy', 'Inspection report', 'Tax / assessment', 'Permit / certificate', 'Other'] as const;
export const isDocumentCategory = (c: string): boolean => (DOCUMENT_CATEGORIES as readonly string[]).includes(c);

export type ExpiryState = { tone: 'none' | 'ok' | 'warn' | 'bad'; label: string; daysLeft: number | null };

/** Badge for a document's expiry date. `today` is a YYYY-MM-DD string so tests are deterministic. */
export function expiryState(expiresOn: string | null | undefined, today: string, warnDays = 60): ExpiryState {
  if (!expiresOn) return { tone: 'none', label: 'No expiry', daysLeft: null };
  const days = Math.round((Date.parse(expiresOn + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86_400_000);
  if (days < 0) return { tone: 'bad', label: `Expired ${-days} day${days === -1 ? '' : 's'} ago`, daysLeft: days };
  if (days === 0) return { tone: 'bad', label: 'Expires today', daysLeft: 0 };
  if (days <= warnDays) return { tone: 'warn', label: `Expires in ${days} day${days === 1 ? '' : 's'}`, daysLeft: days };
  return { tone: 'ok', label: `Valid until ${expiresOn}`, daysLeft: days };
}
