import { getSettings } from '@/lib/settings';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { SiteSettingsForm } from '@/components/forms';
import StorageCheck from '@/components/StorageCheck';

export const metadata = { title: 'Site config · Admin' };

export default async function AdminSettings() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Site config" subtitle="Stored in Neon's site_settings table — no redeploy needed" />
      <GlassCard>
        <SiteSettingsForm unlimited={s.unlimited_free_tier === 'true'} assetLimit={s.free_asset_limit} memberLimit={s.free_member_limit} />
      </GlassCard>
      <h2 className="mb-2 mt-8 px-1 text-[22px] font-bold">File storage</h2>
      <GlassCard><StorageCheck /></GlassCard>
    </>
  );
}
