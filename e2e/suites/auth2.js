const { chromium } = require('playwright'); const fs=require('fs'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const mails=()=>JSON.parse(fs.readFileSync(S+'/mails.json'));
const linkOf=m=>m.html.match(/href="([^"]*(reset-password)[^"]*)"/)[1].replace(/&amp;/g,'&');
const PW='correct horse battery staple';
(async()=>{
 const browser=await chromium.launch(); const ctx=await browser.newContext({viewport:{width:390,height:844}}); const page=await ctx.newPage();
 const errs=[]; page.on('pageerror',e=>errs.push(e.message));
 const login=async(pg,email,pw)=>{ await pg.goto(BASE+'/login'); await pg.fill('input[type=email]',email); await pg.locator('input[type=password]').fill(pw); await pg.click('button:has-text("Sign in")'); };

 // ---- register by e-mail: nothing created until the link is used
 await page.goto(BASE+'/register'); assert(await page.locator('input[name=password]').count()===0,'with e-mail configured the register form asks only for e-mail');
 await page.fill('input[name=email]','admin@test.dev'); await page.fill('input[name=name]','Ada Admin'); await page.click('button:has-text("Continue")'); await page.waitForSelector('text=sent an e-mail');
 assert((await pool.query("select count(*)::int n from profiles")).rows[0].n===0,'no account row exists before e-mail is confirmed');
 let m=mails().at(-1); assert(m.to==='admin@test.dev' && /Finish creating/.test(m.subject),'confirmation e-mail sent');
 const link=linkOf(m); assert(link.startsWith('http://localhost:3100/reset-password?token='),'e-mail contains the set-password link');
 await page.goto(link); await page.fill('input[name=password]','tiny'); await page.locator('input[name=confirm]').fill('tiny'); await page.click('button:has-text("Save password")'); await page.waitForSelector('text=at least 12');
 await page.locator('input[name=password]').fill(PW); await page.locator('input[name=confirm]').fill(PW); await page.click('button:has-text("Save password")'); await page.waitForSelector('text=Password saved');
 const a=(await pool.query("select is_admin, email_verified_at from profiles where email='admin@test.dev'")).rows[0];
 assert(a.is_admin===true && a.email_verified_at,'verified ADMIN_EMAILS user is promoted to admin');
 await page.goto(link); await page.waitForSelector('text=Link expired'); assert(true,'link is single-use');
 await login(page,'admin@test.dev',PW); await page.waitForURL(BASE+'/dashboard'); assert(true,'login works after confirming e-mail');

 // ---- registering an existing address leaks nothing and e-mails the owner
 const before=mails().length; const c2=await browser.newContext(); const p2=await c2.newPage();
 await p2.goto(BASE+'/register'); await p2.fill('input[name=email]','admin@test.dev'); await p2.click('button:has-text("Continue")'); await p2.waitForSelector('text=sent an e-mail');
 assert(mails().length===before+1 && /already have/.test(mails().at(-1).subject),'existing address: same response, owner is told they already have an account');

 // ---- forgot password
 await p2.goto(BASE+'/forgot-password'); await p2.fill('input[name=email]','nobody@test.dev'); await p2.click('button:has-text("Send reset link")'); await p2.waitForSelector('text=If an account exists');
 const n1=mails().length; assert(true,'unknown address gets the same generic response'); 
 await p2.fill('input[name=email]','admin@test.dev'); await p2.click('button:has-text("Send reset link")'); await p2.waitForTimeout(1500);
 const rm=mails().at(-1); assert(mails().length===n1+1 && /Reset your/.test(rm.subject) && rm.to==='admin@test.dev','reset e-mail sent only to the real account');
 const NEWPW='a brand new passphrase here'; await p2.goto(linkOf(rm)); await p2.locator('input[name=password]').fill(NEWPW); await p2.locator('input[name=confirm]').fill(NEWPW); await p2.click('button:has-text("Save password")'); await p2.waitForSelector('text=Password saved');
 await page.goto(BASE+'/dashboard'); await page.waitForURL(/\/login/); assert(true,'reset signs out other sessions');
 await login(page,'admin@test.dev',PW); await page.waitForSelector('p[role=alert]'); assert(true,'old password no longer works');
 await login(page,'admin@test.dev',NEWPW); await page.waitForURL(BASE+'/dashboard'); assert(true,'new password works');

 // ---- unverified account (created while e-mail was off) is blocked now that e-mail is on
 const { hash } = { hash: null };
 await pool.query("insert into profiles(id,email,password_hash,email_verified_at) select gen_random_uuid(),'old@test.dev',password_hash,null from profiles where email='admin@test.dev'");
 await login(p2,'old@test.dev',NEWPW); await p2.waitForSelector('text=confirm your e-mail'); assert(true,'unverified account cannot sign in once e-mail is configured');

 // ---- reminders
 await page.goto(BASE+'/dashboard/settings/notifications'); await page.locator('input[name=notify]').check(); await page.selectOption('select[name=lead]','14'); await page.click('form:has(input[name=notify]) button:has-text("Save")'); await page.waitForSelector('text=Reminders are on');
 const mb=mails().length; await page.click('button:has-text("Send me a test reminder")'); await page.waitForSelector('text=/Sent by e-mail/'); const tm=mails().at(-1);
 assert(mails().length===mb+1 && /Maintenance/.test(tm.html) && /need.? your attention/.test(tm.html) && tm.to==='admin@test.dev','test reminder e-mail delivered with task list');
 const rq=await ctx.request; 
 const r401=await (await browser.newContext()).request.get(BASE+'/api/cron/reminders'); assert(r401.status()===401,'cron endpoint rejects requests without the secret');
 const cron=()=>ctx.request.get(BASE+'/api/cron/reminders',{headers:{authorization:'Bearer croncroncron'}});
 const r1=await (await cron()).json(); assert(r1.emails===1 && r1.tasks>0,`cron run 1 sends one digest (${JSON.stringify(r1)})`);
 const r2=await (await cron()).json(); assert(r2.emails===0,'cron run 2 sends nothing (no duplicate reminders)');
 await page.screenshot({path:S+'/settings-sec.png',fullPage:true});

 // ---- passport password
 await page.goto(BASE+'/dashboard/passport'); await page.click('button:has-text("Create share link")'); await page.waitForSelector('[data-testid=passport-path]');
 const ppath=(await page.textContent('[data-testid=passport-path]')).trim();
 const anon=await browser.newContext({viewport:{width:390,height:844}}); const ap=await anon.newPage();
 await ap.goto(BASE+ppath); assert(await ap.locator('text=protected').count()===0,'no password: passport is public');
 await page.locator('form:has(input[name=confirm]) input[name=password]').fill('passport secret 12345'); await page.locator('form:has(input[name=confirm]) input[name=confirm]').fill('passport secret 12345');
 await page.click('button:has-text("Set password")'); await page.waitForSelector('text=Password set');
 await ap.goto(BASE+ppath); await ap.waitForSelector('text=This passport is protected'); assert(true,'with a password, visitors see the gate instead of the data');
 assert((await anon.request.get(BASE+'/api/passport/'+ppath.split('/').pop())).status()===401,'JSON API also requires the password');
 await ap.fill('input[name=password]','not the password'); await ap.click('button:has-text("View passport")'); await ap.waitForSelector('text=not correct'); assert(true,'wrong passport password rejected');
 await ap.fill('input[name=password]','passport secret 12345'); await ap.click('button:has-text("View passport")'); await ap.waitForSelector('text=Maintenance log'); assert(true,'correct passport password unlocks the passport');
 assert((await anon.request.get(BASE+'/api/passport/'+ppath.split('/').pop())).status()===200,'JSON API works after unlocking');
 await ap.screenshot({path:S+'/passport-gate-ok.png'});
 await page.locator('form:has(input[name=confirm]) input[name=password]').fill('another secret 987654'); await page.locator('form:has(input[name=confirm]) input[name=confirm]').fill('another secret 987654'); await page.click('button:has-text("Change password")'); await page.waitForSelector('text=Password set');
 await page.waitForTimeout(1500); await ap.reload(); await ap.waitForSelector('text=This passport is protected'); assert(true,'changing the passport password revokes existing unlocks');
 console.log('page errors:',errs); await browser.close(); await pool.end();
})().catch(e=>{console.error(e);process.exit(1)});
