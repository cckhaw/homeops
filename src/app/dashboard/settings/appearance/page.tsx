import { headers } from 'next/headers';
import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { LocaleForm } from '@/components/forms';
import AppearanceSettings from '@/components/AppearanceSettings';
import { pickLocale } from '@/lib/locale';

export const metadata = { title: 'Appearance · Settings' };

export default async function AppearancePage() {
  const { user } = await requireHousehold();
  const detected = pickLocale((await headers()).get('accept-language'));
  return (
    <>
      <PageHeader title="Appearance & region" subtitle="Day or night, accent colour, language and date format." />
      <GlassCard><AppearanceSettings /></GlassCard>
      <GlassCard><LocaleForm locale={user.locale} detected={detected} /></GlassCard>
    </>
  );
}
