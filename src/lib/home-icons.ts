/** The icons a user can give each of their homes (shown in the sidebar switcher). Ids are stored in the database. */
export const HOME_ICONS = [
  { id: 'house', label: 'House' },
  { id: 'apartment', label: 'Apartment' },
  { id: 'condo', label: 'Condo' },
  { id: 'townhouse', label: 'Townhouse' },
  { id: 'villa', label: 'Villa' },
  { id: 'cabin', label: 'Cabin' },
  { id: 'beach', label: 'Beach house' },
  { id: 'lakeside', label: 'Lakeside' },
  { id: 'mountain', label: 'Mountain home' },
  { id: 'farm', label: 'Farm' },
  { id: 'shop', label: 'Shop' },
  { id: 'camper', label: 'Camper' },
] as const;

export type HomeIconId = (typeof HOME_ICONS)[number]['id'];
export const DEFAULT_HOME_ICON: HomeIconId = 'house';

export const isHomeIcon = (v: unknown): v is HomeIconId => HOME_ICONS.some((i) => i.id === v);
export const homeIconLabel = (id: string) => HOME_ICONS.find((i) => i.id === id)?.label ?? 'House';
