const { chromium } = require('playwright'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const PW='correct horse battery staple';
(async()=>{
 const browser=await chromium.launch();
 // ---------- legal pages
 const m=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}); const p=await m.newPage();
 for (const [path,h1,needs] of [['/privacy','Privacy Policy',['do not sell','Neon','Delete my account','me@khaw.cc','Last updated: November 2026','Anthropic','Stripe']],['/terms','Terms of Service',['100% free','non-refundable','as is','Modifications','me@khaw.cc','Last updated: November 2026']]]) {
   await p.goto(BASE+path); assert((await p.textContent('h1')).trim()===h1,`${path} renders its title`);
   const txt=await p.textContent('body'); for (const n of needs) assert(txt.toLowerCase().includes(n.toLowerCase()),`${path} contains "${n}"`);
   assert(await p.locator('a[aria-label="Back to HomeOps"]').getAttribute('href')==='/','back button goes to landing for signed-out visitors');
   await p.locator('details summary:has-text("Contents")').click(); const first=p.locator('details a').nth(2); const id=(await first.getAttribute('href')).slice(1); await first.click(); await p.waitForTimeout(400);
   assert(await p.evaluate(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=0&&r.top<260},id),`${path} contents link scrolls to its section`);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${path} has no horizontal scroll on mobile`);
   await p.screenshot({path:`${S}${path.replace('/','/legal-')}-m.png`});
 }
 const d=await browser.newContext({viewport:{width:1280,height:900}}); const dp=await d.newPage(); await dp.goto(BASE+'/privacy'); await dp.screenshot({path:S+'/legal-privacy-d.png'});

 // ---------- accounts A (owner) and B (member)
 const reg=async(email)=>{ const c=await browser.newContext({viewport:{width:390,height:844}}); const pg=await c.newPage(); await pg.goto(BASE+'/register'); await pg.fill('input[name=email]',email); await pg.locator('input[name=password]').fill(PW); await pg.locator('input[name=confirm]').fill(PW); await pg.click('button:has-text("Create account")'); await pg.waitForURL(BASE+'/dashboard'); return {c,pg}; };
 const A=await reg('alice@test.dev'), B=await reg('bob@test.dev');
 // A adds an asset with private fields
 await A.pg.goto(BASE+'/dashboard/assets'); await A.pg.click('text=Add asset'); await A.pg.fill('input[name=name]','Boiler'); await A.pg.locator('button[aria-haspopup=listbox]').click(); await A.pg.fill('input[aria-label="Search brands"]','Rheem'); await A.pg.click('ul li button:has-text("Rheem")');
 await A.pg.fill('input[name=serialNumber]','SN-SECRET-12345'); await A.pg.fill('textarea[name=notes]','private note about my home'); await A.pg.click('button:has-text("Add to passport")'); await A.pg.waitForURL(/assets\/[0-9a-f-]{36}/);
 // passport JSON leak check
 await A.pg.goto(BASE+'/dashboard/passport'); if(await A.pg.locator('button:has-text("Create share link")').count()) await A.pg.click('button:has-text("Create share link")'); await A.pg.waitForSelector('[data-testid=passport-path]'); const ptoken=(await A.pg.textContent('[data-testid=passport-path]')).trim().split('/').pop();
 const pj=await (await A.c.request.get(BASE+'/api/passport/'+ptoken)).text();
 assert(pj.includes('Boiler') && !pj.includes('SN-SECRET-12345') && !pj.includes('private note') && !/receiptUrl|manualUrl|serialNumber|householdId/.test(pj),'public passport JSON omits serial numbers, notes, file links and internal ids');
 const ppage=await (await browser.newContext()).newPage(); await ppage.goto(BASE+'/passport/'+ptoken); const pt=await ppage.textContent('body'); assert(pt.includes('Boiler') && !pt.includes('SN-SECRET') && !pt.includes('alice@test.dev'),'public passport page shows no serial or e-mail');

 // ---------- export
 const ej=await A.c.request.get(BASE+'/api/export'); assert(ej.status()===200 && /attachment/.test(ej.headers()['content-disposition']),'export downloads as an attachment');
 const exp=await ej.json(); const etxt=JSON.stringify(exp);
 assert(exp.account.email==='alice@test.dev' && exp.homes[0].assets[0].serialNumber==='SN-SECRET-12345','owner export includes their own full records');
 assert(!/password_hash|passwordHash|scrypt\$|totpSecret|bob@test.dev/.test(etxt),'export never includes secrets or other members\' e-mails');
 await pool.query("update assets set name='=HYPERLINK(\"http://evil\")' where name='Boiler'");
 const csv=await (await A.c.request.get(BASE+'/api/export?format=csv')).text(); assert(csv.includes("\"'=HYPERLINK") || csv.includes("'=HYPERLINK"),'CSV export neutralises spreadsheet formulas');
 assert((await (await browser.newContext()).request.get(BASE+'/api/export')).status()===401,'export requires sign-in');
 await pool.query("update assets set name='Boiler' where name like '=HYPERLINK%'");

 // ---------- shared home + deletion
 await A.pg.goto(BASE+'/dashboard/household'); await A.pg.click('button:has-text("Create invite link")'); await A.pg.waitForSelector('text=Copy link');
 const tok=(await pool.query('select token from household_invites limit 1')).rows[0].token; await B.pg.goto(BASE+'/join/'+tok); await B.pg.click('button:has-text("Join household")'); await B.pg.waitForURL(BASE+'/dashboard');
 // A also owns a second, solo home
 await A.pg.goto(BASE+'/dashboard/homes'); await A.pg.fill('input[name=name]','Solo cabin'); await A.pg.click('button:has-text("Add home")'); await A.pg.waitForURL(BASE+'/dashboard');
 const homesBefore=(await pool.query('select count(*)::int n from households')).rows[0].n;
 await A.pg.goto(BASE+'/dashboard/settings'); await A.pg.click('summary:has-text("Delete my account")');
 A.pg.on('dialog',d=>d.accept());
 await A.pg.locator('details form input[name=password]').fill('wrong wrong wrong wrong'); await A.pg.fill('details form input[name=confirm]','DELETE'); await A.pg.click('button:has-text("Delete my account")'); await A.pg.waitForSelector('text=password is incorrect'); await A.pg.waitForTimeout(800); assert(true,'wrong password blocks deletion');
 await A.pg.locator('details form input[name=password]').fill(PW); await A.pg.fill('details form input[name=confirm]','delete'); await A.pg.click('button:has-text("Delete my account")'); await A.pg.waitForSelector('text=Type DELETE'); await A.pg.waitForTimeout(800); assert(true,'must type DELETE in capitals');
 await A.pg.locator('details form input[name=password]').fill(PW); await A.pg.fill('details form input[name=confirm]','DELETE'); await A.pg.click('button:has-text("Delete my account")'); await A.pg.waitForURL(/\/\?deleted=1/);
 assert(await A.pg.locator('text=permanently deleted').count()>0,'landing confirms the account was deleted');
 assert((await pool.query("select count(*)::int n from profiles where email='alice@test.dev'")).rows[0].n===0,'profile row is gone');
 const left=(await pool.query("select h.name, p.email owner from households h join profiles p on p.id=h.owner_id")).rows;
 assert(left.length===1 && left[0].owner==='bob@test.dev','shared home survives and ownership passes to the other member');
 assert((await pool.query("select count(*)::int n from households where name='Solo cabin'")).rows[0].n===0,'solo home is erased entirely');
 assert((await pool.query("select count(*)::int n from assets where name='Boiler'")).rows[0].n===1,'shared home keeps its assets for the remaining member');
 assert((await pool.query("select count(*)::int n from household_members where role='owner'")).rows[0].n===1,'remaining member is promoted to owner');
 await A.pg.goto(BASE+'/dashboard'); await A.pg.waitForURL(/\/login/); assert(true,'deleted user\'s session no longer works');
 await B.pg.goto(BASE+'/dashboard/assets'); assert(await B.pg.locator('text=Boiler').count()>0,'remaining member still sees the shared assets');
 await browser.close(); await pool.end();
})().catch(e=>{console.error(e);process.exit(1)});
