import 'server-only';
import { db } from '@/db';
import { auditLog } from '@/db/schema';

/** Records an admin/security action. Never throws: logging must not break the action it describes. */
export async function audit(actor: { id: string; email: string } | null, action: string, summary: string) {
  try {
    await db.insert(auditLog).values({ actorId: actor?.id ?? null, actorEmail: actor?.email ?? null, action, summary: summary.slice(0, 500) });
  } catch (e) {
    console.error('audit log write failed', e instanceof Error ? e.message : e);
  }
}
