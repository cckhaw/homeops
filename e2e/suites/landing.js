// Public homepage: every shipped feature is listed, links work, and it fits every screen in light and dark.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const FEATURES=['Asset passport','Receipt scanning','Document vault','QR labels','Seasonal maintenance','Warranty and expiry alerts','Reminders where you are','Your own calendar feed','Many homes, one login','Assign the work','Contractors book','Bills and spending','Home Service Passport','Move-out pack','Your data, your call','Spreadsheet export'];
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 for(const [vname,vp] of [['desktop',{width:1440,height:900}],['tablet',{width:820,height:1180}],['phone',{width:390,height:844}]]){
  for(const scheme of ['light','dark']){
   const c=await browser.newContext({viewport:vp,colorScheme:scheme}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); const r=await p.goto(BASE+'/'); await p.waitForTimeout(500);
   assert(r.status()===200,`${vname}/${scheme}: loads`);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${vname}/${scheme}: no sideways scrolling`);
   // nothing is clipped off the right edge (the decorative preview may sit inside overflow-clip, but real content must not)
   const off=await p.evaluate(()=>[...document.querySelectorAll('h1,h2,h3,h4,p,a,button,li')].filter(e=>e.offsetParent!==null&&e.closest('[aria-hidden=true]')===null).filter(e=>{const r=e.getBoundingClientRect();return r.right>window.innerWidth+1||r.left<-1;}).map(e=>e.textContent.trim().slice(0,30)));
   assert(off.length===0,`${vname}/${scheme}: all text inside the screen${off.length?' — '+off.slice(0,3).join('|'):''}`);
   if(scheme==='light'&&vname!=='tablet'){ await p.screenshot({path:`${S}/landing-${vname}.png`,fullPage:true}); }
   await c.close();
  }
 }
 const c=await browser.newContext({viewport:{width:1280,height:900}}); const p=await c.newPage(); await p.goto(BASE+'/');
 const text=await p.locator('main').innerText();
 const missing=FEATURES.filter(f=>!text.includes(f)); assert(missing.length===0,`all 16 features are listed${missing.length?' — missing: '+missing.join(', '):''}`);
 assert(await p.locator('h1').count()===1 && /in one place/.test(await p.locator('h1').innerText()),'one clear headline');
 assert(await p.locator('article h3').count()===4 && await p.locator('li:has(h4)').count()===16,'four groups of four features');
 assert(await p.locator('h4 >> text=New').count()>=6,'new features are flagged');
 for(const [sel,href] of [['header a:has-text("Sign in")','/login'],['header a:has-text("Get started")','/register'],['main a:has-text("Get started — it\'s free")','/register'],['a:has-text("Privacy Policy")','/privacy'],['a:has-text("Terms")','/terms']]) assert(await p.locator(sel).first().getAttribute('href')===href,`${sel} → ${href}`);
 for(const id of ['features','how','private']) assert(await p.locator('#'+id).count()===1 && await p.locator(`header a[href="#${id}"]`).count()===1,`nav link to #${id} has a target`);
 for(const path of ['/login','/register','/privacy','/terms']){ const rr=await p.request.get(BASE+path); assert(rr.status()===200,`${path} (linked from the page) loads`); }
 // honest about what's optional: no claims we can't back
 assert(!/guarantee|bank-grade|military/i.test(text),'no inflated security claims');
 assert(/WhatsApp is coming soon/.test(text) && !/on WhatsApp|by e-mail, push or WhatsApp|WhatsApp reminders/i.test(text.replace(/WhatsApp is coming soon/g,'')),'WhatsApp reminders are described as coming soon, not as available');
 const priv=await (await p.request.get(BASE+'/privacy')).text(), terms=await (await p.request.get(BASE+'/terms')).text();
 assert(/not available today/.test(priv) && !/Meta \(WhatsApp Business\)/.test(priv) && /push notifications/.test(priv),'privacy policy says WhatsApp is not available, and covers push');
 assert(/push-notification delivery/.test(terms) && /document vault|contractors/.test(priv),'terms mention push delivery; privacy covers the vault and contractors');
 // signed-in users still go straight to the app
 const sv=(await pool.query("select session_version v from profiles where email='una@test.dev'")).rows[0].v; const t=await encode({token:{email:'una@test.dev',sub:'una',sv},secret:'localtestsecretlocaltestsecret1234'});
 const sc=await browser.newContext(); await sc.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); const sp=await sc.newPage(); await sp.goto(BASE+'/'); assert(/\/dashboard/.test(sp.url()),'signed-in visitors are sent to their dashboard');
 // day / night switch before signing in
 for(const path of ['/','/login','/blog','/privacy']){ const tc=await browser.newContext({viewport:{width:1280,height:800},colorScheme:'light'}); const tp=await tc.newPage(); await tp.goto(BASE+path); await tp.waitForTimeout(400);
  const btn=tp.locator('button[aria-label="Switch to dark mode"]'); assert(await btn.count()===1,`${path}: has a day/night switch`);
  await btn.click(); assert(await tp.evaluate(()=>document.documentElement.getAttribute('data-theme'))==='dark' && await tp.evaluate(()=>getComputedStyle(document.body).backgroundColor)!=='rgb(245, 245, 247)',`${path}: switching to night mode works`);
  await tp.reload(); await tp.waitForTimeout(300); assert(await tp.evaluate(()=>document.documentElement.getAttribute('data-theme'))==='dark' && await tp.locator('button[aria-label="Switch to light mode"]').count()===1,`${path}: the choice is remembered`); await tc.close(); }
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})();
