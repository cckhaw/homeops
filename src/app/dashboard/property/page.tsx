import { requireHousehold } from '@/lib/auth';
import { getPrefs } from '@/lib/prefs';
import { todayISO } from '@/lib/utils';
import { guessRegion } from '@/lib/property-core';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import PropertyForm from '@/components/PropertyForm';

export const metadata = { title: 'Property dates' };

export default async function PropertyPage() {
  const { household } = await requireHousehold();
  const { locale, currency } = await getPrefs();
  return (
    <>
      <PageHeader title="Property dates" subtitle="Quit rent, assessment and property tax, condo fees, insurance and loan payments" />
      <div className="max-w-3xl space-y-4">
        <p className="text-[15px] text-secondary">Tick the ones that apply to {household.name}. They are added to your schedule as repeating tasks, so you get a reminder by e-mail, push or Telegram before each is due, and they show in your calendar feed.</p>
        <GlassCard><PropertyForm initialRegion={guessRegion(currency, locale)} today={todayISO()} /></GlassCard>
      </div>
    </>
  );
}
