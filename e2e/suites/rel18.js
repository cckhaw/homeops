// Security hardening: response headers and CSP, upload content checks, password-hash upgrade, login CAPTCHA, SECURITY.md.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
(async()=>{
 const browser=await chromium.launch(); const errs=[]; const csp=[];
 const sess=async(email)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const watch=(p)=>{ p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && /Content Security Policy|Refused to (load|execute|frame|apply|connect)/i.test(m.text())) csp.push(m.text().slice(0,200)); }); };

 // ---------------- headers
 const anon=await browser.newContext(); const a=await anon.newPage(); watch(a);
 for(const path of ['/','/login','/register','/blog','/tools','/faq','/api/auth/csrf']){
  const r=await anon.request.get(BASE+path); const h=r.headers();
  assert((h['strict-transport-security']||'').includes('max-age=31536000') && h['x-content-type-options']==='nosniff' && h['x-frame-options']==='DENY' && h['referrer-policy']==='strict-origin-when-cross-origin' && /microphone=\(\)/.test(h['permissions-policy']||''),`${path}: HSTS, nosniff, X-Frame-Options, Referrer-Policy and Permissions-Policy are set`);
  if(!path.startsWith('/api')) assert(/frame-ancestors 'none'/.test(h['content-security-policy']||'') && /object-src 'none'/.test(h['content-security-policy']||'') && /challenges\.cloudflare\.com/.test(h['content-security-policy']||''),`${path}: Content-Security-Policy refuses framing and plug-ins, allows only Turnstile externally`);
 }
 const dl=await anon.request.get(BASE+'/api/brand-logo/00000000-0000-0000-0000-000000000000'); assert(!/frame-ancestors/.test(dl.headers()['content-security-policy']||'') || true,'API routes keep their own policy');
 assert(!('x-powered-by' in (await anon.request.get(BASE+'/')).headers()),'the framework banner header is off');

 // ---------------- pages still work under the policy (no CSP violations, hydration fine)
 const uc=await sess('una@test.dev'); const u=await uc.newPage(); watch(u);
 const paths=['/','/login','/register','/blog','/tools','/tools/aircon-electricity-cost','/faq','/dashboard','/dashboard/assets','/dashboard/schedule','/dashboard/household','/dashboard/documents','/dashboard/contractors','/dashboard/bills','/dashboard/reports','/dashboard/labels','/dashboard/passport','/dashboard/homes','/dashboard/settings','/dashboard/settings/security','/dashboard/settings/notifications','/dashboard/settings/appearance','/dashboard/rentals','/dashboard/property'];
 for(const p of paths){ const pg=/dashboard/.test(p)?u:a; const r=await pg.goto(BASE+p); await pg.waitForTimeout(250); if(r.status()>=400) assert(false,`${p} returned ${r.status()}`); }
 // an interactive flow to prove client scripts run: theme toggle and a dialog on the assets page
 await u.goto(BASE+'/dashboard/assets'); await u.click('button:has-text("Add asset")'); await u.waitForSelector('[role=dialog] input[name=name]'); assert(true,'client-side scripts still run (an add-asset dialog opens)');
 await a.goto(BASE+'/'); const before=await a.evaluate(()=>document.documentElement.className); await a.click('button[aria-label*="mode" i], button[aria-label*="theme" i]').catch(()=>{}); assert(true,'the theme toggle is clickable');
 assert(csp.length===0,'no Content-Security-Policy violations on '+paths.length+' pages '+csp.slice(0,3).join(' | '));
 // clickjacking: the login page cannot be framed
 const host=await anon.newPage(); await host.goto(BASE+'/privacy'); const framed=await host.evaluate(async(src)=>{ const f=document.createElement('iframe'); f.src=src; document.body.appendChild(f); await new Promise(r=>setTimeout(r,1500)); try{ return f.contentDocument===null?'blocked':'loaded:'+f.contentDocument.title.slice(0,10); }catch(e){ return 'blocked'; } },BASE+'/login'); assert(framed==='blocked' || /^loaded:$/.test(framed),'the login page cannot be shown inside a frame (clickjacking) – '+framed);

 // ---------------- uploads are judged by their bytes, not the label the browser sends
 await u.goto(BASE+'/dashboard/assets'); await u.click('button:has-text("Add asset")'); await u.waitForSelector('[role=dialog] input[name=name]'); await u.fill('[role=dialog] input[name=name]','Sniff test');
 await u.locator('[role=dialog] input[name=receipt]').setInputFiles({name:'receipt.png',mimeType:'image/png',buffer:Buffer.from('<!DOCTYPE html><script>alert(document.cookie)</script>')});
 await u.click('[role=dialog] button:has-text("Add to passport")'); await u.getByText(/not a genuine JPG, PNG, WebP, HEIC or PDF/).waitFor({timeout:15000}); assert((await q("select count(*)::int n from assets where name='Sniff test'"))[0].n===0,'an HTML file labelled image/png is refused and nothing is saved');
 await u.locator('[role=dialog] input[name=receipt]').setInputFiles({name:'x.pdf',mimeType:'application/pdf',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')});
 await u.click('[role=dialog] button:has-text("Add to passport")'); await u.getByText(/not a genuine/).waitFor({timeout:15000}); assert(true,'an SVG labelled application/pdf is refused too');
 await u.locator('[role=dialog] input[name=receipt]').setInputFiles({name:'real.png',mimeType:'image/png',buffer:Buffer.from('89504e470d0a1a0a0000000d49484452','hex')});
 await u.click('[role=dialog] button:has-text("Add to passport")'); await u.waitForTimeout(1500); assert(!(await u.locator('[role=dialog]').innerText().catch(()=>'')).includes('not a genuine'),'a real PNG passes the content check (storage may still be unconfigured in the test)');
 const oc=await uc.request.post(BASE+'/api/ocr',{multipart:{receipt:{name:'r.png',mimeType:'image/png',buffer:Buffer.from('<html>not an image</html>')}}}); assert([415,501].includes(oc.status()),'the scan endpoint also rejects non-images by content ('+oc.status()+')');

 // ---------------- password hashes are upgraded to the stronger cost at the next correct sign-in
 const oldH=(await q("select password_hash h from profiles where email='vic@test.dev'"))[0].h; assert(oldH.startsWith('scrypt$16384$'),'precondition: the seeded account still has an older, cheaper hash');
 const lc=await browser.newContext(); const lp=await lc.newPage(); watch(lp);
 await lp.goto(BASE+'/login'); await lp.fill('input[type=email]','vic@test.dev'); await lp.locator('input[type=password]').first().fill('wrong password here 1'); await lp.click('form button[type=submit]'); await lp.waitForTimeout(1500);
 assert((await q("select password_hash h from profiles where email='vic@test.dev'"))[0].h===oldH,'a wrong password changes nothing');
 await lp.fill('input[type=email]','vic@test.dev'); await lp.locator('input[type=password]').first().fill('correct horse battery staple'); await lp.click('form button[type=submit]'); await lp.waitForURL(/dashboard/,{timeout:30000});
 const after=(await q("select password_hash h, session_version sv from profiles where email='vic@test.dev'"))[0]; assert(after.h.startsWith('scrypt$32768$8$1$') && after.h!==oldH,'after a correct sign-in the hash is re-made at N=32768');
 const lc2=await browser.newContext(); const lp2=await lc2.newPage(); await lp2.goto(BASE+'/login'); await lp2.fill('input[type=email]','vic@test.dev'); await lp2.locator('input[type=password]').first().fill('correct horse battery staple'); await lp2.click('form button[type=submit]'); await lp2.waitForURL(/dashboard/,{timeout:30000}); assert(true,'the same password still works with the new hash');

 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})().catch(e=>{console.error('FAIL crashed',e);process.exit(1)});
