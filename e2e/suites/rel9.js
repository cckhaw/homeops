// Admin Branding: upload / replace / reset the logo, icon and share image and see them applied site-wide.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg'); const zlib = require('zlib'); const fs = require('fs');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
// minimal valid PNG of a solid colour
const crcT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc=b=>{let c=0xffffffff;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0};
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c])};
const png=(w,h,rgb)=>{const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;const row=Buffer.concat([Buffer.from([0]),Buffer.from(Array(w).fill(rgb).flat())]);const raw=Buffer.concat(Array(h).fill(row));return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])};
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp||{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const ctx=await sess('admin@test.dev'); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
 const dir=S+'/brand-files'; fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(dir+'/icon.png',png(512,512,[200,30,30])); fs.writeFileSync(dir+'/small.png',png(100,100,[0,0,0])); fs.writeFileSync(dir+'/wide.png',png(512,256,[0,0,0]));
 fs.writeFileSync(dir+'/share.png',png(1200,630,[10,120,200])); fs.writeFileSync(dir+'/logo.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"><rect width="200" height="50" fill="#a0f"/></svg>'); fs.writeFileSync(dir+'/evil.svg','<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'); fs.writeFileSync(dir+'/fake.png','<html>nope</html>');

 // access control
 const anon=await browser.newContext(); const ap=await anon.newPage(); await ap.goto(BASE+'/admin/branding'); assert(!/admin\/branding/.test(ap.url()) || (await ap.locator('h1:has-text("Branding")').count())===0,'visitors cannot open the branding page');
 const user=await sess('una@test.dev'); const up=await user.newPage(); const ur=await up.goto(BASE+'/admin/branding'); assert((await up.locator('h1:has-text("Branding")').count())===0,'ordinary users cannot open the branding page');

 // page + nav
 await p.goto(BASE+'/admin/branding'); assert(await p.locator('h1:has-text("Branding")').count()===1 && await p.locator('aside[aria-label=Admin] nav a:has-text("Branding")').count()===1,'Branding is in the admin sidebar and opens');
 for(const k of ['logo','icon','share']) assert(await p.locator(`[data-brand-card=${k}] [data-status]:has-text("Wodejia default")`).count()===1,`${k} starts on the default`);
 assert((await (await p.request.get(BASE+'/favicon.ico')).headers()['content-type'])==='image/x-icon','default favicon.ico is served');
 const defIcon=await (await p.request.get(BASE+'/icons/192')).body();

 const card=k=>p.locator(`[data-brand-card=${k}]`);
 const upload=async(k,file)=>{ await card(k).locator('input[type=file]').setInputFiles(dir+'/'+file); const st=card(k).locator('[role=status]'); const prev=(await st.count())?await st.first().innerText():''; await card(k).locator('button:has-text("Upload")').click(); for(let i=0;i<240;i++){ await p.waitForTimeout(250); if((await st.count())&&(await st.first().innerText())!==prev) break; } };
 // validation
 await upload('icon','small.png'); assert(await card('icon').locator('[role=status]').getByText(/between 512×512 and 2048×2048/).count()===1,'a too-small icon is refused with a clear message');
 await upload('icon','wide.png'); assert(await card('icon').locator('[role=status]').getByText(/must be square/).count()===1,'a non-square icon is refused');
 await upload('logo','evil.svg'); assert(await card('logo').locator('[role=status]').getByText(/scripts or embedded content/).count()===1,'an SVG containing a script is refused');
 await upload('logo','fake.png'); assert(await card('logo').locator('[role=status]').getByText(/does not look like an image/).count()===1,'a non-image renamed .png is refused');
 await upload('share','icon.png'); assert(await card('share').locator('[role=status]').getByText(/at least 1200×630|wider than tall/).count()===1,'a wrong-shaped share image is refused');
 assert((await q('select count(*)::int n from brand_assets'))[0].n===0,'nothing was stored by the refused uploads');

 // valid uploads
 await upload('icon','icon.png'); assert(await card('icon').locator('[data-status]:has-text("Custom")').count()===1,'a valid icon is accepted');
 await upload('logo','logo.svg'); assert(await card('logo').locator('[data-status]:has-text("Custom")').count()===1,'an SVG logo is accepted');
 await upload('share','share.png'); assert(await card('share').locator('[data-status]:has-text("Custom")').count()===1,'a share image is accepted');
 assert((await q("select kind from brand_assets order by kind")).map(r=>r.kind).join()==='icon,logo,share','all three are stored');
 assert((await q("select count(*)::int n from audit_log where action='brand.upload'"))[0].n===3,'each upload is in the audit log');

 // applied on the site
 const pub=await anon.newPage(); await pub.goto(BASE+'/'); await pub.waitForTimeout(500);
 const logoSrc=await pub.locator('header img[alt=Wodejia], img[alt=Wodejia]').first().getAttribute('src'); assert(/^\/brand-asset\/logo\?v=[0-9a-f]{12}$/.test(logoSrc||''),`the landing page header uses the uploaded logo (${logoSrc})`);
 const lr=await pub.request.get(BASE+logoSrc); assert(lr.status()===200 && lr.headers()['content-type']==='image/svg+xml' && /immutable/.test(lr.headers()['cache-control']) && /sandbox/.test(lr.headers()['content-security-policy']),'the logo is served with its type, long cache and a sandbox CSP');
 const stale=await pub.request.get(BASE+'/brand-asset/logo?v=old'); assert(stale.status()===200 && !/immutable/.test(stale.headers()['cache-control']),'a stale ?v= is not cached forever');
 const fav=await pub.request.get(BASE+'/favicon.ico'); assert(fav.headers()['content-type']==='image/png' && (await fav.body()).readUInt32BE(16)===512,'/favicon.ico now serves the uploaded icon');
 const tag=await pub.evaluate(()=>[...document.querySelectorAll('link[rel=icon]')].map(l=>l.getAttribute('href'))); assert(tag.some(h=>/^\/brand-asset\/icon\?v=/.test(h)),`the page declares the uploaded icon (${tag.join(' ')})`);
 const ic=await pub.request.get(BASE+'/icons/192'); const icb=await ic.body(); assert(ic.status()===200 && ic.headers()['content-type']==='image/png' && icb.readUInt32BE(16)===192 && !icb.equals(defIcon),'the PWA/home-screen icon uses the uploaded icon');
 const og=await pub.request.get(BASE+'/opengraph-image'); const ogb=await og.body(); assert(og.headers()['content-type']==='image/png' && ogb.readUInt32BE(16)===1200 && ogb.equals(fs.readFileSync(dir+'/share.png')),'the site share image is the uploaded one');
 const tw=await pub.request.get(BASE+'/twitter-image'); assert(tw.status()===200 && (await tw.body()).equals(fs.readFileSync(dir+'/share.png')),'the Twitter card image is the uploaded one');
 await pub.goto(BASE+'/login'); assert(await pub.locator('img[alt=Wodejia][src^="/brand-asset/icon"]').count()>=1,'the sign-in card shows the uploaded icon');
 // in the app
 const dp=await ctx.newPage(); await dp.goto(BASE+'/dashboard'); assert(await dp.locator('aside img[src^="/brand-asset/"], nav img[src^="/brand-asset/"], header img[src^="/brand-asset/"]').count()>=1,'the app menu shows the uploaded logo/icon');
 assert((await q("select 1 from blog_posts limit 1")).length>=0 && (await (await pub.request.get(BASE+'/manifest.webmanifest')).json()).icons.length===3,'manifest still lists its icons');

 // reset
 p.on('dialog',d=>d.accept());
 for(const k of ['logo','icon','share']){ await card(k).locator('button:has-text("Reset to default")').click(); await p.waitForTimeout(1200); }
 assert((await q('select count(*)::int n from brand_assets'))[0].n===0 && await card('icon').locator('[data-status]:has-text("Wodejia default")').count()===1,'reset returns everything to the defaults');
 const fav2=await pub.request.get(BASE+'/favicon.ico'); assert(fav2.headers()['content-type']==='image/x-icon','the default favicon is back');
 const og2=await (await pub.request.get(BASE+'/opengraph-image')).body(); assert(og2.readUInt32BE(16)===1200 && !og2.equals(fs.readFileSync(dir+'/share.png')),'the default share image is back');
 await pub.goto(BASE+'/'); assert(await pub.locator('img[src^="/brand-asset/"]').count()===0,'the landing page is back on the built-in logo');
 assert((await pub.request.get(BASE+'/brand-asset/bogus')).status()===404,'unknown asset kinds are 404');
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})().catch(e=>{console.error('FAIL crashed',e);process.exit(1)});
