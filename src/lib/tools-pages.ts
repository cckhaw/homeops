/** The free tools: one list feeds the tools index, the sitemap, the header and the structured data. */
export const TOOLS = [
  { slug: 'aircon-service-cost', title: 'Air-con service cost calculator', short: 'Aircon service cost', blurb: 'How much should servicing your air-cons cost each year in Singapore or Malaysia? Get a realistic yearly range for general servicing, chemical wash and overhaul.' },
  { slug: 'appliance-lifespan', title: 'Appliance lifespan guide and age checker', short: 'Appliance lifespan', blurb: 'How long should a fridge, washer, air-con or water heater last? Check your appliance\'s age against its typical lifespan and see the warning signs.' },
] as const;
export const toolUrl = (slug?: string) => (slug ? `/tools/${slug}` : '/tools');
