// Contractors, document vault, utility bills, move-out pack, More hub.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg'); const { unzipSync, strFromU8 } = require('fflate'); const fs = require('fs');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp||{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const ctx=await sess('una@test.dev'); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.goto(BASE+'/dashboard'); const uid=(await q("select id from profiles where email='una@test.dev'"))[0].id; const hid=(await q("select id from households where owner_id=$1",[uid]))[0].id;
 await q("update households set currency='MYR' where id=$1",[hid]);

 // ---------------- contractors
 await p.goto(BASE+'/dashboard/contractors'); assert(await p.locator('text=No contractors yet').count()===1,'contractors page starts empty');
 await p.fill('input[name=name]','Ah Seng Plumbing'); await p.fill('input[name=trade]','Plumber'); await p.fill('input[name=phone]','abc'); await p.click('button:has-text("Add contractor")'); await p.waitForSelector('text=digits');
 assert((await q('select count(*)::int c from contractors'))[0].c===0 && await p.inputValue('input[name=name]')==='Ah Seng Plumbing','bad phone is refused and the typed values stay');
 await p.fill('input[name=phone]','012-345 6789'); await p.fill('input[name=email]','seng@example.com'); await p.click('button:has-text("Add contractor")'); await p.waitForSelector('[data-testid=contractor]');
 assert((await q('select name from contractors'))[0].name==='Ah Seng Plumbing','contractor saved');
 assert(await p.locator('a[href="tel:0123456789"]').count()===1,'Call link uses the number');
 assert(await p.locator('a[href="https://wa.me/60123456789"]').count()===1,'WhatsApp link adds the home country code (MYR → 60)');
 assert(await p.locator('a[href="mailto:seng@example.com"]').count()===1,'e-mail link present');
 // edit
 await p.click('summary:has-text("Edit")'); await p.locator('details input[name=notes], details textarea[name=notes]').fill('Cheap and fast'); await p.click('details button:has-text("Save changes")'); await p.waitForTimeout(1200);
 assert((await q('select notes from contractors'))[0].notes==='Cheap and fast','contractor can be edited');
 // service record picks the contractor
 await p.goto(BASE+'/dashboard/assets'); await p.click('text=Add asset'); await p.fill('input[name=name]','Sink'); await p.click('button:has-text("Add to passport")'); await p.waitForURL(/assets\/[0-9a-f-]{36}/);
 await p.fill('input[name=description]','Fixed leak'); await p.selectOption('select[name=contractorId]',{label:'Ah Seng Plumbing (Plumber)'}); await p.fill('input[name=cost]','150'); await p.click('button:has-text("Add service record")'); await p.waitForSelector('li:has-text("Fixed leak")');
 const rec=(await q('select provider, contractor_id from service_records'))[0]; assert(rec.provider==='Ah Seng Plumbing' && rec.contractor_id,'service record links the contractor and keeps the name');
 await p.goto(BASE+'/dashboard/contractors'); assert(await p.locator('text=1 job').count()===1 && /150/.test(await p.locator('[data-testid=contractor]').innerText()),'contractor card shows job count and spend');
 // delete keeps history
 await p.click('summary:has-text("Edit")'); p.once('dialog',d=>d.accept()); await p.click('details button:has-text("Delete")'); await p.waitForTimeout(1200);
 assert((await q('select count(*)::int c from contractors'))[0].c===0 && (await q('select provider from service_records'))[0].provider==='Ah Seng Plumbing','deleting a contractor keeps the service record and its name');
 // another home cannot see them
 const vic=await sess('vic@test.dev'); const vp=await vic.newPage(); await vp.goto(BASE+'/dashboard/contractors'); assert(await vp.locator('text=No contractors yet').count()===1,"another household doesn't see them");

 // ---------------- document vault (rows inserted directly: file storage isn't available locally)
 await p.goto(BASE+'/dashboard/documents'); assert(await p.locator('text=Nothing here yet').count()===1,'vault starts empty');
 await p.fill('input[name=title]','Home insurance'); await p.click('button:has-text("Add to vault")'); await p.waitForTimeout(1200);
 assert((await q('select count(*)::int c from documents'))[0].c===0,'a document needs a file');
 const soon=new Date(Date.now()+10*86400000).toISOString().slice(0,10), past=new Date(Date.now()-3*86400000).toISOString().slice(0,10), far=new Date(Date.now()+400*86400000).toISOString().slice(0,10);
 for(const [t,c,e] of [['Fire insurance','Insurance',soon],['Old permit','Permit / certificate',past],['Title deed','Title / deed',far],['Mortgage letter','Mortgage / loan',null]]) await q("insert into documents(household_id,title,category,expires_on,created_by) values ($1,$2,$3,$4,$5)",[hid,t,c,e,uid]);
 await p.reload(); assert(await p.locator('[data-testid=document]').count()===4,'vault lists the documents');
 assert(await p.locator('[data-testid=document]:has-text("Fire insurance") >> text=/Expires in 10 days/').count()===1,'expiring document shows a countdown');
 assert(await p.locator('[data-testid=document]:has-text("Old permit") >> text=/Expired 3 days ago/').count()===1,'expired document is flagged');
 await p.locator('[data-testid=document]:has-text("Mortgage letter") summary').click(); await p.locator('[data-testid=document]:has-text("Mortgage letter") input[name=title]').fill('Mortgage statement'); await p.locator('[data-testid=document]:has-text("Mortgage letter") button:has-text("Save changes")').click(); await p.waitForTimeout(1200);
 assert((await q("select count(*)::int c from documents where title='Mortgage statement'"))[0].c===1,'document details can be edited');
 assert((await (await browser.newContext()).request.get(BASE+'/api/documents/'+(await q('select id from documents limit 1'))[0].id)).status()===401,'document files need sign-in');
 // expiry reminder e-mail
 await q("update profiles set notify_reminders=true, warranty_lead_days=30 where id=$1",[uid]); fs.writeFileSync(S+'/mails.json','[]');
 const cron=async()=> (await (await fetch(BASE+'/api/cron/reminders',{headers:{authorization:'Bearer croncroncron'}})).json());
 const r1=await cron(); const m1=JSON.parse(fs.readFileSync(S+'/mails.json'));
 assert(r1.documents===1 && m1.some(m=>/Fire insurance/.test(m.html)&&/Documents expiring/.test(m.html)),'cron e-mails about the expiring document');
 const r2=await cron(); assert(r2.documents===0,'and not again the next day');

 // ---------------- utility bills
 await p.goto(BASE+'/dashboard/bills'); assert(await p.locator('text=No bills yet').count()===1,'bills page starts empty');
 const mk=(back)=>{ const d=new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()-back); return d.toISOString().slice(0,7); };
 for(const [back,amt] of [[4,100],[3,100],[2,100],[1,160]]){ await p.selectOption('select[name=kind]','electricity'); await p.fill('input[name=period]',mk(back)); await p.fill('input[name=amount]',String(amt)); await p.fill('input[name=usage]','300'); await p.click('button:has-text("Save bill")'); await p.waitForSelector('text=Bill saved'); await p.waitForTimeout(500); }
 assert((await q('select count(*)::int c from utility_bills'))[0].c===4,'four monthly bills saved');
 assert(await p.locator('[data-testid=chart-electricity]').count()===1,'electricity chart appears');
 assert(await p.locator('[data-testid=spike]').count()===1 && /60%/.test(await p.locator('[data-testid=spike]').innerText()),'a month 60% above the recent average is flagged');
 await p.fill('input[name=period]',mk(1)); await p.fill('input[name=amount]','110'); await p.click('button:has-text("Save bill")'); await p.waitForTimeout(1200);
 assert((await q('select count(*)::int c, max(amount_cents)::int m from utility_bills'))[0].c===4 && (await q("select amount_cents a from utility_bills order by period desc limit 1"))[0].a===11000,'saving the same month replaces it');
 await p.reload(); assert(await p.locator('[data-testid=spike]').count()===0,'the spike disappears once the bill is corrected');
 await p.fill('input[name=amount]','abc'); await p.fill('input[name=period]',mk(0)); await p.click('button:has-text("Save bill")'); await p.waitForSelector('[role=alert]'); assert(true,'a non-numeric amount is rejected');
 await p.locator('[data-testid=bill]').first().locator('button').click(); await p.waitForTimeout(1200); assert((await q('select count(*)::int c from utility_bills'))[0].c===3,'a bill can be deleted');

 // ---------------- move-out pack
 await p.goto(BASE+'/dashboard/pack'); assert(await p.locator('a:has-text("Download pack")').count()===1,'owner sees the pack page');
 await p.check('text=Trusted contractors'); assert((await p.locator('a:has-text("Download pack")').getAttribute('href')).includes('contractors=1'),'options change the download link');
 await q("with c as (insert into contractors(name,trade) values ('Pack Plumber','Plumber') returning id) insert into contractor_homes(contractor_id,household_id) select id,$1 from c",[hid]);
 const res=await ctx.request.get(BASE+'/api/pack?contractors=1'); assert(res.status()===200 && /zip/.test(res.headers()['content-type']),'pack downloads as a zip');
 const files=unzipSync(new Uint8Array(await res.body())); const names=Object.keys(files);
 assert(['README.txt','summary.html','assets.csv','service-history.csv','contractors.csv'].every(n=>names.includes(n)),`zip has the summary and spreadsheets (${names.join(', ')})`);
 assert(/Sink/.test(strFromU8(files['assets.csv'])) && /Fixed leak/.test(strFromU8(files['service-history.csv'])) && /Pack Plumber/.test(strFromU8(files['summary.html'])),'zip contents match the home');
 const plain=unzipSync(new Uint8Array(await (await ctx.request.get(BASE+'/api/pack')).body())); assert(!('contractors.csv' in plain) && !/Pack Plumber/.test(strFromU8(plain['summary.html'])),'contractors are left out unless chosen');
 assert(!/una@test\.dev|vic@test\.dev/.test(strFromU8(plain['summary.html'])+strFromU8(plain['assets.csv'])),'no member e-mail addresses in the pack');
 const sum=await ctx.request.get(BASE+'/api/pack/summary'); assert(sum.status()===200 && /text\/html/.test(sum.headers()['content-type']) && /Print \/ save as PDF/.test(await sum.text()),'printable summary page works');
 assert((await (await browser.newContext()).request.get(BASE+'/api/pack')).status()===401,'pack needs sign-in');
 // a plain member can't pull the pack
 const vid=(await q("select id from profiles where email='vic@test.dev'"))[0].id; await q("insert into household_members(household_id,user_id,role) values ($1,$2,'member')",[hid,vid]);
 const vctx=await sess('vic@test.dev'); await (await vctx.newPage()).goto(BASE+'/dashboard'); await vctx.addCookies([{name:'homeops_home',value:hid,url:BASE}]);
 assert((await vctx.request.get(BASE+'/api/pack')).status()===403,'a plain member is refused (403)');
 assert((await q("select count(*)::int c from audit_log where action='pack.download'"))[0].c>=1,'pack downloads are written to the audit log');

 // ---------------- More hub + phone
 const mob=await sess('una@test.dev',{width:390,height:844}); const mp=await mob.newPage(); await mp.goto(BASE+'/dashboard');
 assert(await mp.locator('nav[aria-label=Primary].fixed a, nav[aria-label=Primary] a').filter({hasText:'More'}).count()>=1,'phone tab bar has a More tab');
 await mp.locator('nav[aria-label=Primary] a:has-text("More")').last().click(); await mp.waitForURL(/\/dashboard\/more/);
 for(const t of ['Document vault','Contractors','Utility bills','Spending','Move-out pack','QR labels']) assert(await mp.locator(`a:has-text("${t}")`).count()>=1,`More lists ${t}`);
 for(const path of ['/dashboard/contractors','/dashboard/documents','/dashboard/bills','/dashboard/pack','/dashboard/more']){ await mp.goto(BASE+path); assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${path}: no horizontal scrolling on a phone`); }
 await mp.goto(BASE+'/dashboard/more'); await mp.screenshot({path:S+'/more-phone.png'});
 await p.goto(BASE+'/dashboard'); assert(await p.locator('aside a:has-text("Contractors")').count()===1 && await p.locator('aside a:has-text("Documents")').count()===1,'desktop sidebar links to the new sections');
 // WhatsApp reminders are "coming soon" unless switched on: no number is collected
 await p.goto(BASE+'/dashboard/settings/notifications'); assert(await p.locator('[data-testid=whatsapp-soon]:has-text("Coming soon")').count()===1 && await p.locator('input[name=phone]').count()===0,'Settings shows WhatsApp reminders as coming soon, with no number field');
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})();
