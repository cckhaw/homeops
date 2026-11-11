// Demo mode: admin configuration, public sign-in card, per-visitor sandbox with twelve populated homes, guard rails, isolation, clean-up.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg'); const fs = require('fs');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const EMAIL='demo@example.com', PW='DemoPass2026x';
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp||{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const ac=await sess('admin@test.dev'); const ap=await ac.newPage(); ap.on('pageerror',e=>errs.push(e.message)); ap.on('dialog',d=>d.accept());
 const save=async(o)=>{ const f=ap.locator('[data-testid=demo-admin] form'); const en=f.locator('input[name=enabled]'); if(o.enabled!==undefined) await en.setChecked(o.enabled); if(o.email!==undefined) await f.locator('input[name=email]').fill(o.email); if(o.password!==undefined) await f.locator('input[name=password]').fill(o.password); if(o.hint!==undefined) await f.locator('input[name=showHint]').setChecked(o.hint); await f.locator('button:has-text("Save")').click(); };

 // ---------------- admin configuration
 await ap.goto(BASE+'/admin/demo'); assert(await ap.locator('aside[aria-label=Admin] nav a:has-text("Demo")').count()===1 && await ap.getByTestId('demo-admin').count()===1,'Admin → Demo exists in the menu');
 await save({enabled:true,email:'not-an-email',password:PW}); await ap.getByText(/Enter an e-mail address/).waitFor(); assert((await q("select value from site_settings where key='demo_enabled'")).length===0 || (await q("select value from site_settings where key='demo_enabled'"))[0].value!=='true','an invalid e-mail is refused and nothing is switched on');
 await save({email:'una@test.dev',password:PW}); await ap.getByText(/already belongs to a real account/).waitFor(); assert(true,'a real account\'s e-mail cannot be used as the demo login');
 await save({email:EMAIL,password:'short'}); await ap.getByText(/8 to 64 characters/).waitFor(); assert(true,'a short password is refused');
 await save({email:EMAIL,password:PW,enabled:true,hint:true}); await ap.getByText(/The demo is on/).waitFor();
 const st=Object.fromEntries((await q("select key,value from site_settings where key like 'demo_%'")).map(r=>[r.key,r.value])); assert(st.demo_enabled==='true' && st.demo_email===EMAIL && st.demo_password===PW && st.demo_show_hint==='true' && st.demo_hours==='24','the demo e-mail, password, switch and lifetime are saved in site settings');
 assert((await q("select count(*)::int n from audit_log where action='demo.settings'"))[0].n>=1,'saving is audit-logged');
 await ap.click('button[aria-label="Generate a password"]'); assert((await ap.locator('input[name=password]').inputValue()).length===12 && (await ap.locator('input[name=password]').inputValue())!==PW,'a strong password can be generated'); await ap.reload();

 // ---------------- public sign-in card and landing button
 const anon=await browser.newContext({viewport:{width:1280,height:900}}); const a=await anon.newPage(); a.on('pageerror',e=>errs.push(e.message));
 await a.goto(BASE+'/login'); assert(await a.getByTestId('demo-card').count()===1 && (await a.getByTestId('demo-email').innerText())===EMAIL && (await a.getByTestId('demo-password').innerText())===PW,'the sign-in page shows the demo card with the credentials');
 await a.goto(BASE+'/'); assert(await a.getByTestId('try-demo').count()===1,'the homepage has a "Try the live demo" button');
 await q("update site_settings set value='false' where key='demo_show_hint'"); await a.goto(BASE+'/login'); assert(await a.getByTestId('demo-card').count()===0 && (await a.goto(BASE+'/')) && await a.getByTestId('try-demo').count()===0,'with the hint switched off, nothing is shown publicly');
 await q("update site_settings set value='true' where key='demo_show_hint'");
 // wrong password / disabled
 const typed=async(pg,email,pw)=>{ await pg.goto(BASE+'/login'); await pg.fill('input[type=email]',email); await pg.locator('input[type=password]').first().fill(pw); await pg.click('form button[type=submit]'); await pg.waitForTimeout(2500); };
 await typed(a,EMAIL,'wrong-password-1'); assert(/Incorrect e-mail or password/.test(await a.locator('main').innerText()) && (await q("select count(*)::int n from profiles where is_demo"))[0].n===0,'a wrong demo password is refused and creates nothing');
 await q("update site_settings set value='false' where key='demo_enabled'"); await typed(a,EMAIL,PW); assert(/Incorrect e-mail or password/.test(await a.locator('main').innerText()),'with the demo switched off the credentials stop working');
 await q("update site_settings set value='true' where key='demo_enabled'");

 // ---------------- a visitor signs in with the card
 const vc=await browser.newContext({viewport:{width:1280,height:900}}); const v=await vc.newPage(); v.on('pageerror',e=>errs.push(e.message)); v.on('dialog',d=>d.accept());
 const t0=Date.now(); await v.goto(BASE+'/login'); await v.click('button:has-text("Sign in to the demo")'); await v.waitForURL(/\/dashboard/,{timeout:90000}); console.log('info  demo sign-in took',Date.now()-t0,'ms');
 assert(await v.getByTestId('demo-banner').count()===1 && /demo/i.test(await v.getByTestId('demo-banner').innerText()) && await v.locator('[data-testid=demo-banner] a[href="/register"]').count()===1,'a demo banner with a "Create your free account" link is shown');
 const owner=(await q("select id,email,full_name,is_demo,demo_expires_at from profiles where is_demo and full_name='Alex Tan (Demo)'"))[0]; assert(owner && owner.email.endsWith('@demo.wodejia.invalid') && owner.demo_expires_at>new Date(Date.now()+23*3600e3),'a private demo account is created (unroutable e-mail, expires in 24 h)');
 const n=async(sql)=>(await q(sql,[owner.id]))[0].n;
 assert(await n("select count(*)::int n from households where owner_id=$1")===12 && await n("select count(distinct icon)::int n from households where owner_id=$1")===12,'twelve homes of twelve different types');
 assert(await n("select count(*)::int n from assets a join households h on h.id=a.household_id where h.owner_id=$1")>=50 && await n("select count(*)::int n from maintenance_tasks t join households h on h.id=t.household_id where h.owner_id=$1")>=150 && await n("select count(*)::int n from service_records s join households h on h.id=s.household_id where h.owner_id=$1")>=20,'dozens of assets, a full schedule and service history');
 assert(await n("select count(*)::int n from tenancies t join households h on h.id=t.household_id where h.owner_id=$1")>=4 && await n("select count(*)::int n from condition_reports r join households h on h.id=r.household_id where h.owner_id=$1")>=5 && await n("select count(*)::int n from rent_payments p join tenancies t on t.id=p.tenancy_id join households h on h.id=t.household_id where h.owner_id=$1")>=20,'rentals with rent history and condition reports');
 assert(await n("select count(*)::int n from documents d join households h on h.id=d.household_id where h.owner_id=$1")>=20 && await n("select count(*)::int n from utility_bills b join households h on h.id=b.household_id where h.owner_id=$1")>=100 && await n("select count(*)::int n from contractor_homes c join households h on h.id=c.household_id where h.owner_id=$1")>=20 && await n("select count(*)::int n from households where owner_id=$1 and passport_token is not null")>=3,'documents, bills, contractors across homes and shared passports');
 assert(await n("select count(*)::int n from household_members m join households h on h.id=m.household_id where h.owner_id=$1 and m.user_id<>$1")>=8,'household members in several homes');

 // ---------------- every function has something to show
 const text=async(path)=>{ const r=await v.goto(BASE+path); await v.waitForTimeout(400); return {status:r.status(), t:await v.locator('main').innerText()}; };
 let r=await text('/dashboard'); assert(r.status===200 && /Bukit Timah Family House/.test(await v.locator('aside').innerText()),'dashboard opens on the first home');
 assert(/12 homes/.test(await v.locator('aside').first().innerText()),'the home switcher counts twelve homes');
 r=await text('/dashboard/assets'); assert(/Living room air-con/.test(r.t) && /Kitchen refrigerator/.test(r.t),'assets are listed with their warranty status'); assert(/Expired|ends in|day/i.test(r.t),'with warranty states');
 const ac1=await v.locator('a:has-text("Living room air-con")').first().getAttribute('href'); r=await text(ac1); assert(/Quarterly servicing/.test(r.t) && /CoolBreeze/.test(r.t),'an asset shows its service history and contractor');
 r=await text('/dashboard/schedule'); assert(/overdue/i.test(r.t) && /Service all air-cons/.test(r.t) && /Pay property tax/.test(r.t),'the schedule has overdue, upcoming and property-date tasks');
 r=await text('/dashboard/household'); assert(/Mei Ling Tan/.test(r.t) && /Siti Aminah/.test(r.t),'the household page lists the family members and roles');
 r=await text('/dashboard/passport'); assert(/passport\//.test(await v.content()),'the Home Service Passport is shared');
 const pp=(await q("select passport_token t from households where owner_id=$1 and passport_token is not null limit 1",[owner.id]))[0].t; const pub=await (await browser.newContext()).newPage(); const pr=await pub.goto(BASE+'/passport/'+pp); assert(pr.status()===200 && /Home Service Passport|passport/i.test(await pub.locator('main').innerText()),'the public passport link works for visitors');
 r=await text('/dashboard/documents'); assert(/Home insurance 2026/.test(r.t) && /Mortgage agreement/.test(r.t),'the document vault is populated');
 r=await text('/dashboard/contractors'); assert(/CoolBreeze Aircon Services/.test(r.t) && /Aziz Plumbing/.test(r.t),'the contractor book is populated');
 r=await text('/dashboard/bills'); assert(/Electricity/.test(r.t) && /Water/.test(r.t),'utility bills are shown');
 r=await text('/dashboard/property'); assert(r.status===200 && /Property dates/.test(r.t),'property dates page opens');
 r=await text('/dashboard/reports'); assert(r.status===200 && /Spending|spent|Total/i.test(r.t),'the spending report has figures');
 r=await text('/dashboard/labels'); assert(r.status===200 && /Living room air-con|Kitchen refrigerator/.test(r.t),'QR labels are ready to print');
 r=await text('/dashboard/pack'); assert(r.status===200,'the move-out pack page opens');
 r=await text('/dashboard/homes'); console.log('info homes matches',(r.t.match(/assets · /g)||[]).length,JSON.stringify(r.t.slice(0,200))); assert((r.t.match(/assets · /g)||[]).length>=12 && /Cameron Highlands Cabin/.test(r.t) && /Hakuba Mountain Chalet/.test(r.t),'My homes lists all twelve');
 // rentals live in the rental homes: switch to Johor Bahru
 const jb=(await q("select id from households where owner_id=$1 and name like 'Johor Bahru%'",[owner.id]))[0].id; await vc.addCookies([{name:'homeops_home',value:jb,url:BASE}]);
 r=await text('/dashboard/rentals'); assert(/Mr and Mrs Lim/.test(r.t) && /unpaid/.test(r.t) && /Move-in report/.test(r.t),'Rentals shows a tenant with unpaid months and a move-in report');
 const lk=(await q("select id from households where owner_id=$1 and name like 'Langkawi%'",[owner.id]))[0].id; await vc.addCookies([{name:'homeops_home',value:lk,url:BASE}]);
 r=await text('/dashboard/rentals'); assert(/Past tenancies/.test(r.t),'an ended tenancy sits under Past tenancies'); await v.locator('[data-testid=reports] a:has-text("Move-out")').first().click(); await v.waitForURL(/reports\//); const cmp=await v.getByTestId('comparison').innerText(); assert(/Walls and paint/.test(cmp) && /Damaged/.test(cmp),'the move-out report compares with move-in (walls: Good → Damaged)');
 await v.screenshot({path:S+'/demo-report.png'});

 // ---------------- guard rails
 await v.goto(BASE+'/dashboard/settings/security'); await v.locator('main form input[type=password]').first().fill('A-new-password-1234'); await v.locator('input[name=confirm]').first().fill('A-new-password-1234'); await v.click('main form button[type=submit]'); await v.getByText(/switched off in the demo/).first().waitFor(); assert(true,'changing the password is switched off');
 await v.goto(BASE+'/dashboard/settings/privacy'); await v.click('summary:has-text("Delete my account")'); const pwi=v.locator('details input[type=password]'); if(await pwi.count()) await pwi.first().fill('x'); await v.fill('details input[name=confirm]','DELETE'); await v.click('details button:has-text("Delete my account")'); await v.getByText(/switched off in the demo/).first().waitFor(); assert((await q("select count(*)::int n from profiles where id=$1",[owner.id]))[0].n===1,'deleting the account is switched off');
 const oc=await v.request.post(BASE+'/api/ocr',{multipart:{receipt:{name:'r.png',mimeType:'image/png',buffer:Buffer.from('x')}}}); assert(oc.status()===403 && /switched off in the demo/.test((await oc.json()).error),'receipt and sticker scanning are switched off (no AI cost)');
 await v.goto(BASE+'/dashboard/household'); const inv=await q("select count(*)::int n from household_invites"); const ib=v.locator('button:has-text("invite"), button:has-text("Invite"), button:has-text("Create")').first(); if(await ib.count()){ await ib.click(); await v.waitForTimeout(1200); } assert((await q("select count(*)::int n from household_invites"))[0].n===inv[0].n,'inviting people creates nothing in the demo');
 await v.goto(BASE+'/dashboard/assets'); await v.click('button:has-text("Add asset")'); await v.waitForSelector('[role=dialog] input[name=name]'); await v.fill('[role=dialog] input[name=name]','Test heater'); await v.locator('[role=dialog] input[name=receipt]').setInputFiles({name:'r.png',mimeType:'image/png',buffer:Buffer.from('89504e47','hex')}); await v.click('[role=dialog] button:has-text("Add to passport")'); await v.getByText(/File upload is switched off in the demo/).waitFor(); assert(true,'uploading a file is switched off');
 // editing is allowed (it is a sandbox)
 await v.locator('[role=dialog] input[name=receipt]').setInputFiles([]); await v.click('[role=dialog] button:has-text("Add to passport")'); await v.waitForTimeout(2000); assert((await q("select count(*)::int n from assets where name='Test heater'"))[0].n===1,'but adding and editing data works normally');

 // ---------------- isolation: a second visitor gets their own copy
 const vc2=await browser.newContext({viewport:{width:1280,height:900}}); const v2=await vc2.newPage(); await v2.goto(BASE+'/login'); await v2.click('button:has-text("Sign in to the demo")'); await v2.waitForURL(/\/dashboard/,{timeout:90000});
 assert((await q("select count(*)::int n from profiles where is_demo and full_name='Alex Tan (Demo)'"))[0].n===2 && (await q("select count(*)::int n from households h join profiles p on p.id=h.owner_id where p.is_demo"))[0].n===24,'a second visitor gets a second, separate sandbox (24 homes in total)');
 await v2.goto(BASE+'/dashboard/assets'); assert(!/Test heater/.test(await v2.locator('main').innerText()),'the first visitor\'s edits are not visible to the second');
 // ---------------- the admin's view stays clean
 await ap.goto(BASE+'/admin/users'); assert(!/demo-.*invalid|Alex Tan/.test(await ap.locator('main').innerText()),'demo accounts are left out of Admin → Users');
 const realUsers=(await q("select count(*)::int n from profiles where not is_demo"))[0].n; await ap.goto(BASE+'/admin'); assert(new RegExp(`\\b${realUsers}\\b`).test(await ap.locator('main').innerText()),`Analytics counts real users only (${realUsers})`);
 // reminders never go to demo accounts
 await q("update profiles set notify_reminders=true where is_demo"); const m0=fs.existsSync(S+'/mails.json')?JSON.parse(fs.readFileSync(S+'/mails.json')).length:0; const cr=await ac.request.get(BASE+'/api/cron/reminders',{headers:{authorization:'Bearer croncroncron'}}); const mails=JSON.parse(fs.readFileSync(S+'/mails.json')); assert(cr.status()===200 && !mails.slice(m0).some(x=>/demo\.wodejia\.invalid/.test(String(x.to))),'the reminder job never e-mails demo accounts');

 // ---------------- expiry and clean-up
 await q("update profiles set demo_expires_at=now()-interval '1 hour' where id=$1",[owner.id]); await v.goto(BASE+'/dashboard'); assert(/\/login/.test(v.url()),'a demo past its time is signed out');
 await ap.goto(BASE+'/admin/demo'); assert(/2 demo sandboxes|currently exist/.test(await ap.getByTestId('demo-admin').innerText()),'Admin shows how many sandboxes exist');
 await ap.click('button:has-text("Remove expired now")'); await ap.getByText(/Removed 1 demo sandbox/).waitFor(); assert((await q("select count(*)::int n from profiles where is_demo and full_name='Alex Tan (Demo)'"))[0].n===1 && (await q("select count(*)::int n from households where owner_id=$1",[owner.id]))[0].n===0 && (await q("select count(*)::int n from assets a left join households h on h.id=a.household_id where h.id is null"))[0].n===0,'removing an expired sandbox deletes its account, homes and data');
 await q("update profiles set demo_expires_at=now()-interval '1 hour' where is_demo"); const c2=await ac.request.get(BASE+'/api/cron/reminders',{headers:{authorization:'Bearer croncroncron'}}); assert(c2.status()===200 && (await q("select count(*)::int n from profiles where is_demo"))[0].n===0,'the daily job also removes expired sandboxes (with their team members)');
 assert((await q("select count(*)::int n from contractors"))[0].n===0,'and the contractors that belonged only to them');
 // remove all
 const vc3=await browser.newContext(); const v3=await vc3.newPage(); await v3.goto(BASE+'/login'); await v3.click('button:has-text("Sign in to the demo")'); await v3.waitForURL(/\/dashboard/,{timeout:90000});
 await ap.goto(BASE+'/admin/demo'); await ap.click('button:has-text("Remove all")'); await ap.getByText(/Removed \d+ demo sandbox/).waitFor(); assert((await q("select count(*)::int n from profiles where is_demo"))[0].n===0,'"Remove all" clears every sandbox');
 // phone
 const vc4=await browser.newContext({viewport:{width:390,height:844}}); const v4=await vc4.newPage(); await v4.goto(BASE+'/login'); assert(await v4.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone: the sign-in page with the demo card fits'); await v4.screenshot({path:S+'/demo-login-phone.png',fullPage:true});
 await v4.click('button:has-text("Sign in to the demo")'); await v4.waitForURL(/\/dashboard/,{timeout:90000}); assert(await v4.evaluate(()=>document.documentElement.scrollWidth<=innerWidth) && await v4.getByTestId('demo-banner').isVisible(),'phone: the dashboard with the demo banner fits'); await v4.screenshot({path:S+'/demo-dashboard-phone.png'});
 await v.screenshot({path:S+'/demo-dash.png'});
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})().catch(e=>{console.error('FAIL crashed',e);process.exit(1)});
