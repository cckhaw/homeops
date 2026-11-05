/** Pure decision rules for reminder e-mails (no database or e-mail access, so they are unit-tested). */

export const WARRANTY_FINAL_DAYS = 7;
export const OVERDUE_REPEAT_MS = 7 * 86_400_000;

export type WarrantyKind = 'lead' | 'final';

/** Which warranty notices are due for an asset whose warranty ends in `daysLeft` days. */
export function warrantyKindsDue(daysLeft: number, leadDays: number): WarrantyKind[] {
  if (leadDays <= 0 || daysLeft < 0) return [];
  const kinds: WarrantyKind[] = [];
  if (daysLeft <= leadDays) kinds.push('lead');
  if (daysLeft <= WARRANTY_FINAL_DAYS) kinds.push('final');
  return kinds;
}

export type WarrantyCandidate = { id: string; name: string; warrantyExpiry: string; daysLeft: number };
export type WarrantyPick = { asset: WarrantyCandidate; kind: WarrantyKind; marks: WarrantyKind[] };

/**
 * One e-mail line per asset: the most urgent notice not yet sent. A warranty already inside its final week
 * when first noticed gets a single "final" notice (both kinds are recorded so it is not mailed twice).
 */
export function pickWarranties(assets: WarrantyCandidate[], leadDays: number, sent: Set<string>, force = false): WarrantyPick[] {
  const out: WarrantyPick[] = [];
  for (const asset of assets) {
    const due = warrantyKindsDue(asset.daysLeft, leadDays);
    if (!due.length) continue;
    const unsent = force ? due : due.filter((k) => !sent.has(`${asset.id}:${k}`));
    if (!unsent.length) continue;
    out.push({ asset, kind: unsent.includes('final') ? 'final' : 'lead', marks: due });
  }
  return out.sort((a, b) => a.asset.daysLeft - b.asset.daysLeft);
}

/** A task is mailed once; while it stays overdue it is mailed again weekly. `force` ignores the log (test e-mail). */
export function shouldRemindTask(daysUntilDue: number, lastSentMs: number | undefined, nowMs: number, force = false): boolean {
  if (force || lastSentMs === undefined) return true;
  return daysUntilDue < 0 && nowMs - lastSentMs >= OVERDUE_REPEAT_MS;
}
