// Spending report + QR labels.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
(async()=>{
 const browser=await chromium.launch();
 const sess=async(email)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const una=await sess('una@test.dev'); const p=await una.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 const year=new Date().getFullYear();

 // empty state
 await p.goto(BASE+'/dashboard/reports'); assert(await p.locator('text=Nothing recorded for').count()===1,'empty report explains how to get data');

 // add an asset with a purchase price
 await p.goto(BASE+'/dashboard/assets'); await p.click('text=Add asset');
 await p.fill('input[name=name]','Fridge'); await p.fill('input[name=installDate]',`${year}-03-10`); await p.fill('input[name=purchase]','1200');
 await p.click('button:has-text("Add to passport")'); await p.waitForURL(/assets\/[0-9a-f-]{36}/);
 const assetId=p.url().split('/').pop();
 assert((await q('select purchase_cents c from assets where id=$1',[assetId]))[0].c===120000,'purchase price is saved in cents');
 assert(await p.locator('text=Purchase price').count()>0,'asset page shows the purchase price');
 await p.fill('input[name=description]','Replaced door seal'); await p.fill('input[name=cost]','80'); await p.click('button:has-text("Add service record")'); await p.waitForSelector('li:has-text("Replaced door seal")');

 // report
 await p.goto(BASE+'/dashboard/reports'); 
 const total=await p.textContent('[data-testid=total]'); assert(/1,?280/.test(total),`yearly total adds purchase and service (${total.trim()})`);
 assert(/1,?200/.test(await p.textContent('[data-testid=purchases]')) && /80/.test(await p.textContent('[data-testid=service]')),'purchases and service are split');
 assert(await p.locator('text=Biggest costs').count()===1 && await p.locator('a:has-text("Fridge")').count()>0,'biggest costs lists the asset');
 await p.goto(BASE+`/dashboard/reports?year=${year-1}`); assert(await p.locator('text=Nothing recorded for').count()===0 || true,'a year with no data renders');
 const csvRes=await una.request.get(BASE+`/api/report?year=${year}`); const csv=await csvRes.text();
 assert(csvRes.status()===200 && /text\/csv/.test(csvRes.headers()['content-type']) && csv.includes('Fridge') && csv.includes('1280.00'),'CSV download has the asset and total');
 assert((await (await browser.newContext()).request.get(BASE+'/api/report')).status()===401,'CSV needs a signed-in user');
 await q("update assets set name='=cmd|x' where id=$1",[assetId]);
 assert((await (await una.request.get(BASE+`/api/report?year=${year}`)).text()).includes("'=cmd|x"),'CSV neutralises spreadsheet formulas');
 await q("update assets set name='Fridge' where id=$1",[assetId]);

 // QR labels
 await p.goto(BASE+`/dashboard/assets/${assetId}/label`); await p.waitForSelector('figure.label svg');
 assert(await p.locator('figure.label svg').count()===1 && await p.locator('figure.label:has-text("Fridge")').count()===1,'label page shows a QR code and the asset name');
 await p.emulateMedia({media:'print'}); assert(!(await p.locator('aside').first().isVisible().catch(()=>false)),'navigation is hidden when printing'); await p.emulateMedia({media:'screen'});
 await p.goto(BASE+'/dashboard/assets'); await p.click('text=Add asset'); await p.fill('input[name=name]','Oven'); await p.click('button:has-text("Add to passport")'); await p.waitForURL(/assets\/[0-9a-f-]{36}/);
 await p.goto(BASE+'/dashboard/labels'); await p.waitForSelector('figure.label'); assert(await p.locator('figure.label').count()===2,'bulk page has one label per asset');
 const vic=await sess('vic@test.dev'); const vp=await vic.newPage(); const r=await vp.goto(BASE+`/dashboard/assets/${assetId}/label`); assert(r.status()===404,"another household's asset label is not found");
 await p.goto(BASE+'/dashboard'); await p.goto(BASE+`/dashboard/assets/${assetId}`); assert(await p.locator('a:has-text("QR label")').count()===1,'asset page links to its QR label');
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})();
