const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt');
const BASE='http://localhost:3100', S=process.argv[2];
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
(async()=>{ const b=await chromium.launch();
 const ctx=async(email,scheme='light')=>{ const t=await encode({token:{email,sub:email,sv:0},secret:'localtestsecretlocaltestsecret1234'}); const c=await b.newContext({viewport:{width:1280,height:800},colorScheme:scheme,deviceScaleFactor:1.5}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const c=await ctx('admin@test.dev'); const p=await c.newPage(); await p.goto(BASE+'/dashboard'); await p.waitForSelector('aside');
 const box=async(sel)=>p.locator(sel).first().boundingBox();
 const tog=await box('aside button[aria-label="Collapse sidebar"]'), theme=await box('aside button[aria-label*="mode"]'), side=await box('aside'), admin=await box('aside a[href="/admin"]'), coffee=await box('aside a[href="/support"]'), settings=await box('aside a[href="/dashboard/settings"]');
 assert(tog.y>600 && Math.abs(tog.y-theme.y)<3,'collapse button sits on the same row as the day/night toggle, at the bottom');
 const out=await box('aside button[aria-label="Sign out"]'); assert(tog.x>theme.x && tog.x-theme.x<70 && out.x>tog.x && out.x+out.width>side.x+side.width-20 && Math.abs(out.y-tog.y)<3,'order on the bottom row: day/night, collapse, then sign out (right-aligned)');
 assert(await p.locator('aside nav[aria-label=Primary] a[href="/admin"]').count()===1 && await p.locator('aside nav[aria-label=Primary] a[href="/support"]').count()===1,'Admin portal and Buy me a coffee are in the menu, under their Admin / Support headings (same as the phone)');
 const order=await p.evaluate(()=>{const g=s=>document.querySelector('aside nav[aria-label=Primary] a[href="'+s+'"]'); const f=(a,b)=>!!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING); return f(g('/dashboard/settings'),g('/support')) && f(g('/support'),g('/admin'));}); assert(order,'Support then Admin follow Account at the end of the menu, and the toggle row stays pinned below it');
 await p.screenshot({path:S+'/side-expanded.png',clip:{x:0,y:0,width:700,height:800}});
 await p.click('aside button[aria-label="Collapse sidebar"]'); await p.waitForTimeout(400);
 assert((await box('aside')).width<100 && await p.locator('aside button[aria-label="Expand sidebar"]').count()===1,'collapsed rail shows the expand button beside the theme toggle');
 await p.screenshot({path:S+'/side-collapsed.png',clip:{x:0,y:0,width:300,height:800}});
 await p.click('aside button[aria-label="Expand sidebar"]');
 // inside the app the logo is one flat colour: the accent (the mask path inside <defs> is not drawn, so it is left out)
 const stroke=async()=>p.evaluate(()=>[...document.querySelectorAll('aside svg[aria-label=Wodejia] > g > path, aside svg[aria-label=Wodejia] > path')].map(e=>getComputedStyle(e).stroke).filter((v,i,a)=>a.indexOf(v)===i));
 const light=await stroke(); assert(light.length===1 && light[0]==='rgb(31, 58, 107)',`logo mark is one flat colour in light mode — the Wodejia blue (${light})`);
 await p.goto(BASE+'/dashboard/settings/appearance'); await p.click('[role=radio][aria-label=Violet]'); const after=await stroke(); assert(after.length===1 && after[0]==='rgb(150, 55, 200)','in the app the logo follows the accent colour (Violet)');
 assert(await p.locator('a[href="/admin"]:has-text("Admin portal")').count()>=1,'admins also get an Admin portal link in Settings (reachable on mobile)');
 const wm=await p.evaluate(()=>getComputedStyle(document.querySelector('aside span[aria-hidden=true] > span')).color); assert(wm==='rgb(150, 55, 200)','wordmark follows the accent too');
 const d=await ctx('admin@test.dev','dark'); const dp=await d.newPage(); await dp.goto(BASE+'/dashboard'); await dp.waitForSelector('aside'); await dp.waitForTimeout(500);
 const dstroke=await dp.evaluate(()=>getComputedStyle(document.querySelector('aside svg[aria-label=Wodejia] > g > path')).stroke); assert(dstroke==='rgb(255, 255, 255)',`dark mode draws the whole logo in white (${dstroke})`);
 await dp.screenshot({path:S+'/side-dark.png',clip:{x:0,y:0,width:700,height:800}});
 const u=await ctx('user@test.dev'); const up=await u.newPage(); await up.goto(BASE+'/dashboard'); await up.waitForSelector('aside');
 assert(await up.locator('aside a[href="/admin"]').count()===0 && await up.locator('aside a[href="/support"]').count()===1,'non-admin: no Admin link, coffee link still shown');
 await up.screenshot({path:S+'/side-user.png',clip:{x:0,y:0,width:700,height:800}});
 // bottom row: day/night, collapse, sign-out
 { const ubox=async(sel)=>up.locator(sel).first().boundingBox(); const th=await ubox('aside button[aria-label*="mode"]'), so=await ubox('aside button[aria-label="Sign out"]'), co=await ubox('aside button[aria-label="Collapse sidebar"]');
   assert(Math.abs(so.y-th.y)<3 && co.x>th.x && co.x-(th.x+th.width)<12 && so.x>co.x,'bottom row order: day/night, collapse, then sign-out');
   assert(so.width>=44&&so.height>=44,'sign-out icon is a full-size tap target');
   await up.click('aside button[aria-label="Collapse sidebar"]'); await up.waitForTimeout(400);
   const th2=await ubox('aside button[aria-label*="mode"]'), so2=await ubox('aside button[aria-label="Sign out"]'); assert(so2.y>th2.y && Math.abs(so2.x-th2.x)<2 && so2.x>=0 && so2.x+so2.width<=77,'collapsed sidebar stacks the sign-out icon under the toggle, inside the rail');
   await up.click('aside button[aria-label="Expand sidebar"]'); await up.waitForTimeout(300);
   await up.click('aside button[aria-label="Sign out"]'); await up.waitForURL(u=>new URL(u).pathname==='/',{timeout:15000}); assert(true,'clicking it signs you out and returns to the homepage');
   await up.goto(BASE+'/dashboard'); assert(/\/(login|api\/auth\/signin)/.test(up.url()),'the session is gone: the dashboard asks you to sign in again'); }

 const m=await b.newContext({viewport:{width:390,height:844}}); const t=await encode({token:{email:'admin@test.dev',sub:'a',sv:0},secret:'localtestsecretlocaltestsecret1234'}); await m.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); const mp=await m.newPage(); await mp.goto(BASE+'/dashboard'); assert(await mp.locator('aside').isHidden(),'mobile layout unaffected (sidebar hidden, bottom tabs used)');
 await b.close(); })().catch(e=>{console.error(e);process.exit(1)});
