import { DEFAULT_CHECKLIST, duePeriods, nextRentDue, periodOf, renewalReminderDate } from './rental-core';
import { PROPERTY_TEMPLATES, suggestedDate } from './property-core';
import { addDays } from './utils';

/**
 * The sample data every demo visitor gets: twelve homes of different types in Singapore, Malaysia and abroad that use every
 * part of Wodejia (assets and warranties, service history, schedule, contractors, documents, utility bills, property dates,
 * rentals with rent history and condition reports, household members, shared passports). All dates are relative to
 * today so the demo always looks current. Pure (no database): the seeding is in demo.ts, the shape and coverage are unit-tested.
 */

export type DemoPerson = { key: string; name: string };
export type DemoAsset = { key: string; name: string; category: string; make: string; model: string; serial: string | null; installedDaysAgo: number; warrantyDays: number | null; priceCents: number; notes?: string };
export type DemoTask = { title: string; frequency: 'monthly' | 'quarterly' | 'biannually' | 'yearly'; dueInDays: number; asset?: string; who?: string; doneDaysAgo?: number; tenancy?: string };
export type DemoService = { asset: string; daysAgo: number; what: string; provider?: string; contractor?: string; costCents?: number };
export type DemoDoc = { title: string; category: string; expiresInDays: number | null; notes?: string };
export type DemoBill = { kind: 'electricity' | 'water' | 'gas' | 'internet'; monthsBack: number; amountCents: number; usage?: number; note?: string };
export type DemoTenancy = { key: string; tenant: string; phone: string; email: string; startMonthsAgo: number; endMonthsFromNow: number | null; rentCents: number; dueDay: number; depositCents: number; paidMonths: number; ended?: boolean; notes?: string };
export type DemoReport = { tenancy: string; kind: 'move_in' | 'move_out' | 'inspection'; daysAgo: number; notes: string; ratings: Record<string, string>; itemNotes: Record<string, string> };
export type DemoHome = {
  key: string; name: string; address: string; icon: string; climate: 'tropical' | 'temperate'; currency: string; passport?: boolean;
  members: { person: string; role: 'admin' | 'member' }[];
  assets: DemoAsset[]; tasks: DemoTask[]; services: DemoService[]; docs: DemoDoc[]; bills: DemoBill[];
  property?: ('my-quit-rent' | 'my-assessment' | 'my-strata' | 'sg-property-tax' | 'sg-mcst' | 'sg-conservancy' | 'any-insurance' | 'any-mortgage')[];
  tenancies?: DemoTenancy[]; reports?: DemoReport[];
};
export type DemoContractor = { key: string; name: string; trade: string; phone: string; email: string; notes: string; homes: string[] };
export type DemoDataset = { owner: { name: string }; people: DemoPerson[]; contractors: DemoContractor[]; homes: DemoHome[] };

const a = (key: string, name: string, category: string, make: string, model: string, serial: string | null, installedDaysAgo: number, warrantyDays: number | null, priceCents: number, notes?: string): DemoAsset => ({ key, name, category, make, model, serial, installedDaysAgo, warrantyDays, priceCents, notes });
/** Twelve months of one utility with a seasonal wobble (and an optional spike): amounts in cents. */
const monthly = (kind: DemoBill['kind'], base: number, usageBase: number | undefined, spikes: Record<number, number> = {}): DemoBill[] =>
  Array.from({ length: 12 }, (_, i) => {
    const wobble = 1 + 0.12 * Math.sin((i + 2) * 0.9);
    const f = (spikes[i] ?? 1) * wobble;
    return { kind, monthsBack: i + 1, amountCents: Math.round(base * f), usage: usageBase ? Math.round(usageBase * f) : undefined, note: spikes[i] ? 'Unusually high: check for a leak or a faulty appliance' : undefined };
  });

export const DEMO_PEOPLE: DemoPerson[] = [
  { key: 'mei', name: 'Mei Ling Tan' },
  { key: 'ravi', name: 'Ravi Kumar' },
  { key: 'daniel', name: 'Daniel Tan' },
  { key: 'siti', name: 'Siti Aminah' },
];

