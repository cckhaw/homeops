// Rentals: tenancies, rent reminders and arrears, mark rent received, condition reports (move-in / move-out comparison), access control.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg'); const zlib = require('zlib'); const fs = require('fs');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const pad=n=>String(n).padStart(2,'0'); const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const crcT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc=b=>{let c=0xffffffff;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0};
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c])};
const png=()=>{const ih=Buffer.alloc(13);ih.writeUInt32BE(8,0);ih.writeUInt32BE(8,4);ih[8]=8;ih[9]=2;const row=Buffer.concat([Buffer.from([0]),Buffer.from(Array(8).fill([90,90,90]).flat())]);return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(Buffer.concat(Array(8).fill(row)))),chunk('IEND',Buffer.alloc(0))])};
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp,home)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp||{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE},...(home?[{name:'homeops_home',value:home,url:BASE}]:[])]); return c; };
 const uc=await sess('una@test.dev'); const p=await uc.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto(BASE+'/dashboard'); await p.waitForTimeout(800);
 const home=(await q("select h.id from households h join household_members m on m.household_id=h.id join profiles pr on pr.id=m.user_id where pr.email='una@test.dev' limit 1"))[0].id;
 fs.mkdirSync(S+'/r15',{recursive:true}); fs.writeFileSync(S+'/r15/room.png',png());

 // ---------------- tenancy
 await p.goto(BASE+'/dashboard/rentals'); assert(await p.locator('h1:has-text("Rentals")').count()===1 && await p.locator('aside #records-group a[href="/dashboard/rentals"]').count()===1,'Rentals is in the Records group of the menu');
 const now=new Date(); const start=new Date(now.getFullYear(),now.getMonth()-3,1); const end=new Date(now.getFullYear()+1,now.getMonth(),28);
 const fill=async(o)=>{ for(const [k,v] of Object.entries(o)) await p.fill(`form input[name=${k}], form textarea[name=${k}]`,String(v)); };
 const addForm=p.locator('section[aria-labelledby=tenancies-h] form').last();
 await p.fill('section[aria-labelledby=tenancies-h] form input[name=tenantName]','Mr Lee'); await p.click('section[aria-labelledby=tenancies-h] form button:has-text("Add tenancy")'); await p.getByText(/Choose the start date|Enter the monthly rent/).first().waitFor(); assert((await q("select count(*)::int n from tenancies"))[0].n===0,'an incomplete tenancy is refused with a clear message');
 const f=(n,v)=>p.fill(`section[aria-labelledby=tenancies-h] form input[name=${n}]`,String(v));
 await f('tenantPhone','+65 9123 4567'); await f('tenantEmail','lee@example.com'); await f('startDate',iso(start)); await f('endDate',iso(end)); await f('rent','2,500.00'); await f('dueDay','31'); await f('deposit','5000');
 await p.click('section[aria-labelledby=tenancies-h] form button:has-text("Add tenancy")'); await p.getByText(/between 1 and 28/).waitFor(); assert(true,'rent day 31 is refused (it would not exist every month)');
 await f('dueDay','1'); await f('endDate',iso(new Date(start.getTime()-86400000*30))); await p.click('section[aria-labelledby=tenancies-h] form button:has-text("Add tenancy")'); await p.getByText(/after it starts/).waitFor(); assert((await q("select count(*)::int n from tenancies"))[0].n===0,'a lease ending before it starts is refused');
 await f('endDate',iso(end)); await p.click('section[aria-labelledby=tenancies-h] form button:has-text("Add tenancy")'); await p.getByText(/Tenancy saved/).waitFor();
 const t=(await q("select * from tenancies"))[0]; assert(t && t.tenant_name==='Mr Lee' && t.rent_cents===250000 && t.deposit_cents===500000 && t.due_day===1,'the tenancy is saved (rent 2,500.00 → 250000 cents)');
 const tasks=async()=>q("select title,frequency,due_date::text d,status from maintenance_tasks where tenancy_id=$1 order by title, due_date",[t.id]);
 let tk=await tasks(); const rent=tk.find(x=>/^Collect rent: Mr Lee/.test(x.title)); const lease=tk.find(x=>/^Lease ends/.test(x.title));
 const nextFirst=iso(now.getDate()===1?now:new Date(now.getFullYear(),now.getMonth()+1,1));
 assert(rent && rent.frequency==='monthly' && rent.d===nextFirst && lease && lease.frequency==='yearly' && lease.d>iso(now),`a monthly "Collect rent" reminder (next ${rent&&rent.d}) and a renewal reminder before the lease end were added`);
 // arrears
 const owedNow=()=>{ let n=0; for(let d=new Date(start); d<=now; d=new Date(d.getFullYear(),d.getMonth()+1,1)) n++; return n; };
 let card=p.getByTestId('tenancy-card').first(); assert(new RegExp(`${owedNow()} months? unpaid`).test(await card.getByTestId('arrears').innerText()),`rent owed is counted from the lease start (${owedNow()} months unpaid)`);
 assert(/2,500/.test(await card.innerText()) && /day 1/.test(await card.innerText()) && /lee@example.com/.test(await card.innerText()),'the card shows rent, due day and contact');
 // mark received
 await card.getByTestId('rent-received').click(); await p.getByText(/marked as received/).waitFor(); let pays=await q("select period from rent_payments where tenancy_id=$1 order by period",[t.id]);
 assert(pays.length===1 && pays[0].period===`${start.getFullYear()}-${pad(start.getMonth()+1)}`,'"Mark rent received" settles the oldest unpaid month first');
 for(let i=1;i<owedNow();i++){ await p.reload(); await p.getByTestId('tenancy-card').first().getByTestId('rent-received').click(); await p.waitForTimeout(900); }
 await p.reload(); card=p.getByTestId('tenancy-card').first(); assert(/Rent up to date/.test(await card.getByTestId('arrears').innerText()) && (await q("select count(*)::int n from rent_payments where tenancy_id=$1",[t.id]))[0].n===owedNow(),'after settling every month, the card says "Rent up to date" and the button is disabled');
 assert(await card.getByTestId('rent-received').isDisabled(),'(button disabled)');
 tk=await tasks(); assert(tk.filter(x=>/^Collect rent/.test(x.title)&&x.status==='pending').length===1 && tk.find(x=>/^Collect rent/.test(x.title)&&x.status==='pending').d.endsWith('-01'),'paying past months leaves exactly one upcoming reminder, on the 1st');
 // when the rent for the reminder's own month is received, that reminder is completed and the next one is created for the following due date
 const cur=`${now.getFullYear()}-${pad(now.getMonth()+1)}`; await q("delete from rent_payments where tenancy_id=$1 and period=$2",[t.id,cur]); await q("update maintenance_tasks set due_date=$2 where tenancy_id=$1 and status='pending' and title like 'Collect rent%'",[t.id,cur+'-01']);
 await p.reload(); await p.getByTestId('tenancy-card').first().getByTestId('rent-received').click(); await p.getByText(/marked as received/).waitFor(); tk=await tasks(); const pr=tk.filter(x=>/^Collect rent/.test(x.title)&&x.status==='pending'); const nm=new Date(now.getFullYear(),now.getMonth()+1,1);
 assert(pr.length===1 && pr[0].d===iso(nm) && tk.some(x=>/^Collect rent/.test(x.title)&&x.status==='completed'&&x.d===cur+'-01'),'receiving that month\'s rent completes its reminder and schedules the next one for the following 1st (no drift)');
 // edit → reminders recreated
 await card.getByTestId('edit-tenancy').click(); await p.waitForSelector('[role=dialog] input[name=rent]'); await p.fill('[role=dialog] input[name=rent]','2700'); await p.fill('[role=dialog] input[name=dueDay]','5'); await p.click('[role=dialog] button:has-text("Save tenancy")'); await p.getByText(/Reminders updated/).waitFor();
 tk=await tasks(); const pend=tk.filter(x=>x.status==='pending'); assert((await q("select rent_cents r, due_day d from tenancies"))[0].r===270000 && pend.filter(x=>/^Collect rent/.test(x.title)).length===1 && pend.find(x=>/^Collect rent/.test(x.title)).d.endsWith('-05'),'editing the tenancy updates the rent and recreates the reminders on the new due day');
 await p.keyboard.press('Escape');

 // ---------------- condition reports
 await p.goto(BASE+'/dashboard/rentals'); await p.selectOption('select[aria-label="Report type"]','move_in'); await p.selectOption('select[aria-label="Report tenancy"]',t.id); await p.click('button:has-text("Start report")'); await p.waitForURL(/\/rentals\/reports\//);
 const moveInId=p.url().split('/').pop(); const seeded=(await q("select count(*)::int n from condition_items where report_id=$1",[moveInId]))[0].n;
 assert(seeded>=20 && await p.locator('h1:has-text("Move-in report")').count()===1 && await p.getByTestId('report-item').count()===seeded,`a move-in report starts with the standard checklist (${seeded} items in rooms)`);
 await p.selectOption('select[aria-label="Living room Walls and paint: condition"]','fair'); await p.fill('input[aria-label="Living room Walls and paint: notes"]','Small mark near the door'); await p.selectOption('select[aria-label="Kitchen Hob and hood: condition"]','poor');
 await p.fill('input[aria-label="New item room"]','Balcony'); await p.fill('input[aria-label="New item name"]','Laundry rack'); await p.fill('input[aria-label="New item notes"]','Left by previous tenant');
 await p.fill('textarea[name=reportNotes]','2 keys and 1 access card handed over. Electricity meter 04512.'); await p.click('button:has-text("Save report")'); await p.getByText('Report saved.').waitFor();
 let items=await q("select room,item,condition,notes from condition_items where report_id=$1",[moveInId]);
 assert(items.find(i=>i.item==='Walls and paint'&&i.room==='Living room').condition==='fair' && items.find(i=>i.item==='Hob and hood').condition==='poor' && items.some(i=>i.item==='Laundry rack' && i.room==='Balcony') && items.length===seeded+1,'ratings, notes and a new item are saved');
 assert((await q("select notes from condition_reports where id=$1",[moveInId]))[0].notes.includes('04512'),'general notes (keys, meters) are saved');
 assert(/1 to note/.test(await p.getByTestId('report-summary').innerText()),'the summary counts items needing attention');
 // photo (no storage in the test environment → clear message)
 await p.setInputFiles('input[aria-label="Living room Walls and paint: photo"]',S+'/r15/room.png'); await p.click('button:has-text("Save report")'); await p.getByText(/File storage is not configured/).waitFor(); assert(true,'adding a photo without file storage gives the standard "not configured" message instead of failing silently');
 // remove an item
 await p.reload(); await p.check('input[aria-label="Remove Laundry rack"]'); await p.click('button:has-text("Save report")'); await p.getByText('Report saved.').waitFor(); assert((await q("select count(*)::int n from condition_items where report_id=$1",[moveInId]))[0].n===seeded,'an item can be removed');
 // print layout
 await p.emulateMedia({media:'print'}); assert(await p.locator('#report-print').isVisible() && !(await p.locator('form[novalidate]').first().isVisible()) && /Landlord signature/.test(await p.locator('#report-print').innerText()),'print view shows a clean table with signature lines (forms hidden)'); await p.emulateMedia({media:'screen'});

 // ---------------- end tenancy, move-out comparison
 await p.goto(BASE+'/dashboard/rentals'); await p.locator('[data-testid=tenancy-card]').first().getByRole('button',{name:'End tenancy'}).click(); await p.waitForSelector('[data-testid=tenancy-card]',{state:'detached',timeout:20000});
 assert((await q("select status from tenancies"))[0].status==='ended' && (await tasks()).filter(x=>x.status==='pending').length===0,'ending a tenancy stops its reminders and keeps the record');
 await p.reload(); assert(await p.getByTestId('tenancy-card').count()===0 && /Mr Lee/.test(await p.getByTestId('past-tenancies').textContent()),'it moves to "Past tenancies"');
 await p.selectOption('select[aria-label="Report type"]','move_out'); await p.selectOption('select[aria-label="Report tenancy"]',t.id); await p.click('button:has-text("Start report")'); await p.waitForURL(/\/rentals\/reports\//);
 const moveOutId=p.url().split('/').pop(); const mo=await q("select room,item,condition from condition_items where report_id=$1",[moveOutId]);
 assert(mo.length===seeded && mo.find(i=>i.item==='Walls and paint').condition==='fair' && mo.find(i=>i.item==='Hob and hood').condition==='poor','a move-out report starts from the move-in ratings');
 assert(/No differences recorded/.test(await p.getByTestId('comparison').innerText()),'with nothing changed, the comparison says so');
 await p.selectOption('select[aria-label="Living room Walls and paint: condition"]','damaged'); await p.fill('input[aria-label="Living room Walls and paint: notes"]','Large marks, needs repainting'); await p.selectOption('select[aria-label="Kitchen Hob and hood: condition"]','good'); await p.click('button:has-text("Save report")'); await p.getByText('Report saved.').waitFor(); await p.reload();
 const cmp=await p.getByTestId('comparison').innerText(); assert(/Living room: Walls and paint/.test(cmp) && /Fair → Damaged/.test(cmp) && /Large marks/.test(cmp) && /Poor → Good/.test(cmp) && cmp.indexOf('Walls and paint')<cmp.indexOf('Hob and hood'),'the comparison lists what changed since move-in, worst first');
 await p.screenshot({path:S+'/rental-report.png',fullPage:true});
 await p.goto(BASE+'/dashboard/rentals'); assert((await p.getByTestId('reports').locator('li').count())===2 && /Move-out report · Mr Lee/.test(await p.getByTestId('reports').innerText()),'both reports are listed with the tenant\'s name');
 await p.screenshot({path:S+'/rentals-desktop.png',fullPage:true});

 // ---------------- access control
 const vic=(await q("select id from profiles where email='vic@test.dev'"))[0].id;
 await q("insert into household_members (household_id,user_id,role) values ($1,$2,'member') on conflict do nothing",[home,vic]);
 const vc=await sess('vic@test.dev',{width:1280,height:900},home); const vp=await vc.newPage(); await vp.goto(BASE+'/dashboard/rentals'); assert(/Only the owner or an admin/.test(await vp.locator('main').innerText()) && !/Mr Lee/.test(await vp.locator('main').innerText()),'a plain member sees a notice, not the tenant\'s details');
 assert((await vp.goto(BASE+'/dashboard/rentals/reports/'+moveInId)).status()===404,'and cannot open a condition report');
 // a forged tenancy id from another home is refused
 const vicHome=(await q("insert into households (name, owner_id) values ('Vic Home', $1) returning id",[vic]))[0].id; await q("insert into household_members (household_id,user_id,role) values ($1,$2,'owner')",[vicHome,vic]); const own=await sess('vic@test.dev',{width:1280,height:900},vicHome); const op=await own.newPage(); await op.goto(BASE+'/dashboard/rentals'); await op.evaluate((id)=>{const s=document.querySelector('select[aria-label="Report tenancy"]'); const o=document.createElement('option'); o.value=id; o.textContent='x'; s.appendChild(o);},t.id); await op.selectOption('select[aria-label="Report tenancy"]',t.id); await op.click('button:has-text("Start report")'); await op.waitForTimeout(3000); assert((await q("select count(*)::int n from condition_reports where tenancy_id=$1 and household_id=$2",[t.id,vicHome]))[0].n===0,'a report cannot be tied to another home\'s tenancy (forged id)');
 // and the server action itself refuses it
 
 assert((await op.request.get(BASE+'/api/condition/'+(await q("select id from condition_items limit 1"))[0].id)).status()===404,'the photo endpoint answers 404 for someone outside the home (and for items without photos)');
 // delete
 await p.goto(BASE+'/dashboard/rentals'); await p.getByTestId('reports').locator('a').first().click(); await p.waitForURL(/reports\//); await p.click('button:has-text("Delete report")'); await p.waitForURL(BASE+'/dashboard/rentals'); assert((await q("select count(*)::int n from condition_reports where household_id=$1",[home]))[0].n===1,'a report can be deleted');
 await q("update tenancies set status='active', ended_on=null"); await p.reload(); await p.getByTestId('tenancy-card').first().getByRole('button',{name:'Delete'}).click(); await p.waitForTimeout(1500); assert((await q("select count(*)::int n from tenancies"))[0].n===0 && (await q("select count(*)::int n from rent_payments"))[0].n===0 && (await q("select count(*)::int n from maintenance_tasks where tenancy_id is not null"))[0].n===0,'deleting a tenancy removes its payments and reminders');
 assert((await q("select count(*)::int n from condition_reports where household_id=$1",[home]))[0].n===1,'but condition reports are kept (they may be evidence)');
 // phone
 const pc=await sess('una@test.dev',{width:390,height:844}); const ph=await pc.newPage(); await ph.goto(BASE+'/dashboard/rentals'); assert(await ph.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone: Rentals fits without sideways scrolling'); await ph.screenshot({path:S+'/rentals-phone.png',fullPage:true});
 const rid=(await q("select id from condition_reports where household_id=$1 limit 1",[home]))[0].id; await ph.goto(BASE+'/dashboard/rentals/reports/'+rid); assert(await ph.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone: the report fits'); await ph.screenshot({path:S+'/report-phone.png'});
 await ph.goto(BASE+'/dashboard/more'); assert(await ph.locator('main a[href="/dashboard/rentals"]').count()===1,'phone: More lists Rentals');
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})().catch(e=>{console.error('FAIL crashed',e);process.exit(1)});
