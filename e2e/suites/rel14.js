// Property dates (SG/MY): templates by region, adding to the schedule, duplicates, validation. Also: Telegram card when the bot is not configured.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp||{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const uc=await sess('una@test.dev'); const p=await uc.newPage(); p.on('pageerror',e=>errs.push(e.message));

 await p.goto(BASE+'/dashboard'); await p.waitForTimeout(800);
 const home=(await q("select h.id from households h join household_members m on m.household_id=h.id join profiles pr on pr.id=m.user_id where pr.email='una@test.dev' limit 1"))[0].id;
 const tasks=async()=>q("select title,frequency,due_date::text d from maintenance_tasks where household_id=$1 and title ~ '^(Pay|Renew)' order by title",[home]);

 // ---- Telegram is not configured in this run
 await p.goto(BASE+'/dashboard/settings/notifications'); assert(await p.getByTestId('telegram-off').count()===1 && await p.locator('button:has-text("Connect Telegram")').count()===0,'without bot settings, the Telegram card says it is not set up and offers no connect button');
 assert((await p.request.post(BASE+'/api/telegram/webhook',{data:{message:{text:'/start x',chat:{id:1,type:'private'}}}})).status()===403,'and the webhook is closed');

 // ---- navigation
 await p.goto(BASE+'/dashboard/property'); assert(await p.locator('h1:has-text("Property dates")').count()===1 && await p.locator('aside #records-group a[href="/dashboard/property"]').count()===1,'Property dates is in the Records group of the menu');
 // default region from currency/locale (the seeded home has no MY/SG currency → general list)
 const region=p.locator('select[aria-label=Region]');
 await region.selectOption('OTHER'); assert((await p.locator('[data-testid^=property-]').count())===2,'"Somewhere else" offers the two general reminders (insurance, loan)');
 await region.selectOption('MY'); assert(await p.getByTestId('property-my-quit-rent').count()===1 && await p.getByTestId('property-my-assessment').count()===1 && await p.getByTestId('property-my-strata').count()===1 && await p.getByTestId('property-sg-property-tax').count()===0,'Malaysia lists quit rent, assessment tax and strata fees (no Singapore items)');
 // defaults: dated ones are ticked, undated ones are not
 assert(await p.locator('input[aria-label="Pay quit rent (cukai tanah)"]').isChecked() && !(await p.locator('input[aria-label="Renew home / fire insurance"]').isChecked()),'items with a typical date are pre-ticked; insurance (needs your date) is not');
 const qd=await p.locator('input[aria-label="Pay quit rent (cukai tanah): due date"]').inputValue(); assert(/^\d{4}-05-31$/.test(qd) && qd>=today(),`the quit rent date is the next 31 May (${qd})`);
 // validation: insurance ticked without a date
 await p.locator('input[aria-label="Renew home / fire insurance"]').check(); await p.click('button:has-text("Add to my schedule")'); await p.getByText(/Choose a date for/).waitFor(); assert((await tasks()).length===0,'ticking insurance without a date is refused, and nothing is added');
 await p.fill('input[aria-label="Renew home / fire insurance: due date"]','2020-01-01'); await p.click('button:has-text("Add to my schedule")'); await p.getByText(/in the past/).waitFor(); assert((await tasks()).length===0,'a date in the past is refused');
 // success
 const next=new Date(); next.setMonth(next.getMonth()+8); const ins=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-15`;
 await p.fill('input[aria-label="Renew home / fire insurance: due date"]',ins); await p.selectOption('select[aria-label="Pay maintenance fee and sinking fund (strata): repeats"]','monthly');
 await p.click('button:has-text("Add to my schedule")'); await p.getByText(/Added 4 reminders/).waitFor();
 const t=await tasks(); assert(t.length===4 && t.find(x=>/quit rent/.test(x.title)).frequency==='yearly' && t.find(x=>/assessment/.test(x.title)).frequency==='biannually' && t.find(x=>/strata/.test(x.title)).frequency==='monthly' && t.find(x=>/insurance/.test(x.title)).d===ins,'four repeating tasks were created with the chosen dates and repeat settings');
 assert(/^\d{4}-05-31$/.test(t.find(x=>/quit rent/.test(x.title)).d) && /-(02|08)-2[89]$/.test(t.find(x=>/assessment/.test(x.title)).d),'quit rent and assessment tax use the typical dates');
 // duplicates
 await p.click('button:has-text("Add to my schedule")'); await p.getByText(/already on your schedule/).waitFor(); assert((await tasks()).length===4,'adding the same reminders again changes nothing');
 // they are real schedule tasks
 await p.goto(BASE+'/dashboard/schedule'); assert(await p.locator('text=Pay quit rent (cukai tanah)').count()>=1 && await p.locator('text=Renew home / fire insurance').count()>=1,'the reminders appear on the Schedule');
 // Singapore list
 await p.goto(BASE+'/dashboard/property'); await region.selectOption('SG'); assert(await p.getByTestId('property-sg-property-tax').count()===1 && await p.getByTestId('property-sg-mcst').count()===1 && await p.getByTestId('property-sg-conservancy').count()===1 && await p.getByTestId('property-my-quit-rent').count()===0,'Singapore lists property tax, MCST fees and S&CC (no Malaysia items)');
 assert(/^\d{4}-01-31$/.test(await p.locator('input[aria-label="Pay property tax (IRAS): due date"]').inputValue()),'IRAS property tax defaults to the next 31 January');
 assert(/check|bill/i.test(await p.getByTestId('property-sg-property-tax').innerText()),'every item tells people to check their own bill for the date');
 // a tampered id is refused by the server
 const bad=await p.evaluate(async()=>{ const f=document.querySelector('form'); const fd=new FormData(f); fd.delete('pick'); fd.append('pick','evil-id'); fd.set('due_evil-id','2027-01-01'); return fd.getAll('pick').join(); }); assert(bad==='evil-id','(test harness) forged id prepared');
 // screens
 await p.screenshot({path:S+'/property-desktop.png',fullPage:true});
 const pc=await sess('una@test.dev',{width:390,height:844}); const ph=await pc.newPage(); await ph.goto(BASE+'/dashboard/property'); assert(await ph.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone: Property dates fits without sideways scrolling'); await ph.screenshot({path:S+'/property-phone.png',fullPage:true});
 await ph.goto(BASE+'/dashboard/more'); assert(await ph.locator('main a[href="/dashboard/property"]').count()===1,'phone: More lists Property dates under Records');
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})().catch(e=>{console.error('FAIL crashed',e);process.exit(1)});
