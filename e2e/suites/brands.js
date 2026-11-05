const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
(async()=>{
 const browser=await chromium.launch();
 const ctxFor=async(email)=>{ const sv=(await pool.query('select session_version v from profiles where email=$1',[email])).rows[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:{width:1100,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 // sessions need sv in the session object
 const admin=await ctxFor('admin@test.dev'); const page=await admin.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
 await page.goto(BASE+'/admin/brands'); await page.waitForSelector('text=Brands');
 const n=await page.locator('ul li:has(button[aria-label^="Edit"])').count(); assert(n>=169,`admin list shows all seeded brands (${n})`);
 // non-admin blocked
 const u=await ctxFor('user@test.dev'); const up=await u.newPage(); await up.goto(BASE+'/admin/brands'); await up.waitForURL(/\/dashboard/); assert(true,'non-admins cannot open the brand manager');
 // search
 await page.fill('input[aria-label="Search brands"]','cuck'); assert(await page.locator('ul li:has-text("Cuckoo")').count()===1 && await page.locator('ul li:has(button[aria-label^="Edit"])').count()===1,'search filters the list (Cuckoo)');
 await page.fill('input[aria-label="Search brands"]','');
 // add (domain only)
 await page.click('button:has-text("Add brand")'); await page.fill('.fixed input[name=name]','Test Brand One'); await page.fill('.fixed input[name=domain]','https://www.Example.com/about'); await page.click('.fixed button:has-text("Add brand")'); await page.waitForSelector('ul li:has-text("Test Brand One")');
 let r=(await pool.query("select * from brands where name='Test Brand One'")).rows[0]; assert(r && r.domain==='example.com' && r.name_key==='testbrandone','added brand; website normalised to example.com');
 // validation
 await page.click('button:has-text("Add brand")'); await page.fill('.fixed input[name=name]','test-brand ONE'); await page.fill('.fixed input[name=domain]','x.com'); await page.click('.fixed button:has-text("Add brand")'); await page.waitForSelector('text=already exists'); assert(true,'duplicate name (case/punctuation-insensitive) rejected');
 await page.fill('.fixed input[name=name]','Bad Domain Co'); await page.fill('.fixed input[name=domain]','not a domain'); await page.click('.fixed button:has-text("Add brand")'); await page.waitForSelector('text=does not look right'); assert(true,'invalid website rejected');
 await page.fill('.fixed input[name=domain]',''); await page.click('.fixed button:has-text("Add brand")'); await page.waitForSelector('text=Add a website address'); assert(true,'a brand needs a website or a logo');
 await page.fill('.fixed input[name=domain]','x.com'); await page.fill('.fixed input[name=logoLink]','http://insecure.com/a.png'); await page.click('.fixed button:has-text("Add brand")'); await page.waitForSelector('text=must start with https'); assert(true,'non-https logo link rejected');
 await page.setInputFiles('.fixed input[name=logoFile]',{name:'logo.png',mimeType:'image/png',buffer:Buffer.from('89504e470d0a1a0a','hex')}); await page.fill('.fixed input[name=logoLink]',''); await page.click('.fixed button:has-text("Add brand")'); await page.waitForSelector('text=File storage is not configured'); assert(true,'upload without storage token explains how to use a link instead');
 await page.setInputFiles('.fixed input[name=logoFile]',{name:'logo.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')}); await page.click('.fixed button:has-text("Add brand")'); await page.waitForSelector('text=PNG, JPG, WebP or GIF'); assert(true,'SVG uploads are refused');
 await page.keyboard.press('Escape');
 // use the new brand on an asset, then rename it -> asset follows
 const sv=(await pool.query("select session_version v from profiles where email='admin@test.dev'")).rows[0].v;
 await page.goto(BASE+'/dashboard/assets'); await page.click('text=Add asset'); await page.fill('input[name=name]','Gadget'); await page.locator('button[aria-haspopup=listbox]').click(); await page.fill('input[aria-label="Search brands"]','Test Brand'); assert(await page.locator('ul li button:has-text("Test Brand One")').count()===1,'new brand appears in the asset brand picker'); await page.click('ul li button:has-text("Test Brand One")');
 await page.click('button:has-text("Add to passport")'); await page.waitForURL(/assets\/[0-9a-f-]{36}/);
 // edit: rename + custom logo link
 await page.goto(BASE+'/admin/brands'); await page.fill('input[aria-label="Search brands"]','Test Brand One'); await page.click('button[aria-label="Edit Test Brand One"]');
 await page.fill('.fixed input[name=name]','Renamed Brand'); await page.fill('.fixed input[name=logoLink]','https://example.com/custom-logo.png'); await page.click('.fixed button:has-text("Save changes")'); await page.waitForSelector('[role=dialog]',{state:'detached'}); await page.fill('input[aria-label="Search brands"]','Renamed'); await page.waitForSelector('ul li:has-text("Renamed Brand")');
 r=(await pool.query("select * from brands where name='Renamed Brand'")).rows[0]; assert(r && r.logo_url==='https://example.com/custom-logo.png' && r.domain==='example.com','edit saved: new name and custom logo link');
 assert((await pool.query("select make from assets where name='Gadget'")).rows[0].make==='Renamed Brand','renaming a brand carries existing assets over');
 await page.goto(BASE+'/dashboard/assets'); await page.waitForTimeout(500);
 assert(await page.locator('img[src="https://example.com/custom-logo.png"]').count()>0,'asset card uses the custom logo (priority over website icon)');
 await page.goto(BASE+'/admin/brands'); await page.fill('input[aria-label="Search brands"]','Renamed'); await page.click('button[aria-label="Edit Renamed Brand"]'); await page.check('.fixed input[name=removeLogo]'); await page.click('.fixed button:has-text("Save changes")'); await page.waitForTimeout(1500);
 assert((await pool.query("select logo_url from brands where name='Renamed Brand'")).rows[0].logo_url===null,'remove custom logo falls back to the website icon');
 // delete
 page.once('dialog',d=>d.accept()); await page.click('button[aria-label="Delete Renamed Brand"]'); await page.waitForTimeout(1500);
 assert((await pool.query("select count(*)::int n from brands where name='Renamed Brand'")).rows[0].n===0,'brand deleted');
 assert((await pool.query("select make from assets where name='Gadget'")).rows[0].make==='Renamed Brand','assets keep the brand name as text after the brand is deleted');
 await page.goto(BASE+'/dashboard/assets'); await page.click('text=Add asset'); await page.locator('button[aria-haspopup=listbox]').click(); await page.fill('input[aria-label="Search brands"]','Renamed'); assert(await page.locator('ul li button:has-text("Renamed Brand")').count()===0,'deleted brand disappears from the picker');
 await page.keyboard.press('Escape');
 // restore defaults after deleting a built-in
 await page.goto(BASE+'/admin/brands'); await page.fill('input[aria-label="Search brands"]','Cuckoo'); page.once('dialog',d=>d.accept()); await page.click('button[aria-label="Delete Cuckoo"]'); await page.waitForTimeout(1200);
 assert((await pool.query("select count(*)::int n from brands where name='Cuckoo'")).rows[0].n===0,'built-in brand can be deleted');
 await page.fill('input[aria-label="Search brands"]',''); await page.click('button:has-text("Restore missing built-in brands")'); await page.waitForSelector('text=Restored 1 missing brand');
 assert((await pool.query("select count(*)::int n from brands where name='Cuckoo'")).rows[0].n===1,'restore brings back the missing built-in brand');
 await page.screenshot({path:S+'/admin-brands.png'});
 console.log('page errors:',errs); await browser.close(); await pool.end();
})().catch(e=>{console.error(e);process.exit(1)});
