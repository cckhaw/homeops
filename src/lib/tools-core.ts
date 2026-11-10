/**
 * Free calculators. All numbers are indicative market ranges and rules of thumb for Singapore and Malaysia homes (2026),
 * shown with that caveat on the page. Pure and unit-tested; the pages only collect inputs and display these results.
 */

// ---------------------------------------------------------------- Air-con service cost
export type AirconRegion = 'SG' | 'MY';
export type AirconType = 'wall' | 'cassette';
export type Usage = 'light' | 'normal' | 'heavy';
export const AIRCON_REGIONS: { id: AirconRegion; label: string; currency: string; symbol: string }[] = [
  { id: 'SG', label: 'Singapore', currency: 'SGD', symbol: 'S$' },
  { id: 'MY', label: 'Malaysia', currency: 'MYR', symbol: 'RM' },
];
export const AIRCON_TYPES: { id: AirconType; label: string }[] = [
  { id: 'wall', label: 'Wall-mounted split unit' },
  { id: 'cassette', label: 'Ceiling cassette' },
];
export const USAGE: { id: Usage; label: string; hint: string; general: number; wash: number; overhaul: number }[] = [
  { id: 'light', label: 'Light', hint: 'Up to about 4 hours a day', general: 2, wash: 1, overhaul: 1 / 3 },
  { id: 'normal', label: 'Normal', hint: 'About 4 to 10 hours a day, like most bedrooms and living rooms', general: 3, wash: 1, overhaul: 0.4 },
  { id: 'heavy', label: 'Heavy', hint: 'Most of the day, e.g. home office, shop or all-night use', general: 4, wash: 2, overhaul: 0.5 },
];

export type Service = 'general' | 'wash' | 'overhaul' | 'gas';
export const SERVICES: { id: Service; label: string; what: string }[] = [
  { id: 'general', label: 'General servicing', what: 'Filter and indoor coil clean, drain check, quick test' },
  { id: 'wash', label: 'Chemical wash', what: 'Indoor unit washed with cleaning chemicals, drain flushed' },
  { id: 'overhaul', label: 'Chemical overhaul', what: 'Indoor and outdoor units fully cleaned, fan and blower washed' },
  { id: 'gas', label: 'Gas top-up', what: 'Refrigerant top-up after finding and fixing a leak' },
];

/** Price per unit per visit [low, high], in the local currency. */
const PRICES: Record<AirconRegion, Record<AirconType, Record<Service, [number, number]>>> = {
  SG: {
    wall: { general: [25, 45], wash: [60, 100], overhaul: [150, 250], gas: [60, 120] },
    cassette: { general: [50, 90], wash: [120, 200], overhaul: [250, 400], gas: [80, 150] },
  },
  MY: {
    wall: { general: [40, 80], wash: [100, 180], overhaul: [250, 400], gas: [100, 180] },
    cassette: { general: [80, 150], wash: [200, 350], overhaul: [400, 650], gas: [150, 250] },
  },
};

/** Technicians usually discount multi-unit jobs. */
export const bulkFactor = (units: number) => (units >= 6 ? 0.85 : units >= 3 ? 0.9 : 1);

export type AirconInput = { region: AirconRegion; type: AirconType; units: number; usage: Usage };
export type AirconPlanRow = { service: Service; perYear: number; perVisitLow: number; perVisitHigh: number; yearLow: number; yearHigh: number };
export type AirconResult = { rows: AirconPlanRow[]; yearLow: number; yearHigh: number; perUnitLow: number; perUnitHigh: number; gasLow: number; gasHigh: number; symbol: string; units: number };

const round = (n: number) => Math.round(n);

export function airconCost(i: AirconInput): AirconResult {
  const units = Math.max(1, Math.min(20, Math.floor(i.units) || 1));
  const u = USAGE.find((x) => x.id === i.usage) ?? USAGE[1];
  const prices = PRICES[i.region][i.type];
  const f = bulkFactor(units);
  // a chemical wash replaces one general visit that year, so it is not paid twice
  const perYear: Record<Exclude<Service, 'gas'>, number> = { general: Math.max(0, u.general - u.wash), wash: u.wash, overhaul: u.overhaul };
  const rows: AirconPlanRow[] = (['general', 'wash', 'overhaul'] as const).map((s) => {
    const [lo, hi] = prices[s];
    const perVisitLow = round(lo * units * f), perVisitHigh = round(hi * units * f);
    return { service: s, perYear: perYear[s], perVisitLow, perVisitHigh, yearLow: round(perVisitLow * perYear[s]), yearHigh: round(perVisitHigh * perYear[s]) };
  });
  const yearLow = rows.reduce((a, r) => a + r.yearLow, 0), yearHigh = rows.reduce((a, r) => a + r.yearHigh, 0);
  const [gLo, gHi] = prices.gas;
  return { rows, yearLow, yearHigh, perUnitLow: round(yearLow / units), perUnitHigh: round(yearHigh / units), gasLow: round(gLo * units * f), gasHigh: round(gHi * units * f), symbol: AIRCON_REGIONS.find((r) => r.id === i.region)!.symbol, units };
}

