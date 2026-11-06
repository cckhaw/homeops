const { chromium } = require('playwright');
const { encode } = require('next-auth/jwt');
const S = process.argv[2]; const BASE = 'http://localhost:3100';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
(async () => {
  const browser = await chromium.launch();
  const token = await encode({ token: { email: 'admin@test.dev', name: 'Ada Admin', sub: 'a', sv: 0 }, secret: 'localtestsecretlocaltestsecret1234' });
  const mk = async (w, h) => { const c = await browser.newContext({ viewport: { width: w, height: h } }); await c.addCookies([{ name: 'next-auth.session-token', value: token, url: BASE }]); return c; };
  const ctx = await mk(1920, 1000); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));

  // --- full width + sidebar collapse (desktop)
  await page.goto(BASE + '/dashboard'); await page.waitForSelector('text=Up next');
  const w = await page.evaluate(() => document.querySelector('main').getBoundingClientRect().width);
  assert(w > 1500, `main uses full width (${Math.round(w)}px of 1920)`);
  await page.screenshot({ path: S + '/d-wide.png' });
  await page.click('button[aria-label="Collapse sidebar"]');
  await page.waitForTimeout(400);
  const sw = await page.evaluate(() => document.querySelector('aside').getBoundingClientRect().width);
  assert(sw < 100, `sidebar collapses to icon rail (${sw}px)`);
  assert(await page.locator('aside >> text=Schedule').count() === 0, 'labels hidden when collapsed');
  await page.screenshot({ path: S + '/d-collapsed.png' });
  await page.reload(); await page.waitForTimeout(500);
  assert((await page.evaluate(() => document.querySelector('aside').getBoundingClientRect().width)) < 100, 'collapsed state persists');
  await page.click('button[aria-label="Expand sidebar"]');

  // --- theme
  await page.goto(BASE + '/dashboard/settings/appearance');
  await page.click('[role=radio][aria-label=Violet]');
  assert(await page.evaluate(() => document.documentElement.dataset.accent) === 'violet', 'accent applied');
  const tint = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tint').trim());
  assert(tint === '150 55 200', 'violet tint css var (light)');
  await page.click('[role=radio]:has-text("Night")');
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'night mode set');
  assert(await page.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(0, 0, 0)', 'dark background applied');
  await page.screenshot({ path: S + '/d-dark-violet.png' });
  await page.reload(); assert(await page.evaluate(() => document.documentElement.dataset.theme + document.documentElement.dataset.accent) === 'darkviolet', 'theme persists across reload');
  await page.click('[role=radio]:has-text("Day")'); await page.click('[role=radio][aria-label=Blue]');

  // --- asset with make/model + logo
  await page.goto(BASE + '/dashboard/assets'); await page.click('text=Add asset');
  await page.fill('input[name=name]', 'Living room TV'); await page.locator('button[aria-haspopup=listbox]').click(); await page.fill('input[aria-label="Search brands"]','LG'); await page.click('ul li button:has-text("LG")'); await page.fill('input[name=model]', 'OLED65C3');
  await page.click('button:has-text("Add to passport")'); await page.waitForURL(/assets\/[0-9a-f-]{36}/);
  const src = await page.locator('img[src*="favicons"]').first().getAttribute('src');
  assert(src && src.includes('domain=lg.com'), 'LG logo requested for LG make');
  assert(await page.locator('text=LG OLED65C3').count() > 0, 'make + model shown separately joined');
  await page.screenshot({ path: S + '/d-asset.png' });

  // --- edit task
  await page.goto(BASE + '/dashboard/schedule');
  await page.locator('button[aria-label^="Edit"]').first().click();
  await page.fill('.fixed input[name=title]', 'Edited task title'); await page.fill('.fixed input[name=dueDate]', '2027-03-03');
  await page.selectOption('.fixed select[name=frequency]', 'quarterly');
  await page.click('.fixed button:has-text("Save task")'); await page.waitForSelector('text=Edited task title');
  assert(await page.getByRole('heading', { name: 'March 2027' }).count() > 0, 'edited task moved to new due month');
  await page.screenshot({ path: S + '/d-schedule.png' });

  // --- multi home
  await page.goto(BASE + '/dashboard/homes'); await page.fill('input[name=name]', 'Lake Cabin'); await page.click('button:has-text("Add home")');
  await page.waitForURL(BASE + '/dashboard'); await page.waitForTimeout(800); assert((await page.locator('aside button[aria-pressed=true]').first().getAttribute('aria-label')) === 'Lake Cabin', 'new home becomes active');
  await page.goto(BASE + '/dashboard/assets'); assert(await page.locator('text=Living room TV').count() === 0, 'new home starts empty (assets isolated per home)');
  await page.locator('aside button[aria-label="Ada\'s Home"]').click(); await page.waitForTimeout(1200);
  await page.goto(BASE + '/dashboard/assets'); assert(await page.locator('text=Living room TV').count() > 0, 'switching home shows that home\'s assets');
  await page.goto(BASE + '/dashboard/homes'); await page.screenshot({ path: S + '/d-homes.png' });
  page.once('dialog', d => d.accept()); await page.locator('li:has-text("Lake Cabin") button:has-text("Delete")').click(); await page.waitForTimeout(1500);
  assert(await page.locator('li:has-text("Lake Cabin")').count() === 0, 'owner can delete a home');

  // --- mobile
  const m = await mk(390, 844); const mp = await m.newPage(); await mp.goto(BASE + '/dashboard'); await mp.waitForSelector('text=Up next');
  await mp.screenshot({ path: S + '/m-dash.png' });
  console.log('page errors:', errors);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
