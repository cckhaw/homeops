const { chromium } = require('playwright');
const BASE='http://localhost:3100', S=process.argv[2];
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
(async()=>{
 await new (require('pg').Pool)({connectionString:'postgresql://postgres@localhost:5544/homeops'}).query('update households set passport_password_hash=null'); // independent of what auth2 left behind
 const browser=await chromium.launch(); const ctx=await browser.newContext({viewport:{width:390,height:844}}); const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
 await page.goto(BASE+'/login'); await page.fill('input[type=email]','admin@test.dev'); await page.locator('input[type=password]').fill('a brand new passphrase here'); await page.click('button:has-text("Sign in")'); await page.waitForURL(BASE+'/dashboard');
 await page.goto(BASE+'/dashboard/passport'); if(await page.locator('button:has-text("Create share link")').count()) await page.click('button:has-text("Create share link")'); await page.waitForSelector('[data-testid=passport-path]'); const ppath=(await page.textContent('[data-testid=passport-path]')).trim();
 const anon=await browser.newContext({viewport:{width:390,height:844}}); const ap=await anon.newPage();
 await ap.goto(BASE+ppath); assert(await ap.locator('text=This passport is protected').count()===0,'no password: passport is public');
 const fill=async(v)=>{ await page.locator('form:has(input[name=confirm]) input[name=password]').fill(v); await page.locator('form:has(input[name=confirm]) input[name=confirm]').fill(v); };
 await fill('short'); await page.click('button:has-text("Set password")'); await page.waitForSelector('text=at least 12'); assert(true,'passport password must meet the 12-character policy');
 await fill('passport secret 12345'); await page.click('button:has-text("Set password")'); await page.waitForSelector('text=Password set');
 await ap.goto(BASE+ppath); await ap.waitForSelector('text=This passport is protected'); assert(true,'with a password, visitors see the gate instead of the data');
 assert(!(await ap.content()).includes('Maintenance log'),'passport content is not leaked in the gate page');
 assert((await anon.request.get(BASE+'/api/passport/'+ppath.split('/').pop())).status()===401,'JSON API also requires the password');
 await ap.fill('input[name=password]','not the password'); await ap.click('button:has-text("View passport")'); await ap.waitForSelector('text=not correct'); assert(true,'wrong passport password rejected');
 await ap.screenshot({path:S+'/passport-gate.png'});
 await ap.fill('input[name=password]','passport secret 12345'); await ap.click('button:has-text("View passport")'); await ap.waitForSelector('text=Maintenance log'); assert(true,'correct passport password unlocks the passport');
 assert((await anon.request.get(BASE+'/api/passport/'+ppath.split('/').pop())).status()===200,'JSON API works after unlocking');
 await fill('another secret 987654'); await page.click('button:has-text("Change password")'); await page.waitForTimeout(2500);
 await ap.reload(); await ap.waitForSelector('text=This passport is protected'); assert(true,'changing the passport password revokes existing unlocks');
 await page.click('button:has-text("Remove password")'); await page.waitForTimeout(2500); await ap.reload(); await ap.waitForSelector('text=Maintenance log'); assert(true,'removing the password makes the passport public again');
 console.log('page errors:',errs); await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
