const { chromium } = require('playwright'); const { createHmac } = require('crypto'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2];
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const dec=s=>{let b=0,v=0,o=[];for(const c of s){v=(v<<5)|B32.indexOf(c);b+=5;if(b>=8){o.push((v>>>(b-8))&255);b-=8}}return Buffer.from(o)};
const totp=(sec,off=0)=>{const m=Buffer.alloc(8);m.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)+off));const h=createHmac('sha1',dec(sec)).update(m).digest();const o=h[19]&15;return String((((h[o]&127)<<24)|(h[o+1]<<16)|(h[o+2]<<8)|h[o+3])%1e6).padStart(6,'0')};
const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const PW='correct horse battery staple';
(async()=>{
 const browser=await chromium.launch(); const ctx=await browser.newContext({viewport:{width:390,height:844}}); const page=await ctx.newPage();
 const errs=[]; page.on('pageerror',e=>errs.push(e.message));
 // ---- register (no e-mail service => direct)
 await page.goto(BASE+'/register');
 await page.fill('input[name=email]','Dana@Test.dev'); await page.locator('input[name=password]').fill('short1'); await page.locator('input[name=confirm]').fill('short1');
 await page.click('button:has-text("Create account")'); await page.waitForSelector('text=at least 12');
 assert(true,'short password rejected by policy (12+)');
 await page.locator('input[name=password]').fill(PW); await page.locator('input[name=confirm]').fill(PW+'x'); await page.click('button:has-text("Create account")'); await page.waitForSelector('text=do not match'); assert(true,'mismatched confirm rejected');
 await page.locator('input[name=confirm]').fill(PW); await page.click('button:has-text("Create account")');
 await page.waitForURL(BASE+'/dashboard',{timeout:15000}); assert(true,'direct registration signs the user in');
 const u=(await pool.query("select * from profiles where email='dana@test.dev'")).rows[0];
 assert(u && u.password_hash.startsWith('scrypt$') && !u.password_hash.includes(PW),'password stored as scrypt hash, e-mail lower-cased');
 // ---- admin takeover guard: ADMIN_EMAILS address registering WITHOUT e-mail verification must not become admin
 const c2=await browser.newContext(); const p2=await c2.newPage(); await p2.goto(BASE+'/register'); await p2.fill('input[name=email]','admin@test.dev');
 await p2.locator('input[name=password]').fill(PW); await p2.locator('input[name=confirm]').fill(PW); await p2.click('button:has-text("Create account")'); await p2.waitForURL(BASE+'/dashboard');
 assert((await pool.query("select is_admin from profiles where email='admin@test.dev'")).rows[0].is_admin===false,'ADMIN_EMAILS user is NOT admin until e-mail verified');
 await c2.close();
 // ---- change password (forces re-login)
 await page.goto(BASE+'/dashboard/settings');
 await page.fill('input[name=current]',PW); await page.locator('input[name=password]').first().fill('new password number two'); await page.locator('input[name=confirm]').first().fill('new password number two');
 await page.click('button:has-text("Change password")'); await page.waitForURL(/\/login\?changed=1/); assert(true,'password change signs the user out');
 await page.goto(BASE+'/dashboard'); await page.waitForURL(/\/login/); assert(true,'old session is revoked after password change');
 // ---- wrong password + lockout
 const NEW='new password number two';
 for(let i=0;i<5;i++){ await page.goto(BASE+'/login'); await page.fill('input[type=email]','dana@test.dev'); await page.locator('input[type=password]').fill('wrong wrong wrong wrong'); await page.click('button:has-text("Sign in")'); await page.waitForSelector('p[role=alert]'); }
 await page.goto(BASE+'/login'); await page.fill('input[type=email]','dana@test.dev'); await page.locator('input[type=password]').fill(NEW); await page.click('button:has-text("Sign in")');
 await page.waitForSelector('text=Too many failed attempts'); assert(true,'account locks after 5 failures (even correct password refused)');
 await pool.query("update profiles set locked_until=null, failed_attempts=0 where email='dana@test.dev'");
 await page.goto(BASE+'/login'); await page.fill('input[type=email]','dana@test.dev'); await page.locator('input[type=password]').fill(NEW); await page.click('button:has-text("Sign in")'); await page.waitForURL(BASE+'/dashboard'); assert(true,'login works with new password after lock cleared');
 // ---- enable 2FA
 await page.goto(BASE+'/dashboard/settings'); await page.click('button:has-text("Set up 2FA")'); await page.waitForSelector('img[alt*="QR"]');
 const secret=(await page.locator('code').first().textContent()).trim(); assert(/^[A-Z2-7]{32}$/.test(secret),'2FA secret + QR shown');
 await page.fill('input[aria-label="6-digit code"]','000000'); await page.click('button:has-text("Turn on")'); await page.waitForSelector('text=not correct'); assert(true,'wrong 2FA setup code rejected');
 await page.fill('input[aria-label="6-digit code"]',totp(secret)); await page.click('button:has-text("Turn on")'); await page.waitForSelector('text=Save your recovery codes');
 const codes=await page.locator('ul.grid li').allTextContents(); assert(codes.length===8,'8 recovery codes issued');
 assert((await pool.query("select totp_secret from profiles where email='dana@test.dev'")).rows[0].totp_secret!==secret,'TOTP secret is encrypted at rest');
 await page.click("button:has-text(\"I've saved them\")");
 // ---- sign out, sign in with 2FA
 await ctx.clearCookies();
 const login=async(pw)=>{ await page.goto(BASE+'/login'); await page.fill('input[type=email]','dana@test.dev'); await page.locator('input[type=password]').fill(pw); await page.click('button:has-text("Sign in")'); };
 await login(NEW); await page.waitForSelector('input[autocomplete=one-time-code]'); assert(true,'login asks for an authentication code after the password');
 await page.fill('input[autocomplete=one-time-code]','123456'); await page.click('button:has-text("Verify and sign in")'); await page.waitForSelector('text=not correct'); assert(true,'wrong code refused');
 // valid code (next step to avoid replay of the setup code). Computed once so a 30-second rollover can't turn the replay into a fresh code.
 const code1=totp(secret,1);
 await page.fill('input[autocomplete=one-time-code]',code1); await page.click('button:has-text("Verify and sign in")'); await page.waitForURL(BASE+'/dashboard'); assert(true,'valid authenticator code signs in');
 // replay of same code refused
 await ctx.clearCookies(); await login(NEW); await page.waitForSelector('input[autocomplete=one-time-code]'); await page.fill('input[autocomplete=one-time-code]',code1); await page.click('button:has-text("Verify and sign in")'); await page.waitForSelector('text=not correct'); assert(true,'TOTP code cannot be replayed');
 // recovery code works once
 await page.fill('input[autocomplete=one-time-code]',codes[0]); await page.click('button:has-text("Verify and sign in")'); await page.waitForURL(BASE+'/dashboard'); assert(true,'recovery code signs in');
 await ctx.clearCookies(); await login(NEW); await page.waitForSelector('input[autocomplete=one-time-code]'); await page.fill('input[autocomplete=one-time-code]',codes[0]); await page.click('button:has-text("Verify and sign in")'); await page.waitForSelector('text=not correct'); assert(true,'recovery code is single-use');
 await page.screenshot({path:S+'/login-2fa.png'});
 console.log('page errors:',errs); await browser.close(); await pool.end();
})().catch(e=>{console.error(e);process.exit(1)});