export function demoDataset(): DemoDataset {
  const contractors: DemoContractor[] = [
    { key: 'cool', name: 'CoolBreeze Aircon Services', trade: 'Air-con technician', phone: '+65 9123 4501', email: 'service@coolbreeze.example', notes: 'Quarterly servicing contract. WhatsApp for same-day slots.', homes: ['bukit', 'marina', 'tampines'] },
    { key: 'pipe', name: 'Aziz Plumbing & Sanitary', trade: 'Plumber', phone: '+65 9123 4502', email: 'aziz@plumbing.example', notes: 'Fixed the leak behind the kitchen wall. Reliable, quotes in writing.', homes: ['bukit', 'marina', 'tampines'] },
    { key: 'spark', name: 'BrightSpark Electrical', trade: 'Electrician', phone: '+65 9123 4503', email: 'hello@brightspark.example', notes: 'Licensed. Did the DB board upgrade.', homes: ['bukit', 'marina'] },
    { key: 'kl-cool', name: 'Sejuk Hebat Air-Cond', trade: 'Air-con technician', phone: '+60 12-345 6701', email: 'hebat@sejuk.example', notes: 'Covers Klang Valley, Johor and Penang by arrangement.', homes: ['jb', 'penang', 'shop'] },
    { key: 'kl-plumb', name: 'Hock Seng Plumbing', trade: 'Plumber', phone: '+60 12-345 6702', email: 'hockseng@plumb.example', notes: 'Emergency call-outs after hours.', homes: ['jb', 'shop', 'langkawi'] },
    { key: 'pest', name: 'TermiGuard Pest Control', trade: 'Pest control', phone: '+60 12-345 6703', email: 'book@termiguard.example', notes: 'Annual termite inspection and treatment warranty.', homes: ['jb', 'penang', 'langkawi', 'farm'] },
    { key: 'roof', name: 'Highland Roofing', trade: 'Roofer', phone: '+60 12-345 6704', email: 'roof@highland.example', notes: 'Waterproofing and gutter work for hill homes.', homes: ['cabin'] },
    { key: 'pool', name: 'Blue Lagoon Pool Care', trade: 'Pool maintenance', phone: '+60 12-345 6705', email: 'pool@bluelagoon.example', notes: 'Weekly visits included.', homes: ['penang', 'langkawi'] },
    { key: 'hvac', name: 'Northwoods HVAC', trade: 'Heating and cooling', phone: '+1 802-555-0140', email: 'service@northwoods.example', notes: 'Annual furnace tune-up each September.', homes: ['tahoe', 'chalet'] },
    { key: 'farm', name: 'Perak Pump & Irrigation', trade: 'Pumps and irrigation', phone: '+60 12-345 6706', email: 'pump@perakirrigation.example', notes: 'Maintains borehole pumps.', homes: ['farm'] },
  ];

  const homes: DemoHome[] = [
    {
      key: 'bukit', name: 'Bukit Timah Family House', address: '12 Jalan Jelita, Singapore 588000', icon: 'house', climate: 'tropical', currency: 'SGD', passport: true,
      members: [{ person: 'mei', role: 'admin' }, { person: 'daniel', role: 'member' }, { person: 'siti', role: 'member' }],
      assets: [
        a('ac-living', 'Living room air-con', 'Air Conditioner', 'Daikin', 'FTKM71', 'DK71-88123', 1500, 700, 289000, 'System 3 split unit. Serviced every 3 months.'),
        a('ac-master', 'Master bedroom air-con', 'Air Conditioner', 'Daikin', 'FTKM35', 'DK35-77410', 1500, 700, 139000),
        a('ac-b2', 'Bedroom 2 air-con', 'Air Conditioner', 'Mitsubishi Electric', 'MSY-GR25', 'MT25-33981', 900, 20, 119000, 'Warranty ends soon: claim anything now.'),
        a('ac-b3', 'Study air-con', 'Air Conditioner', 'Panasonic', 'CS-XU18', 'PN18-55002', 2300, -200, 99000, 'Out of warranty. Compressor noisy: watch it.'),
        a('fridge', 'Kitchen refrigerator', 'Refrigerator', 'LG', 'GN-B392', 'LG392-10234', 1100, 600, 219900),
        a('washer', 'Washing machine', 'Washer & Dryer', 'Samsung', 'WW90T', 'SS90-77812', 700, 400, 129900),
        a('hob', 'Gas hob and hood', 'Oven & Range', 'Rinnai', 'RB-3GI', 'RN3-90012', 2000, null, 89900),
        a('heater', 'Water heater (master bath)', 'Water Heater', 'Ariston', 'Aures S', 'AR-44120', 1800, 50, 45900),
        a('purifier', 'Water purifier', 'Water Purifier', 'Coway', 'Neo Plus', 'CW-90231', 400, 320, 65900, 'Filter change every 6 months.'),
        a('air', 'Air purifier (living)', 'Air Purifier', 'Philips', 'AC2889', 'PH-2889-5', 300, 430, 42900),
        a('tv', 'Living room TV 65"', 'TV & Electronics', 'Sony', 'XR-65X90L', 'SY65-19922', 650, 80, 319900),
        a('smoke', 'Smoke alarms (4)', 'Smoke & CO Detector', 'Kidde', '10Y29', null, 700, null, 11900),
        a('garden', 'Garden irrigation timer', 'Outdoor & Garden', 'Gardena', '1861', null, 500, 230, 8900),
        a('roof', 'Roof waterproofing', 'Roof', 'Sika', 'Sarnafil', null, 1200, 2400, 560000, '10-year workmanship warranty.'),
      ],
      tasks: [
        { title: 'Service all air-cons', frequency: 'quarterly', dueInDays: 9, who: 'mei' },
        { title: 'Change water purifier filters', frequency: 'biannually', dueInDays: -4, asset: 'purifier' },
        { title: 'Clean air purifier filter', frequency: 'quarterly', dueInDays: 22, asset: 'air', who: 'siti' },
        { title: 'Descale the water heater', frequency: 'yearly', dueInDays: 48, asset: 'heater' },
        { title: 'Check smoke alarms', frequency: 'biannually', dueInDays: 63, asset: 'smoke', who: 'daniel' },
        { title: 'Clean the washing machine drum', frequency: 'quarterly', dueInDays: 15, asset: 'washer', who: 'siti' },
        { title: 'Inspect roof and clear gutters', frequency: 'biannually', dueInDays: 90 },
        { title: 'Service all air-cons', frequency: 'quarterly', dueInDays: -80, doneDaysAgo: 78 },
        { title: 'Termite inspection', frequency: 'yearly', dueInDays: -200, doneDaysAgo: 196 },
      ],
      services: [
        { asset: 'ac-living', daysAgo: 78, what: 'Quarterly servicing: coil wash, drain flush, gas pressure check', contractor: 'cool', costCents: 6800 },
        { asset: 'ac-master', daysAgo: 78, what: 'Quarterly servicing', contractor: 'cool', costCents: 4500 },
        { asset: 'ac-b3', daysAgo: 78, what: 'Chemical wash. Compressor noisy, advised to monitor', contractor: 'cool', costCents: 12000 },
        { asset: 'ac-living', daysAgo: 350, what: 'Gas top-up after small leak repaired', contractor: 'cool', costCents: 15000 },
        { asset: 'ac-living', daysAgo: 720, what: 'Chemical overhaul (indoor and outdoor units)', contractor: 'cool', costCents: 24000 },
        { asset: 'fridge', daysAgo: 410, what: 'Replaced door gasket', provider: 'LG service centre', costCents: 8500 },
        { asset: 'washer', daysAgo: 160, what: 'Replaced drain pump', provider: 'Samsung service', costCents: 16000 },
        { asset: 'heater', daysAgo: 300, what: 'Replaced pressure valve', contractor: 'pipe', costCents: 9500 },
        { asset: 'purifier', daysAgo: 190, what: 'Filter set replacement', provider: 'Coway', costCents: 12900 },
        { asset: 'hob', daysAgo: 540, what: 'Replaced ignition electrode', contractor: 'spark', costCents: 11000 },
        { asset: 'roof', daysAgo: 400, what: 'Annual roof inspection and sealant touch-up', provider: 'Sika applicator', costCents: 35000 },
      ],
      docs: [
        { title: 'Home insurance 2026', category: 'Insurance', expiresInDays: 19, notes: 'Renew before it lapses. Compare quotes.' },
        { title: 'Mortgage agreement (DBS)', category: 'Mortgage / loan', expiresInDays: null },
        { title: 'Option to purchase and title', category: 'Title / deed', expiresInDays: null },
        { title: 'Property tax notice 2026', category: 'Tax / assessment', expiresInDays: 75 },
        { title: 'Termite treatment certificate', category: 'Permit / certificate', expiresInDays: 165 },
      ],
      bills: [...monthly('electricity', 21500, 620), ...monthly('water', 6800, 22, { 3: 2.6 }), ...monthly('gas', 2900, 9), ...monthly('internet', 5900, undefined)],
      property: ['sg-property-tax', 'any-insurance'],
    },
    {
      key: 'marina', name: 'Marina One Residences (Condo)', address: '#24-08, 7 Straits View, Singapore 018936', icon: 'condo', climate: 'tropical', currency: 'SGD', passport: true,
      members: [{ person: 'mei', role: 'admin' }],
      assets: [
        a('ac', 'Living and bedroom air-con (multi-split)', 'Air Conditioner', 'Daikin', '3MXM68', 'MR-30211', 800, 560, 410000),
        a('fridge', 'Refrigerator', 'Refrigerator', 'Bosch', 'KGN36', 'BS-36-1180', 800, 100, 189900),
        a('oven', 'Built-in oven', 'Oven & Range', 'Electrolux', 'EVE614Y', 'EL-6641', 800, 100, 99900),
        a('dw', 'Dishwasher', 'Dishwasher', 'Siemens', 'SN23', 'SM-23-905', 800, -40, 109900),
        a('heater', 'Instant water heaters (3)', 'Water Heater', 'Rheem', 'RTE-12', null, 800, 330, 69900),
        a('lock', 'Digital door lock', 'Electrical', 'Samsung', 'SHP-DP609', 'SD609-4410', 600, 540, 59900),
      ],
      tasks: [
        { title: 'Service air-cons', frequency: 'quarterly', dueInDays: 31, who: 'mei' },
        { title: 'Change door lock batteries', frequency: 'biannually', dueInDays: 40, asset: 'lock' },
        { title: 'Dishwasher: clean filter and run cleaning cycle', frequency: 'monthly', dueInDays: 6, asset: 'dw' },
        { title: 'Check sprinkler and smoke detector (condo inspection)', frequency: 'yearly', dueInDays: 120 },
      ],
      services: [
        { asset: 'ac', daysAgo: 52, what: 'General servicing (3 indoor units)', contractor: 'cool', costCents: 13500 },
        { asset: 'dw', daysAgo: 210, what: 'Replaced inlet valve', provider: 'Siemens service', costCents: 14500 },
        { asset: 'heater', daysAgo: 140, what: 'Replaced heating element (bathroom 2)', contractor: 'pipe', costCents: 7800 },
      ],
      docs: [
        { title: 'Home contents insurance', category: 'Insurance', expiresInDays: 130 },
        { title: 'Sale and purchase agreement', category: 'Title / deed', expiresInDays: null },
        { title: 'MCST house rules and renovation approval', category: 'Permit / certificate', expiresInDays: null },
      ],
      bills: [...monthly('electricity', 14500, 410), ...monthly('water', 3900, 14), ...monthly('internet', 4900, undefined)],
      property: ['sg-mcst', 'sg-property-tax'],
    },
    {
      key: 'tampines', name: 'Tampines HDB 4-room Flat', address: 'Blk 801 Tampines St 81, #09-142, Singapore 520801', icon: 'apartment', climate: 'tropical', currency: 'SGD',
      members: [{ person: 'daniel', role: 'member' }],
      assets: [
        a('ac', 'Bedroom air-conditioners (2)', 'Air Conditioner', 'Midea', 'MSAF-12', null, 1000, 90, 168000),
        a('fridge', 'Refrigerator', 'Refrigerator', 'Panasonic', 'NR-BX471', 'PN-471-02', 1000, 90, 98000),
        a('wm', 'Washing machine', 'Washer & Dryer', 'Toshiba', 'TW-BH105', null, 1500, null, 69900),
        a('fan', 'Ceiling fans (3)', 'Electrical', 'KDK', 'M56SG', null, 2000, null, 45000),
      ],
      tasks: [
        { title: 'Service air-cons', frequency: 'quarterly', dueInDays: 18 },
        { title: 'Clean ceiling fans', frequency: 'biannually', dueInDays: 44, asset: 'fan' },
      ],
      services: [{ asset: 'ac', daysAgo: 100, what: 'Chemical wash (both units)', contractor: 'cool', costCents: 18000 }],
      docs: [{ title: 'HDB fire insurance and Home Protection Scheme', category: 'Insurance', expiresInDays: 220 }, { title: 'HDB loan statement', category: 'Mortgage / loan', expiresInDays: null }],
      bills: [...monthly('electricity', 9800, 300), ...monthly('water', 3100, 12), ...monthly('internet', 3900, undefined)],
      property: ['sg-conservancy', 'sg-property-tax'],
    },
    {
      key: 'jb', name: 'Johor Bahru Terrace House (Rental)', address: '22, Jalan Setia Tropika 3, 81200 Johor Bahru', icon: 'townhouse', climate: 'tropical', currency: 'MYR',
      members: [{ person: 'ravi', role: 'admin' }],
      assets: [
        a('ac', 'Air-conditioners (4)', 'Air Conditioner', 'Daikin', 'FTV25', null, 1200, 200, 620000),
        a('wh', 'Water heaters (3)', 'Water Heater', 'Joven', 'SS-12', null, 1200, 200, 135000),
        a('fridge', 'Refrigerator (landlord furnished)', 'Refrigerator', 'Sharp', 'SJ-RX55', 'SH-5521', 1200, null, 189900),
        a('gate', 'Autogate and alarm', 'Electrical', 'Autogate', 'AG-300', null, 1000, null, 380000),
      ],
      tasks: [
        { title: 'Service air-cons before tenant check', frequency: 'biannually', dueInDays: 12, who: 'ravi' },
        { title: 'Termite inspection', frequency: 'yearly', dueInDays: 88 },
        { title: 'Check gutters and roof tiles', frequency: 'biannually', dueInDays: 55 },
      ],
      services: [{ asset: 'ac', daysAgo: 170, what: 'Chemical wash and drain flush', contractor: 'kl-cool', costCents: 56000 }, { asset: 'gate', daysAgo: 260, what: 'Replaced gate motor board', provider: 'AG service', costCents: 78000 }],
      docs: [{ title: 'Tenancy agreement (Mr and Mrs Lim)', category: 'Tenancy', expiresInDays: 190 }, { title: 'Fire insurance (landlord)', category: 'Insurance', expiresInDays: 60 }, { title: 'Quit rent receipt', category: 'Tax / assessment', expiresInDays: null }],
      bills: [...monthly('water', 4200, 18), ...monthly('electricity', 11500, 380).slice(0, 6)],
      property: ['my-quit-rent', 'my-assessment', 'any-mortgage'],
      tenancies: [{ key: 'lim', tenant: 'Mr and Mrs Lim', phone: '+60 12-777 0101', email: 'lim.family@example.com', startMonthsAgo: 7, endMonthsFromNow: 5, rentCents: 220000, dueDay: 5, depositCents: 660000, paidMonths: 5, notes: '2 parking bays. Pets not allowed.' }],
      reports: [{ tenancy: 'lim', kind: 'move_in', daysAgo: 215, notes: '2 keys, 3 remotes and 1 access card handed over. Electricity meter 04512.', ratings: { 'Living room|Walls and paint': 'good', 'Kitchen|Hob and hood': 'fair', 'Bathroom|Toilet': 'good' }, itemNotes: { 'Kitchen|Hob and hood': 'Light grease marks, one burner slow to ignite' } }],
    },
    {
      key: 'penang', name: 'Penang Hillside Villa (Holiday Rental)', address: '8, Lengkok Bukit Jambul, 11900 Penang', icon: 'villa', climate: 'tropical', currency: 'MYR', passport: true,
      members: [{ person: 'ravi', role: 'admin' }],
      assets: [
        a('pool', 'Swimming pool pump and filter', 'Outdoor & Garden', 'Hayward', 'Super Pump', 'HW-SP-2201', 1000, 120, 520000),
        a('ac', 'Air-conditioners (5)', 'Air Conditioner', 'Panasonic', 'CS-PU18', null, 1000, 120, 1050000),
        a('solar', 'Solar water heater', 'Water Heater', 'Solahart', '302J', 'SO-3020', 1300, null, 480000),
        a('tv', 'Guest TVs (3)', 'TV & Electronics', 'Samsung', 'UA55', null, 700, null, 330000),
        a('wm', 'Washer-dryer for guest linen', 'Washer & Dryer', 'LG', 'F2514', 'LG-2514-9', 700, 200, 169900),
      ],
      tasks: [
        { title: 'Pool chemical balance and filter backwash', frequency: 'monthly', dueInDays: 3, asset: 'pool', who: 'ravi' },
        { title: 'Deep-clean villa between guest stays', frequency: 'monthly', dueInDays: 10, who: 'ravi' },
        { title: 'Replace pool filter media', frequency: 'yearly', dueInDays: 140, asset: 'pool' },
      ],
      services: [{ asset: 'pool', daysAgo: 60, what: 'Replaced pump seal', contractor: 'pool', costCents: 42000 }, { asset: 'ac', daysAgo: 120, what: 'Quarterly servicing (5 units)', contractor: 'kl-cool', costCents: 35000 }],
      docs: [{ title: 'Holiday-let licence', category: 'Permit / certificate', expiresInDays: 150 }, { title: 'Villa insurance (public liability)', category: 'Insurance', expiresInDays: 40 }],
      bills: [...monthly('electricity', 28500, 880), ...monthly('water', 9000, 36)],
      property: ['my-quit-rent', 'my-assessment', 'any-insurance'],
      tenancies: [{ key: 'tan', tenant: 'Penang Stays Sdn Bhd (long let)', phone: '+60 4-555 0188', email: 'accounts@penangstays.example', startMonthsAgo: 4, endMonthsFromNow: 8, rentCents: 480000, dueDay: 1, depositCents: 1440000, paidMonths: 4, notes: 'Operator manages guests. Pool service included in rent.' }],
      reports: [{ tenancy: 'tan', kind: 'move_in', daysAgo: 125, notes: 'Inventory of furniture checked against the list.', ratings: { 'Living room|Floor': 'good', 'Living room|Air conditioner': 'good', 'Bathroom|Shower and tiles': 'fair' }, itemNotes: { 'Bathroom|Shower and tiles': 'Grout discoloured, cosmetic' } }],
    },
    {
      key: 'langkawi', name: 'Langkawi Beach House', address: 'Pantai Kok, 07000 Langkawi, Kedah', icon: 'beach', climate: 'tropical', currency: 'MYR',
      members: [{ person: 'ravi', role: 'admin' }],
      assets: [
        a('ac', 'Air-conditioners (3)', 'Air Conditioner', 'Daikin', 'FTV20', null, 1100, 40, 410000, 'Salt air: rinse the outdoor units every month.'),
        a('fridge', 'Refrigerator', 'Refrigerator', 'Samsung', 'RT38', 'SG-3811', 1100, 40, 149900),
        a('gen', 'Standby generator', 'Electrical', 'Honda', 'EU22i', 'HN-22-0091', 800, 300, 420000),
      ],
      tasks: [
        { title: 'Rinse outdoor air-con units (salt air)', frequency: 'monthly', dueInDays: 5 },
        { title: 'Test the standby generator', frequency: 'quarterly', dueInDays: 21, asset: 'gen' },
        { title: 'Check roof tiles after monsoon', frequency: 'yearly', dueInDays: 95 },
      ],
      services: [{ asset: 'ac', daysAgo: 80, what: 'Chemical wash and anti-corrosion spray', contractor: 'kl-cool', costCents: 39000 }, { asset: 'gen', daysAgo: 200, what: 'Oil and filter change', provider: 'Honda dealer', costCents: 21000 }],
      docs: [{ title: 'Building insurance', category: 'Insurance', expiresInDays: 95 }, { title: 'Tenancy agreement (ended)', category: 'Tenancy', expiresInDays: null }, { title: 'Move-out inspection report', category: 'Inspection report', expiresInDays: null }],
      bills: [...monthly('electricity', 17500, 560)],
      property: ['my-quit-rent'],
      tenancies: [{ key: 'chan', tenant: 'Ms Chan Wei', phone: '+60 12-888 0123', email: 'weichan@example.com', startMonthsAgo: 14, endMonthsFromNow: -2, rentCents: 260000, dueDay: 10, depositCents: 520000, paidMonths: 12, ended: true, notes: 'Lease ended; deposit deduction agreed.' }],
      reports: [
        { tenancy: 'chan', kind: 'move_in', daysAgo: 425, notes: 'Clean and freshly painted. Keys: 3.', ratings: { 'Living room|Walls and paint': 'good', 'Bedroom|Floor': 'good', 'Kitchen|Hob and hood': 'good', 'Bathroom|Water heater': 'good' }, itemNotes: {} },
        { tenancy: 'chan', kind: 'move_out', daysAgo: 62, notes: 'Walls need repainting in the living room; hob cleaned. All keys returned.', ratings: { 'Living room|Walls and paint': 'damaged', 'Bedroom|Floor': 'fair', 'Kitchen|Hob and hood': 'good', 'Bathroom|Water heater': 'poor' }, itemNotes: { 'Living room|Walls and paint': 'Large marks near the sofa and nail holes', 'Bathroom|Water heater': 'Not heating properly at move-out', 'Bedroom|Floor': 'Light scratches' } },
      ],
    },
    {
      key: 'cabin', name: 'Cameron Highlands Cabin', address: 'Tanah Rata, 39000 Cameron Highlands, Pahang', icon: 'cabin', climate: 'temperate', currency: 'MYR',
      members: [{ person: 'mei', role: 'member' }],
      assets: [
        a('heater', 'Electric room heaters (3)', 'HVAC', 'Delonghi', 'TRD40', null, 600, 160, 150000),
        a('dehum', 'Dehumidifier', 'Air Purifier', 'Midea', 'MDDF-20', 'MD-2012', 500, 230, 79900, 'Run daily: the highlands are damp.'),
        a('roof', 'Roof and gutters', 'Roof', 'Local contractor', 'Metal roof', null, 2500, null, 1200000),
      ],
      tasks: [
        { title: 'Clean gutters before the rainy season', frequency: 'yearly', dueInDays: 40 },
        { title: 'Empty dehumidifier daily tank check', frequency: 'monthly', dueInDays: 7, asset: 'dehum' },
        { title: 'Winterize outdoor taps and check heater', frequency: 'yearly', dueInDays: 160 },
      ],
      services: [{ asset: 'roof', daysAgo: 300, what: 'Resealed roof joints and replaced two sheets', contractor: 'roof', costCents: 180000 }],
      docs: [{ title: 'Land title (Pahang)', category: 'Title / deed', expiresInDays: null }, { title: 'Fire insurance', category: 'Insurance', expiresInDays: 250 }],
      bills: [...monthly('electricity', 7800, 240)].slice(0, 6),
    },
    {
      key: 'tahoe', name: 'Lake Tahoe Lakeside Cottage', address: '412 Lakeshore Dr, South Lake Tahoe, CA', icon: 'lakeside', climate: 'temperate', currency: 'USD',
      members: [{ person: 'daniel', role: 'admin' }],
      assets: [
        a('furnace', 'Gas furnace', 'HVAC', 'Carrier', '59TP6', 'CR-59-7781', 2000, 1400, 520000),
        a('wh', 'Water heater', 'Water Heater', 'Rheem', 'XE50T', 'RH-50-3321', 1500, 500, 140000),
        a('dock', 'Boat dock and lift', 'Outdoor & Garden', 'ShoreMaster', 'Lift 6K', null, 1800, null, 980000),
      ],
      tasks: [
        { title: 'Furnace tune-up and filter change', frequency: 'yearly', dueInDays: 75, asset: 'furnace' },
        { title: 'Winterize pipes and outdoor faucets', frequency: 'yearly', dueInDays: 105 },
        { title: 'Test smoke and CO detectors', frequency: 'biannually', dueInDays: 28 },
      ],
      services: [{ asset: 'furnace', daysAgo: 330, what: 'Annual tune-up, replaced igniter', contractor: 'hvac', costCents: 32000 }],
      docs: [{ title: 'Homeowners insurance (CA)', category: 'Insurance', expiresInDays: 110 }, { title: 'Property tax bill', category: 'Tax / assessment', expiresInDays: 45 }],
      bills: [...monthly('electricity', 15500, 700), ...monthly('gas', 8800, 90).slice(0, 6)],
    },
    {
      key: 'chalet', name: 'Hakuba Mountain Chalet', address: 'Hakuba, Nagano Prefecture, Japan', icon: 'mountain', climate: 'temperate', currency: 'JPY',
      members: [],
      assets: [
        a('boiler', 'Kerosene boiler', 'HVAC', 'Corona', 'UKB-SA470', null, 1600, null, 45000000),
        a('snow', 'Snow blower', 'Outdoor & Garden', 'Honda', 'HSS1380', 'HD-1380-23', 800, 190, 38000000),
      ],
      tasks: [
        { title: 'Service boiler before winter', frequency: 'yearly', dueInDays: 50, asset: 'boiler' },
        { title: 'Check roof snow guards', frequency: 'yearly', dueInDays: 70 },
      ],
      services: [{ asset: 'boiler', daysAgo: 360, what: 'Annual service and nozzle replacement', contractor: 'hvac', costCents: 1800000 }],
      docs: [{ title: 'Fire and earthquake insurance', category: 'Insurance', expiresInDays: 300 }],
      bills: [],
    },
    {
      key: 'farm', name: 'Perak Durian Farm', address: 'Kg. Sungai Kerawai, 36100 Bagan Datuk, Perak', icon: 'farm', climate: 'tropical', currency: 'MYR',
      members: [{ person: 'ravi', role: 'member' }],
      assets: [
        a('pump', 'Borehole pump', 'Outdoor & Garden', 'Grundfos', 'SQ 3-65', 'GF-3651', 900, 260, 380000),
        a('sprayer', 'Motorised sprayer', 'Outdoor & Garden', 'Stihl', 'SR 450', 'ST-450-77', 600, null, 215000),
        a('gen', 'Farm generator', 'Electrical', 'Yamaha', 'EF6600', 'YM-66-5', 1400, null, 520000),
        a('store', 'Cold room', 'Refrigerator', 'Carrier', 'CR-20', null, 700, 150, 1800000),
      ],
      tasks: [
        { title: 'Service borehole pump', frequency: 'yearly', dueInDays: 33, asset: 'pump', who: 'ravi' },
        { title: 'Clean and calibrate sprayer', frequency: 'quarterly', dueInDays: 14, asset: 'sprayer' },
        { title: 'Pest inspection of storage sheds', frequency: 'biannually', dueInDays: 60 },
      ],
      services: [{ asset: 'pump', daysAgo: 330, what: 'Annual service and impeller replacement', contractor: 'farm', costCents: 85000 }],
      docs: [{ title: 'Land lease', category: 'Title / deed', expiresInDays: 700 }, { title: 'Farm insurance', category: 'Insurance', expiresInDays: 200 }],
      bills: [...monthly('electricity', 22000, 700), ...monthly('water', 3500, 15).slice(0, 6)],
      property: ['my-quit-rent'],
    },
    {
      key: 'shop', name: 'Kuala Lumpur Shoplot (Commercial)', address: '56, Jalan Bangsar Utama, 59000 Kuala Lumpur', icon: 'shop', climate: 'tropical', currency: 'MYR',
      members: [{ person: 'ravi', role: 'admin' }],
      assets: [
        a('ac', 'Cassette air-conditioners (4)', 'Air Conditioner', 'Daikin', 'FCNQ', null, 1300, 200, 1480000, 'Heavy use: 12 hours a day.'),
        a('sign', 'Illuminated signboard', 'Electrical', 'Local', 'LED 4m', null, 800, null, 650000),
        a('shutter', 'Roller shutter motor', 'Garage Door', 'Hormann', 'RM-200', 'HM-200-1', 1300, null, 290000),
        a('ups', 'UPS and CCTV system', 'TV & Electronics', 'Hikvision', 'DS-7608', 'HV-7608-5', 700, 400, 420000),
        a('wh', 'Pantry water heater', 'Water Heater', 'Ariston', 'Aures', null, 700, 120, 38000),
      ],
      tasks: [
        { title: 'Service air-cons (heavy use)', frequency: 'quarterly', dueInDays: -3, who: 'ravi' },
        { title: 'Lubricate and test roller shutter', frequency: 'biannually', dueInDays: 26, asset: 'shutter' },
        { title: 'Fire extinguisher inspection', frequency: 'yearly', dueInDays: 85 },
        { title: 'Check CCTV recordings and backup', frequency: 'monthly', dueInDays: 11, asset: 'ups', who: 'ravi' },
      ],
      services: [{ asset: 'ac', daysAgo: 95, what: 'Quarterly servicing (4 cassette units)', contractor: 'kl-cool', costCents: 56000 }, { asset: 'shutter', daysAgo: 250, what: 'Replaced limit switch', provider: 'Hormann service', costCents: 42000 }],
      docs: [{ title: 'Business premises licence', category: 'Permit / certificate', expiresInDays: 88 }, { title: 'Commercial tenancy agreement (cafe)', category: 'Tenancy', expiresInDays: 280 }, { title: 'Fire safety certificate (BOMBA)', category: 'Permit / certificate', expiresInDays: 14 }],
      bills: [...monthly('electricity', 62000, 1900, { 4: 1.7 }), ...monthly('water', 8500, 30), ...monthly('internet', 18000, undefined)],
      property: ['my-assessment', 'my-quit-rent'],
      tenancies: [{ key: 'cafe', tenant: 'Brew & Bean Cafe Sdn Bhd', phone: '+60 3-2222 0150', email: 'admin@brewbean.example', startMonthsAgo: 10, endMonthsFromNow: 14, rentCents: 850000, dueDay: 1, depositCents: 2550000, paidMonths: 8, notes: '3-year commercial lease with annual review. Signage rights included.' }],
      reports: [{ tenancy: 'cafe', kind: 'move_in', daysAgo: 305, notes: 'Shell and core handed over; tenant renovation approved.', ratings: { 'Entrance and balcony|Main door and locks': 'good', 'Living room|Air conditioner': 'good', 'Meters|Electricity meter reading': 'good' }, itemNotes: { 'Meters|Electricity meter reading': 'Reading 118,420 kWh' } }, { tenancy: 'cafe', kind: 'inspection', daysAgo: 40, notes: 'Mid-term inspection. Tenant fit-out in good order.', ratings: { 'Living room|Air conditioner': 'fair', 'Bathroom|Toilet': 'good' }, itemNotes: { 'Living room|Air conditioner': 'Condensate drain slow: scheduled service' } }],
    },
    {
      key: 'camper', name: 'Weekend Camper Van', address: 'Parked at Pasir Ris, Singapore', icon: 'camper', climate: 'tropical', currency: 'SGD',
      members: [],
      assets: [
        a('fridge', '12V camper fridge', 'Refrigerator', 'Dometic', 'CRX-50', 'DM-50-221', 500, 200, 149000),
        a('solar', 'Rooftop solar and battery', 'Electrical', 'Victron', 'MPPT 100/30', null, 450, 650, 188000),
        a('awning', 'Side awning', 'Outdoor & Garden', 'Fiamma', 'F45', null, 700, null, 120000),
      ],
      tasks: [
        { title: 'Check battery and solar controller', frequency: 'quarterly', dueInDays: 17, asset: 'solar' },
        { title: 'Wash and re-seal roof seams', frequency: 'yearly', dueInDays: 100 },
        { title: 'Renew road tax and inspection', frequency: 'yearly', dueInDays: 36 },
      ],
      services: [{ asset: 'fridge', daysAgo: 150, what: 'Replaced door seal', provider: 'Dometic dealer', costCents: 6500 }],
      docs: [{ title: 'Vehicle insurance', category: 'Insurance', expiresInDays: 36 }],
      bills: [],
    },
  ];
  return { owner: { name: 'Alex Tan (Demo)' }, people: DEMO_PEOPLE, contractors, homes };
}

