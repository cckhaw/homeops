import { Building, Building2, Caravan, Hotel, House, Landmark, Mountain, Store, Tractor, TreePalm, TreePine, Waves, type LucideIcon } from 'lucide-react';
import { DEFAULT_HOME_ICON } from '@/lib/home-icons';

const ICONS: Record<string, LucideIcon> = {
  house: House,
  apartment: Building2,
  condo: Building,
  townhouse: Hotel,
  villa: Landmark,
  cabin: TreePine,
  beach: TreePalm,
  lakeside: Waves,
  mountain: Mountain,
  farm: Tractor,
  shop: Store,
  camper: Caravan,
};

/** Renders a home's icon; unknown ids fall back to the default house. */
export default function HomeIcon({ id, className }: { id: string | null | undefined; className?: string }) {
  const Icon = ICONS[id ?? ''] ?? ICONS[DEFAULT_HOME_ICON];
  return <Icon className={className ?? 'h-5 w-5'} aria-hidden />;
}
