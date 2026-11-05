// Contractors that cover more than one home.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const openEdit=async(pg)=>{ const d=pg.locator('details').first(); if(!(await d.evaluate(e=>e.open))) await d.locator('summary').click(); };
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,home)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); if(home) await c.addCookies([{name:'homeops_home',value:home,url:BASE}]); return c; };
 const ctx0=await sess('una@test.dev'); const p0=await ctx0.newPage(); await p0.goto(BASE+'/dashboard');
 const uid=(await q("select id from profiles where email='una@test.dev'"))[0].id, vid=(await q("select id from profiles where email='vic@test.dev'"))[0].id;
 const A=(await q('select id from households where owner_id=$1',[uid]))[0].id;
 await q("update households set name='Main House' where id=$1",[A]);
 const B=(await q("insert into households(name,owner_id,icon) values ('Beach Condo',$1,'condo') returning id",[uid]))[0].id; await q("insert into household_members(household_id,user_id,role) values ($1,$2,'owner')",[B,uid]);
 await ctx0.close();
 const ctx=await sess('una@test.dev',A); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));

 // ---- form offers every home I'm in, current one pre-ticked
 await p.goto(BASE+'/dashboard/contractors');
 assert(await p.locator('fieldset:has-text("Covers these homes") input[name=homeIds]').count()===2,'the add form lists both of my homes');
 assert(await p.locator('fieldset input[name=homeIds][value="'+A+'"]').isChecked() && !(await p.locator('fieldset input[name=homeIds][value="'+B+'"]').isChecked()),'the current home is ticked by default');
 await p.fill('input[name=name]','Ah Seng Plumbing'); await p.fill('input[name=trade]','Plumber');
 await p.locator('fieldset input[name=homeIds][value="'+A+'"]').uncheck({force:true}); await p.click('button:has-text("Add contractor")'); await p.waitForSelector('text=Choose at least one home');
 assert((await q('select count(*)::int c from contractors'))[0].c===0,'at least one home is required');
 await p.locator('label:has(input[value="'+A+'"]) span').click(); await p.locator('label:has(input[value="'+B+'"]) span').click(); await p.click('button:has-text("Add contractor")'); await p.waitForSelector('[data-testid=contractor]');
 const cid=(await q('select id from contractors'))[0].id;
 assert((await q('select household_id h from contractor_homes where contractor_id=$1 order by 1',[cid])).length===2,'one contractor, linked to both homes');
 assert(await p.locator('[data-testid=covers]:has-text("Main House"):has-text("Beach Condo")').count()===1,'the card shows both homes it covers');

 // ---- visible in the other home and usable there
 const ctxB=await sess('una@test.dev',B); const pb=await ctxB.newPage(); await pb.goto(BASE+'/dashboard/contractors');
 assert(await pb.locator('[data-testid=contractor]:has-text("Ah Seng Plumbing")').count()===1,'the contractor also appears in the second home');
 await pb.goto(BASE+'/dashboard/assets'); await pb.click('text=Add asset'); await pb.fill('input[name=name]','Condo sink'); await pb.click('button:has-text("Add to passport")'); await pb.waitForURL(/assets\/[0-9a-f-]{36}/);
 assert(await pb.locator('select[name=contractorId] option:has-text("Ah Seng Plumbing")').count()===1,'and can be picked when logging a repair there');
 await pb.fill('input[name=description]','Fixed tap'); await pb.selectOption('select[name=contractorId]',{label:'Ah Seng Plumbing (Plumber)'}); await pb.click('button:has-text("Add service record")'); await pb.waitForSelector('li:has-text("Fixed tap")');
 assert((await q('select household_id h, contractor_id c from service_records'))[0].h===B,'the repair is recorded against the home it was done in');
 await pb.goto(BASE+'/dashboard/contractors'); assert(await pb.locator('[data-testid=contractor]:has-text("1 job")').count()===1,"job counts are per home");
 await p.goto(BASE+'/dashboard/contractors'); assert(await p.locator('[data-testid=contractor]:has-text("No jobs logged yet")').count()===1,"…the other home doesn't count them");

 // ---- someone who only belongs to one of the homes
 await q("insert into household_members(household_id,user_id,role) values ($1,$2,'member')",[B,vid]);
 const ctxV=await sess('vic@test.dev',B); const pv=await ctxV.newPage(); await pv.goto(BASE+'/dashboard/contractors');
 assert(await pv.locator('[data-testid=contractor]:has-text("Ah Seng Plumbing")').count()===1,'a member of the Beach Condo sees it');
 assert(await pv.locator('[data-testid=covers]').count()===0,"and isn't told the names of homes they aren't in (single-home members see no home chips)");
 await openEdit(pv); await pv.locator('details textarea[name=notes]').fill('Edited by Vic'); await pv.click('details button:has-text("Save changes")'); await pv.waitForTimeout(1200);
 assert((await q('select notes n from contractors where id=$1',[cid]))[0].n==='Edited by Vic' && (await q('select household_id h from contractor_homes where contractor_id=$1',[cid])).length===2,"editing keeps the link to the home they can't see");
 // removing it from the only home Vic belongs to leaves it covering the Main House
 await openEdit(pv); pv.once('dialog',d=>d.accept()); await pv.click('details button:has-text("Delete")'); await pv.waitForTimeout(1200);
 const left=await q('select household_id h from contractor_homes where contractor_id=$1',[cid]); assert(left.length===1 && left[0].h===A && (await q('select count(*)::int c from contractors'))[0].c===1,'deleting from one home keeps the contractor for the other');
 assert((await q('select provider p from service_records'))[0].p==='Ah Seng Plumbing','past repairs keep the name');
 await p.goto(BASE+'/dashboard/contractors'); assert(await p.locator('[data-testid=contractor]:has-text("Ah Seng Plumbing")').count()===1,'the Main House still has it');

 // ---- editing which homes it covers
 await openEdit(p); await p.locator('details label:has(input[value="'+B+'"]) span').click(); await p.click('details button:has-text("Save changes")'); await p.waitForTimeout(1200);
 assert((await q('select household_id h from contractor_homes where contractor_id=$1',[cid])).length===2,'ticking another home adds it');
 await p.goto(BASE+'/dashboard/contractors'); await openEdit(p); await p.locator('details label:has(input[value="'+A+'"]) span').click(); await p.click('details button:has-text("Save changes")'); await p.waitForTimeout(1200);
 const l2=await q('select household_id h from contractor_homes where contractor_id=$1',[cid]); assert(l2.length===1&&l2[0].h===B,'unticking a home removes it');
 await p.goto(BASE+'/dashboard/contractors'); assert(await p.locator('text=No contractors yet').count()===1,'it no longer shows in the home it was removed from');
 // delete from the last home removes it entirely
 await pb.goto(BASE+'/dashboard/contractors'); await openEdit(pb); pb.once('dialog',d=>d.accept()); await pb.click('details button:has-text("Delete")'); await pb.waitForTimeout(1200);
 assert((await q('select count(*)::int c from contractors'))[0].c===0,'deleting from the last home deletes the contractor');

 // ---- orphans are cleaned up by the daily job
 await q("insert into contractors(name,trade) values ('Orphan','Plumber')");
 const cr=await fetch(BASE+'/api/cron/reminders',{headers:{authorization:'Bearer croncroncron'}}); assert(cr.status===200 && (await q("select count(*)::int c from contractors where name='Orphan'"))[0].c===0,'a contractor with no home is removed by the daily clean-up');
 // deleting a home never deletes a contractor another home still uses
 const C=(await q("insert into households(name,owner_id) values ('Temp',$1) returning id",[uid]))[0].id;
 const sid=(await q("insert into contractors(name,trade) values ('Shared','Electrician') returning id"))[0].id; await q("insert into contractor_homes(contractor_id,household_id) values ($1,$2),($1,$3)",[sid,C,A]);
 await q('delete from households where id=$1',[C]); assert((await q('select count(*)::int c from contractors where id=$1',[sid]))[0].c===1 && (await q('select count(*)::int c from contractor_homes where contractor_id=$1',[sid]))[0].c===1,'deleting a home leaves a contractor that other homes still use');
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})();