// ---------------------------------------------------------------- derived rows (pure helpers shared by the seeder and the tests)
export type Today = string; // YYYY-MM-DD

export const ymdMonthsAgo = (today: Today, months: number, day = 1): string => {
  const [y, m] = today.split('-').map(Number);
  const t = m - 1 - months;
  const yy = y + Math.floor(t / 12), mm = ((t % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
export const ymdMonthsAhead = (today: Today, months: number, day = 28) => ymdMonthsAgo(today, -months, day);

/** Property reminders (quit rent, assessment, property tax, condo fees…) as schedule tasks, reusing the real templates. */
export function propertyTasks(h: DemoHome, today: Today): { title: string; frequency: DemoTask['frequency']; dueDate: string }[] {
  return (h.property ?? []).map((id) => {
    const t = PROPERTY_TEMPLATES.find((x) => x.id === id)!;
    return { title: t.title, frequency: t.frequency, dueDate: suggestedDate(t, today) ?? addDays(today, 150) };
  });
}

export function tenancyRows(t: DemoTenancy, today: Today) {
  const startDate = ymdMonthsAgo(today, t.startMonthsAgo, Math.min(t.dueDay, 28));
  const endDate = t.endMonthsFromNow == null ? null : ymdMonthsAhead(today, t.endMonthsFromNow, Math.min(t.dueDay, 28) > 1 ? Math.min(t.dueDay, 28) - 1 : 28);
  const periods = duePeriods(startDate, t.ended ? endDate : endDate, t.dueDay, today);
  const paid = periods.slice(0, Math.min(t.paidMonths, periods.length));
  const nextDue = nextRentDue(t.dueDay, today);
  return {
    startDate, endDate, paid, unpaid: periods.length - paid.length, nextDue,
    renewalDue: endDate && endDate > today ? renewalReminderDate(endDate, today) : null,
    status: t.ended ? ('ended' as const) : ('active' as const), endedOn: t.ended ? endDate : null,
  };
}

export const checklistKey = (room: string, item: string) => `${room}|${item}`;
export const defaultChecklistKeys = () => DEFAULT_CHECKLIST.flatMap((r) => r.items.map((i) => checklistKey(r.room, i)));

export const demoEmailFor = (id: string) => `demo-${id.slice(0, 8)}@demo.wodejia.invalid`;
export const periodForMonthsBack = (today: Today, n: number) => `${periodOf(ymdMonthsAgo(today, n))}-01`;
