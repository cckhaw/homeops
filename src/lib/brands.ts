/** Popular home-appliance / equipment brands → website domain (used to fetch the logo). */
export const BRANDS: Record<string, string> = {
  'A. O. Smith': 'aosmith.com', Amana: 'amana.com', Apple: 'apple.com', Bissell: 'bissell.com', Bosch: 'bosch-home.com',
  'Bradford White': 'bradfordwhite.com', Broan: 'broan-nutone.com', Carrier: 'carrier.com', Chamberlain: 'chamberlain.com',
  Culligan: 'culligan.com', Daikin: 'daikin.com', Delta: 'deltafaucet.com', DeWalt: 'dewalt.com', Dyson: 'dyson.com',
  Ecobee: 'ecobee.com', Electrolux: 'electrolux.com', Enphase: 'enphase.com', 'Fisher & Paykel': 'fisherpaykel.com',
  Frigidaire: 'frigidaire.com', GE: 'geappliances.com', Generac: 'generac.com', Genie: 'geniecompany.com', Goodman: 'goodmanmfg.com',
  Google: 'google.com', Haier: 'haier.com', Hisense: 'hisense.com', Honeywell: 'honeywell.com', Hotpoint: 'hotpoint.com',
  Husqvarna: 'husqvarna.com', iRobot: 'irobot.com', Kenmore: 'kenmore.com', KitchenAid: 'kitchenaid.com', Kohler: 'kohler.com',
  Lennox: 'lennox.com', LG: 'lg.com', LiftMaster: 'liftmaster.com', Maytag: 'maytag.com', Midea: 'midea.com', Miele: 'miele.com',
  'Milwaukee': 'milwaukeetool.com', 'Mitsubishi Electric': 'mitsubishielectric.com', Moen: 'moen.com', Navien: 'navieninc.com',
  Panasonic: 'panasonic.com', Philips: 'philips.com', Rheem: 'rheem.com', Rinnai: 'rinnai.com', Ring: 'ring.com', Ryobi: 'ryobitools.com',
  Samsung: 'samsung.com', Sharp: 'sharpusa.com', Siemens: 'siemens-home.bsh-group.com', Smeg: 'smeg.com', SolarEdge: 'solaredge.com',
  Sony: 'sony.com', 'Speed Queen': 'speedqueen.com', 'Sub-Zero': 'subzero-wolf.com', Tesla: 'tesla.com', Thermador: 'thermador.com',
  Toro: 'toro.com', Toshiba: 'toshiba.com', Traeger: 'traeger.com', Trane: 'trane.com', Viking: 'vikingrange.com', Weber: 'weber.com',
  Whirlpool: 'whirlpool.com', York: 'york.com',
};

export const BRAND_NAMES = Object.keys(BRANDS).sort((a, b) => a.localeCompare(b));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const INDEX = Object.entries(BRANDS).map(([name, domain]) => ({ key: norm(name), domain }));

/** Finds the website domain for a make, tolerating case/punctuation ("lg electronics" → lg.com). */
export function brandDomain(make: string | null | undefined): string | null {
  if (!make) return null;
  const k = norm(make);
  if (!k) return null;
  const exact = INDEX.find((b) => b.key === k);
  if (exact) return exact.domain;
  const first = norm(make.trim().split(/\s+/)[0] ?? '');
  const byFirst = INDEX.find((b) => b.key === first);
  if (byFirst) return byFirst.domain;
  // A typed website ("lg.com") works too.
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(make.trim())) return make.trim().toLowerCase();
  return null;
}

export function logoUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/** "LG" + "OLED65" → "LG OLED65"; falls back to the legacy combined field. */
export function makeModelLabel(a: { make?: string | null; model?: string | null; makeModel?: string | null }): string | null {
  const joined = [a.make, a.model].filter(Boolean).join(' ');
  return joined || a.makeModel || null;
}
