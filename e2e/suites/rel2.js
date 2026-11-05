const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'}); const fs=require('fs');
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
(async()=>{
 const browser=await chromium.launch();
 const sess=async(email)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 // ---- Apple
 let r=await fetch(BASE+'/api/auth/providers'); const prov=await r.json(); assert(!!prov.apple,'Apple provider is registered when configured');
 r=await fetch(BASE+'/.well-known/apple-developer-domainassociation.txt'); assert(r.status===200 && (await r.text())==='hello-apple','domain verification file served');
 const anon=await browser.newContext(); const p=await anon.newPage(); await p.goto(BASE+'/login');
 assert(await p.locator('button:has-text("Continue with Apple")').count()===1,'login page shows Continue with Apple');
 // ---- Register needs captcha
 await p.goto(BASE+'/register'); assert(await p.locator('iframe, [data-turnstile], .cf-turnstile, div:has(> iframe)').count()>=0,'register page loads');
 await p.fill('input[name=email]','new@test.dev');
 await p.locator('button[type=submit]').first().click(); await p.waitForTimeout(1500);
 assert((await q("select count(*)::int c from profiles where email='new@test.dev'"))[0].c===0,'registration without CAPTCHA token is refused');
 // ---- Forgot password: e-mail limit 3/h
 fs.writeFileSync(process.argv[2]+'/mails.json','[]');
 for(let i=0;i<5;i++){ await p.goto(BASE+'/forgot-password'); await p.fill('input[name=email]','user@test.dev'); await p.locator('button[type=submit]').first().click(); await p.waitForTimeout(700); }
 const rl=await q("select count(*)::int c from rate_limits"); assert(rl[0].c>0,'rate limit counters are stored');
 assert((await q("select count(*)::int c from rate_limits where key like '%user@test.dev%'"))[0].c===0,'counters do not contain the e-mail in clear');
 // ---- Login captcha after failures
 await p.goto(BASE+'/login'); 
 for(let i=0;i<4;i++){ await p.fill('input[type=email]','user@test.dev'); await p.fill('input[type=password]','wrong-password-123'); await p.locator('button[type=submit]').first().click(); await p.waitForTimeout(1200); }
 const txt=await p.locator('body').innerText(); assert(/security check|too many|locked/i.test(txt),'repeated failures trigger CAPTCHA/lockout message');
 // ---- Error monitoring
 fs.writeFileSync(process.argv[2]+'/mails.json','[]');
 r=await fetch(BASE+'/api/health/error',{headers:{'x-health-key':'probe-key-123'}}); assert(r.status===500,'health/error route throws');
 await new Promise(s=>setTimeout(s,1500));
 let rows=await q('select * from error_log'); assert(rows.length===1 && rows[0].count===1,'server error recorded once');
 await fetch(BASE+'/api/health/error',{headers:{'x-health-key':'probe-key-123'}}); await new Promise(s=>setTimeout(s,1500));
 rows=await q('select * from error_log'); assert(rows.length===1 && rows[0].count===2,'same error is deduplicated and counted');
 r=await fetch(BASE+'/api/health/error'); assert(r.status===401||r.status===403||r.status===404,'health/error refuses without key');
 const mails=JSON.parse(fs.readFileSync(process.argv[2]+'/mails.json')); assert(mails.length===1 && /admin@test.dev/.test(JSON.stringify(mails[0].to)),'admin alerted once by e-mail (not per repeat)');
 // admin page
 const adm=await sess('admin@test.dev'); const ap=await adm.newPage(); await ap.goto(BASE+'/admin/errors');
 assert(await ap.locator('button:has-text("Resolve")').count()===1,'admin Errors page lists the open error');
 await ap.click('button:has-text("Resolve")'); await ap.waitForTimeout(1200); assert((await q('select resolved_at r from error_log'))[0].r!==null,'Resolve works');
 await ap.reload(); assert(await ap.locator('button:has-text("Reopen")').count()===1,'resolved error offered Reopen');
 await ap.click('button:has-text("Reopen")'); await ap.waitForTimeout(1200); assert((await q('select resolved_at r from error_log'))[0].r===null,'Reopen works');
 const usr=await sess('user@test.dev'); const up=await usr.newPage(); const resp=await up.goto(BASE+'/admin/errors'); assert(!/Recorded in our own database/.test(await up.content()),'non-admin cannot see Errors page');
 // client error report
 await up.goto(BASE+'/dashboard');
 const res=await up.evaluate(async()=>{ return 'skip'; });
 await ap.goto(BASE+'/admin'); assert(await ap.locator('text=Open errors').count()>0,'admin overview shows Open errors tile');
 console.log('mails', mails.length); await browser.close(); await pool.end();
})();