// ---------------------------------------------------------------- Appliance lifespan
export type Lifespan = { id: string; name: string; min: number; max: number; signs: string };
export const LIFESPANS: Lifespan[] = [
  { id: 'fridge', name: 'Refrigerator', min: 10, max: 15, signs: 'Warm food, constant running, ice build-up, loud compressor' },
  { id: 'freezer', name: 'Chest or upright freezer', min: 10, max: 15, signs: 'Frost that returns quickly, food softening, high electricity use' },
  { id: 'washer', name: 'Washing machine', min: 8, max: 12, signs: 'Leaks, loud drum bearings, clothes still wet after spinning' },
  { id: 'dryer', name: 'Clothes dryer', min: 10, max: 13, signs: 'Long drying times, burning smell, worn drum rollers' },
  { id: 'dishwasher', name: 'Dishwasher', min: 9, max: 12, signs: 'Dishes not clean, standing water, rust inside' },
  { id: 'aircon', name: 'Air conditioner (split)', min: 8, max: 12, signs: 'Weak cooling after servicing, repeated gas leaks, noisy compressor, rising bills' },
  { id: 'heater-storage', name: 'Storage water heater', min: 8, max: 12, signs: 'Rusty water, leaks at the tank, long heating time' },
  { id: 'heater-instant', name: 'Instant water heater', min: 10, max: 15, signs: 'Lukewarm water, tripping, scale build-up' },
  { id: 'hob', name: 'Gas hob or cooker', min: 13, max: 15, signs: 'Uneven flames, ignition failures, worn knobs or seals' },
  { id: 'oven', name: 'Electric oven', min: 12, max: 15, signs: 'Uneven heating, door seal damage, element failures' },
  { id: 'hood', name: 'Cooker hood', min: 10, max: 14, signs: 'Weak suction, noisy motor, grease leaks' },
  { id: 'microwave', name: 'Microwave oven', min: 7, max: 10, signs: 'Sparks, uneven heating, door not sealing' },
  { id: 'rice-cooker', name: 'Rice cooker', min: 5, max: 8, signs: 'Worn non-stick coating, uneven cooking, loose lid or seal' },
  { id: 'fan', name: 'Ceiling fan', min: 10, max: 15, signs: 'Wobble, grinding noise, slow speed' },
  { id: 'tv', name: 'Television', min: 7, max: 10, signs: 'Dim or flickering picture, dead pixels, slow smart features' },
  { id: 'vacuum', name: 'Vacuum cleaner', min: 6, max: 10, signs: 'Weak suction after cleaning filters, overheating, damaged hose' },
  { id: 'robot-vacuum', name: 'Robot vacuum', min: 4, max: 6, signs: 'Short battery life, navigation errors, worn brushes and wheels' },
  { id: 'purifier', name: 'Air purifier or dehumidifier', min: 5, max: 8, signs: 'Weak airflow even with new filters, noisy fan, humidity not dropping' },
  { id: 'smoke-alarm', name: 'Smoke alarm', min: 8, max: 10, signs: 'Past the date printed on the alarm, or chirping after a battery change' },
];

export type LifeState = 'early' | 'mid' | 'late' | 'past';
export type LifeResult = { state: LifeState; pct: number; headline: string; advice: string; yearsLeftLow: number; yearsLeftHigh: number };

/** Where an appliance of `age` years sits in its typical lifespan. The tropics (heat, humidity, heavy use) tend to the low end. */
export function lifeStatus(l: Lifespan, age: number): LifeResult {
  const a = Math.max(0, age);
  const pct = Math.min(100, Math.round((a / l.max) * 100));
  const left = (n: number) => Math.max(0, Math.round((n - a) * 10) / 10);
  if (a >= l.max) return { state: 'past', pct, headline: 'Past its typical lifespan', advice: 'It may still work, but failures get likelier and repairs are often not worth it. Start comparing replacements and set money aside.', yearsLeftLow: 0, yearsLeftHigh: 0 };
  if (a >= l.min) return { state: 'late', pct, headline: 'In the replacement window', advice: 'Normal wear is now expected. Keep up maintenance, keep the receipt and warranty handy, and plan the replacement before it fails.', yearsLeftLow: 0, yearsLeftHigh: left(l.max) };
  if (a >= l.min * 0.7) return { state: 'mid', pct, headline: 'Mid to late life', advice: 'Look after it and it should reach the typical range. Watch for the warning signs below.', yearsLeftLow: left(l.min), yearsLeftHigh: left(l.max) };
  return { state: 'early', pct, headline: 'Plenty of life left', advice: 'Regular cleaning and servicing are the best way to reach the top of the range.', yearsLeftLow: left(l.min), yearsLeftHigh: left(l.max) };
}
