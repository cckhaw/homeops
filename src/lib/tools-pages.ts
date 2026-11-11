/** The free tools: one list feeds the tools index, the sitemap, the header and the structured data. */
export const TOOLS = [
  { slug: 'aircon-service-cost', title: 'Air-con service cost calculator', short: 'Aircon service cost', blurb: 'How much should servicing your air-cons cost each year in Singapore or Malaysia? Get a realistic yearly range for general servicing, chemical wash and overhaul.' },
  { slug: 'appliance-lifespan', title: 'Appliance lifespan guide and age checker', short: 'Appliance lifespan', blurb: 'How long should a fridge, washer, air-con or water heater last? Check your appliance\'s age against its typical lifespan and see the warning signs.' },
  { slug: 'warranty-expiry-calculator', title: 'Warranty expiry calculator', short: 'Warranty expiry', blurb: 'Enter the purchase date and warranty length to see exactly when your warranty ends, how many days are left, and what to do next.' },
  { slug: 'repair-or-replace', title: 'Repair or replace calculator', short: 'Repair or replace', blurb: 'Is that repair quote worth it? Compare the repair cost with a new appliance, adjusted for age and warranty, and get a clear recommendation.' },
  { slug: 'aircon-electricity-cost', title: 'Air-con electricity cost calculator', short: 'Aircon electricity cost', blurb: 'How much does running your air-con cost each month in Singapore or Malaysia? Estimate the bill and see what an inverter or a warmer setting could save.' },
] as const;
export const toolUrl = (slug?: string) => (slug ? `/tools/${slug}` : '/tools');
