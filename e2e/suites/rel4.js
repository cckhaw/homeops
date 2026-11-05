// Home picker for people with many homes + passport sharing off by default.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp||{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const una=await sess('una@test.dev'); const p=await una.newPage(); p.on('pageerror',e=>errs.push(e.message));

 // a brand-new home has sharing off
 await p.goto(BASE+'/dashboard');
 assert((await q("select passport_token t from households h join profiles u on u.id=h.owner_id where u.email='una@test.dev'"))[0].t===null,'a newly created home has no public passport link');
 await p.goto(BASE+'/dashboard/passport'); assert(await p.locator('text=Sharing is off').count()===1,'Passport page says sharing is off');
 await p.click('button:has-text("Create share link")'); await p.waitForSelector('[data-testid=passport-path]'); assert(true,'an owner can switch sharing on');

 // few homes keep the icon row
 assert(await p.locator('aside [role=group][aria-label="Your homes"]').count()===1 && await p.locator('aside [aria-haspopup=dialog]').count()===0,'with a few homes the icon row is kept');

 // give una 12 homes in total
 const uid=(await q("select id from profiles where email='una@test.dev'"))[0].id;
 const names=['Alder Lane','Birch Court','Cedar Rise','Dune Villa','Elm Street','Fjord Cabin','Garden Flat','Harbour View','Ivy House','Juniper Lodge','Kampung Stay'];
 for(const n of names){ const h=(await q("insert into households(name,owner_id,icon) values ($1,$2,'villa') returning id",[n,uid]))[0].id; await q("insert into household_members(household_id,user_id,role) values ($1,$2,'owner')",[h,uid]); }
 await p.goto(BASE+'/dashboard');
 const trig=p.locator('aside button[aria-haspopup=dialog]'); await trig.waitFor();
 assert(await p.locator('aside [role=group][aria-label="Your homes"]').count()===0,'12 homes: the icon row is replaced by a single switcher');
 assert(/12 homes/.test(await trig.innerText()),'the switcher shows the current home and the count');
 await trig.click(); const dlg=p.locator('[role=dialog][aria-label="Choose a home"]'); await dlg.waitFor();
 assert(await dlg.locator('[role=option]').count()===12,'the list holds every home');
 assert(await dlg.locator('[role=option]').first().getAttribute('aria-selected')==='true','the current home is listed first');
 assert(await p.evaluate(()=>document.activeElement&&document.activeElement.getAttribute('aria-label')==='Search homes'),'search box is focused for typing');
 await dlg.locator('input[aria-label="Search homes"]').fill('har'); assert(await dlg.locator('[role=option]').count()===1,'search narrows the list ("har" → Harbour View)');
 await dlg.locator('input[aria-label="Search homes"]').fill('zzz'); assert(await dlg.locator('text=No home matches').count()===1,'empty search says so');
 await dlg.locator('input[aria-label="Search homes"]').fill('harbour'); await dlg.locator('[role=option] button').click(); await p.waitForTimeout(1500);
 assert(await dlg.count()===0 && /Harbour View/.test(await p.locator('aside button[aria-haspopup=dialog]').innerText()),'choosing a home switches to it and closes the list');
 await trig.click(); await p.keyboard.press('Escape'); await p.waitForTimeout(200); assert(await p.locator('[role=dialog][aria-label="Choose a home"]').count()===0,'Escape closes the list');
 assert(await p.locator('[role=dialog] a:has-text("Manage homes")').count()===0,'closed list leaves no stray links');
 // collapsed sidebar
 await p.click('aside button[aria-label="Collapse sidebar"]'); await p.waitForTimeout(400);
 const rail=p.locator('aside button[aria-haspopup=dialog]'); assert(await rail.isVisible() && (await rail.boundingBox()).width<=48,'collapsed sidebar shows one icon-sized switcher');
 await rail.click(); assert(await p.locator('[role=dialog][aria-label="Choose a home"]').isVisible(),'…which opens the same list'); await p.keyboard.press('Escape'); await p.click('aside button[aria-label="Expand sidebar"]');

 // tablet + phone
 for(const [label,vp] of [['tablet',{width:820,height:1100}],['phone',{width:390,height:844}]]){
  const c=await sess('una@test.dev',vp); const pg=await c.newPage(); await pg.goto(BASE+'/dashboard');
  const t=pg.locator(label==='phone'?'header button[aria-haspopup=dialog]':'aside button[aria-haspopup=dialog]'); await t.waitFor();
  assert(await pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${label}: no horizontal scrolling with 12 homes`);
  await t.click(); const d=pg.locator('[role=dialog][aria-label="Choose a home"]'); await d.waitFor(); const b=await d.boundingBox();
  if(label==='phone') assert(b.width>=vp.width-1 && b.y+b.height>=vp.height-2,'phone: the list is a bottom sheet'); else assert(b.width<=300,'tablet: the list is a popover');
  assert((await d.locator('[role=option] button').first().boundingBox()).height>=44,`${label}: rows are at least 44px tall`);
  if(label==='phone') await pg.screenshot({path:(process.argv[2]||'.')+'/picker-phone.png'});
  await c.close();
 }
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})();
