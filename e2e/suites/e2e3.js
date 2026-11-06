const { chromium } = require('playwright');
const { encode } = require('next-auth/jwt');
const S = process.argv[2]; const BASE = 'http://localhost:3100';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
(async () => {
  const browser = await chromium.launch();
  const token = await encode({ token: { email: 'admin@test.dev', sub: 'a', sv: 0 }, secret: 'localtestsecretlocaltestsecret1234' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addCookies([{ name: 'next-auth.session-token', value: token, url: BASE }]);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + '/dashboard/assets'); await page.click('text=Add asset');
  await page.click('button[aria-haspopup=listbox]');
  const n = await page.locator('ul li button:has(span[role=img])').count();
  assert(n > 60, `dropdown lists all brands with logo tiles (${n})`);
  assert(await page.locator('img[src*="domain=lg.com"]').count() > 0, 'LG logo requested in dropdown');
  await page.screenshot({ path: S + '/brand-open.png' });
  await page.fill('input[aria-label="Search brands"]', 'sams'); assert(await page.locator('ul li button:has-text("Samsung")').count() === 1, 'search filters brands');
  await page.click('ul li button:has-text("Samsung")');
  assert((await page.locator('input[name=make]').inputValue()) === 'Samsung', 'picked brand submitted as make');
  // other brand
  await page.click('button[aria-haspopup=listbox]'); await page.click('text=Other brand…');
  await page.fill('input[aria-label="Brand name"]', 'Acme Heating'); assert((await page.locator('input[name=make]').inputValue()) === 'Acme Heating', 'typed other brand is the make');
  await page.fill('input[name=name]', 'Boiler'); await page.screenshot({ path: S + '/brand-other.png' });
  await page.click('button:has-text("Add to passport")'); await page.waitForURL(/assets\/[0-9a-f-]{36}/);
  assert(await page.locator('text=Acme Heating').count() > 0, 'custom brand saved and shown');
  // edit form re-opens in "Other" mode for custom brand
  assert((await page.locator('input[aria-label="Brand name"]').inputValue()) === 'Acme Heating', 'edit form shows custom brand in Other mode');
  await page.goto(BASE + '/dashboard/settings/profile'); assert(await page.locator('main >> text=Buy me a coffee').count() === 0 && await page.locator('main a[href="/admin"]').count() === 0, 'settings no longer carries the coffee or admin links');
  const sp = await ctx.newPage(); await sp.goto(BASE + '/support'); await sp.screenshot({ path: S + '/support.png' });
  console.log('page errors:', errors); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
