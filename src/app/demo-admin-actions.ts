'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { audit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { isEmail, normalizeEmail } from '@/lib/accounts';
import { purgeExpiredDemos } from '@/lib/demo';
import { setSetting } from '@/lib/settings';

export type DemoAdminState = { error?: string; ok?: string } | undefined;

/** Saves the demo switch, sign-in credentials, hint and lifetime. The e-mail must not belong to a real account. */
export async function saveDemoSettings(_: DemoAdminState, fd: FormData): Promise<DemoAdminState> {
  const admin = await requireAdmin();
  const enabled = fd.get('enabled') === 'on';
  const email = normalizeEmail(String(fd.get('email') ?? ''));
  const password = String(fd.get('password') ?? '').trim();
  const hours = Math.max(1, Math.min(168, Number.parseInt(String(fd.get('hours') ?? '24'), 10) || 24));
  if (enabled || email || password) {
    if (!isEmail(email)) return { error: 'Enter an e-mail address for the demo sign-in (it can be made up, e.g. demo@yourdomain.com).' };
    if (password.length < 8 || password.length > 64) return { error: 'The demo password must be 8 to 64 characters.' };
    const [real] = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.email, email), eq(profiles.isDemo, false)));
    if (real) return { error: 'That e-mail already belongs to a real account. Choose a different one for the demo.' };
  }
  await setSetting('demo_enabled', enabled ? 'true' : 'false');
  await setSetting('demo_email', email);
  await setSetting('demo_password', password);
  await setSetting('demo_show_hint', fd.get('showHint') === 'on' ? 'true' : 'false');
  await setSetting('demo_hours', String(hours));
  await audit(admin, 'demo.settings', `Demo ${enabled ? 'enabled' : 'disabled'} (${email || 'no e-mail'}), sandboxes live ${hours} h`);
  revalidatePath('/admin/demo');
  revalidatePath('/login');
  revalidatePath('/');
  return { ok: enabled ? 'Saved. The demo is on.' : 'Saved. The demo is off.' };
}

export async function cleanDemoNow(all: boolean): Promise<DemoAdminState> {
  const admin = await requireAdmin();
  const n = await purgeExpiredDemos(all);
  await audit(admin, 'demo.purge', `Removed ${n} demo sandbox${n === 1 ? '' : 'es'}${all ? ' (all)' : ' (expired)'}`);
  revalidatePath('/admin/demo');
  return { ok: `Removed ${n} demo sandbox${n === 1 ? '' : 'es'}.` };
}
