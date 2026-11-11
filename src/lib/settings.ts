import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';

export const SETTING_DEFAULTS: Record<string, { value: string; description: string }> = {
  unlimited_free_tier: {
    value: 'true',
    description: 'When true, free households have no limits on assets or members.',
  },
  free_asset_limit: { value: '10', description: 'Max assets per household when the free tier is limited.' },
  free_member_limit: { value: '3', description: 'Max members per household when the free tier is limited.' },
  demo_enabled: { value: 'false', description: 'When true, the demo sign-in below creates a sample-data sandbox for each visitor.' },
  demo_email: { value: '', description: 'E-mail typed to sign in to the demo (never a real account).' },
  demo_password: { value: '', description: 'Password for the demo sign-in. Shown publicly when the hint is on.' },
  demo_show_hint: { value: 'true', description: 'Show the demo credentials and a Try the demo button on the sign-in page and homepage.' },
  demo_hours: { value: '24', description: 'How long a demo sandbox lives before it is deleted.' },
};

export async function getSettings(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(SETTING_DEFAULTS)) out[k] = v.value;
  try {
    const rows = await db.select().from(siteSettings);
    for (const r of rows) out[r.key] = r.value;
  } catch {
    // table not migrated yet: fall back to defaults
  }
  return out;
}

export async function setSetting(key: string, value: string) {
  const description = SETTING_DEFAULTS[key]?.description ?? null;
  await db
    .insert(siteSettings)
    .values({ key, value, description })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
}

export type Limits = { unlimited: boolean; assets: number; members: number };

export async function getLimits(): Promise<Limits> {
  const s = await getSettings();
  return {
    unlimited: s.unlimited_free_tier === 'true',
    assets: Math.max(1, Number.parseInt(s.free_asset_limit, 10) || 10),
    members: Math.max(1, Number.parseInt(s.free_member_limit, 10) || 3),
  };
}

export async function readSetting(key: string) {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
  return row?.value ?? SETTING_DEFAULTS[key]?.value ?? null;
}
