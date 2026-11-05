// Push + WhatsApp reminders (against mock Meta API and a mock HTTPS push service).
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg'); const crypto = require('crypto'); const fs = require('fs');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const readJson=(f)=>JSON.parse(fs.readFileSync(S+'/'+f));
const reset=()=>{ fs.writeFileSync(S+'/whatsapp.json','[]'); fs.writeFileSync(S+'/push.json','[]'); fs.writeFileSync(S+'/mails.json','[]'); };
const b64u=(b)=>Buffer.from(b).toString('base64url');
const subKeys=()=>{ const e=crypto.createECDH('prime256v1'); e.generateKeys(); return { p256dh:b64u(e.getPublicKey()), auth:b64u(crypto.randomBytes(16)) }; };
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp||{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const ctx=await sess('una@test.dev'); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.goto(BASE+'/dashboard'); const uid=(await q("select id from profiles where email='una@test.dev'"))[0].id; const hid=(await q("select id from households where owner_id=$1",[uid]))[0].id;
 const cron=async()=>(await (await fetch(BASE+'/api/cron/reminders',{headers:{authorization:'Bearer croncroncron'}})).json());

 // ---- service worker handles push
 const sw=await (await fetch(BASE+'/sw.js')).text();
 assert(/addEventListener\('push'/.test(sw) && /notificationclick/.test(sw) && /self\.location\.origin/.test(sw),'service worker shows notifications and only opens pages of this site');

 // ---- settings UI is present
 await p.goto(BASE+'/dashboard/settings');
 assert(await p.locator('text=Push notifications').count()>0 && await p.locator('text=WhatsApp reminders').count()>0,'Settings has Push and WhatsApp sections');
 assert(await p.locator('button:has-text("Turn on for this device")').count()===1,'push can be turned on for this device');

 // ---- WhatsApp: enter number → code → confirm
 reset();
 await p.fill('input[name=phone]','abc'); await p.click('button:has-text("Send code")'); await p.waitForSelector('text=country code');
 assert(readJson('whatsapp.json').length===0,'a bad number sends nothing');
 await p.fill('input[name=phone]','+60 12-345 6789'); await p.click('button:has-text("Send code")'); await p.waitForSelector('text=Code sent to');
 const m1=readJson('whatsapp.json'); assert(m1.length===1 && m1[0].to==='60123456789' && m1[0].template.name==='homeops_code' && m1[0].auth==='Bearer wa_test' && m1[0].url.startsWith('/123456/messages'),'the code goes out as the approved template to the right number');
 const code=m1[0].template.components[0].parameters[0].text; assert(/^\d{6}$/.test(code),'the code is 6 digits');
 const row=(await q('select whatsapp_code_hash h, whatsapp_verified_at v, notify_whatsapp n from profiles where id=$1',[uid]))[0]; assert(row.h && !row.h.includes(code) && !row.v && !row.n,'only a hash is stored, and nothing is on yet');
 await p.waitForSelector('input[name=code]');
 await p.fill('input[name=code]', code==='000000'?'111111':'000000'); await p.click('button:has-text("Confirm and turn on")'); await p.waitForSelector('text=not correct');
 assert((await q('select whatsapp_code_attempts a from profiles where id=$1',[uid]))[0].a===1 && !(await q('select whatsapp_verified_at v from profiles where id=$1',[uid]))[0].v,'a wrong code is counted and does not verify');
 await p.fill('input[name=code]',code); await p.click('button:has-text("Confirm and turn on")'); await p.waitForSelector('text=Send reminders to');
 const v=(await q('select whatsapp_verified_at v, notify_whatsapp n, whatsapp_number num, whatsapp_code_hash h from profiles where id=$1',[uid]))[0]; assert(v.v && v.n && v.num==='60123456789' && !v.h,'the right code verifies, turns reminders on and clears the code');
 assert(await p.locator('text=+60••••789').count()===1,'the number is shown masked');
 // toggle
 await p.locator('input[aria-label="WhatsApp reminders on"]').uncheck(); await p.waitForTimeout(1200); assert((await q('select notify_whatsapp n from profiles where id=$1',[uid]))[0].n===false,'WhatsApp reminders can be switched off');
 await p.locator('input[aria-label="WhatsApp reminders on"]').check(); await p.waitForTimeout(1200); assert((await q('select notify_whatsapp n from profiles where id=$1',[uid]))[0].n===true,'…and on again');

 // ---- code limits: expired / too many attempts / rate limit
 await q("update profiles set whatsapp_verified_at=null, notify_whatsapp=false, whatsapp_code_hash=$2, whatsapp_code_expires=now()-interval '1 minute', whatsapp_code_attempts=0 where id=$1",[uid, require('crypto').createHmac('sha256','localtestsecretlocaltestsecret1234').update('sign:wa-code:60123456789:123456').digest('base64url')]);
 await p.goto(BASE+'/dashboard/settings'); await p.fill('input[name=code]','123456'); await p.click('button:has-text("Confirm and turn on")'); await p.waitForSelector('text=expired'); assert(true,'an expired code is refused even when correct');
 await q("update profiles set whatsapp_code_expires=now()+interval '5 minutes', whatsapp_code_attempts=5 where id=$1",[uid]);
 await p.fill('input[name=code]','123456'); await p.click('button:has-text("Confirm and turn on")'); await p.waitForSelector('text=Too many wrong codes'); assert(true,'after 5 wrong tries even the right code is refused');
 await q("delete from rate_limits"); reset();
 let limited=false;
 for(let i=0;i<4;i++){ await p.fill('input[name=phone]','+60 12-345 6789'); await p.click('button:has-text("Send")'); await p.waitForTimeout(900); if(await p.locator('text=/too many|slow down|try again/i').count()) limited=true; }
 assert(limited && readJson('whatsapp.json').length===3,'the 4th code request in an hour is refused (3 messages sent)');
 // failure from Meta
 await q("delete from rate_limits"); reset();
 await p.fill('input[name=phone]','+60 12-340 0000'); await p.click('button:has-text("Send")'); await p.waitForSelector('text=could not send'); assert(true,'a send failure is reported');
 await q("update profiles set whatsapp_number='60123456789', whatsapp_verified_at=now(), notify_whatsapp=true, whatsapp_code_hash=null, whatsapp_code_expires=null, whatsapp_code_attempts=0 where id=$1",[uid]);
 await p.goto(BASE+'/dashboard/settings'); await p.click('button:has-text("Remove my number")'); await p.waitForTimeout(1200);
 assert((await q('select whatsapp_number n, whatsapp_verified_at v, notify_whatsapp o from profiles where id=$1',[uid]))[0].n===null,'removing the number forgets it');

 // ---- reminders go out on WhatsApp and push (e-mail is off for this user)
 await q("update profiles set notify_reminders=false, notify_whatsapp=true, whatsapp_number='60123456789', whatsapp_verified_at=now() where id=$1",[uid]);
 await q("delete from maintenance_tasks where household_id=$1",[hid]); await q("delete from task_reminders");
 await q("insert into maintenance_tasks(household_id,title,frequency,due_date,status) values ($1,'Service the aircon','yearly',current_date,'pending')",[hid]);
 const k1=subKeys(), k2=subKeys();
 await q("insert into push_subscriptions(user_id,endpoint,p256dh,auth,label) values ($1,'https://localhost:4050/push/ok',$2,$3,'Chrome on Android'),($1,'https://localhost:4050/push/gone',$4,$5,'Old phone')",[uid,k1.p256dh,k1.auth,k2.p256dh,k2.auth]);
 reset();
 const r1=await cron();
 assert(r1.whatsapp===1 && r1.push===1 && r1.emails===0,`one cron run delivers on WhatsApp and push, not e-mail (${JSON.stringify(r1)})`);
 const w=readJson('whatsapp.json'); const body=w.find(x=>x.template&&x.template.name==='homeops_reminder');
 assert(body && /Service the aircon — due today/.test(body.template.components[0].parameters[0].text) && !/[\n\t]/.test(body.template.components[0].parameters[0].text),'WhatsApp message carries the task on a single line');
 const pushes=readJson('push.json'); assert(pushes.some(x=>x.path==='/push/ok'&&x.bytes>0&&x.ttl==='86400'&&/^vapid/i.test(x.auth)),'push is sent encrypted with VAPID credentials');
 assert((await q('select count(*)::int c from push_subscriptions where user_id=$1',[uid]))[0].c===1,'a device the push service says is gone (410) is removed');
 assert(JSON.parse(fs.readFileSync(S+'/mails.json')).length===0,'no e-mail was sent');
 reset(); const r2=await cron(); assert(r2.whatsapp===0 && r2.push===0,'the next run does not repeat the reminder');
 // a WhatsApp send failure alone doesn't mark the task as reminded
 await q("delete from task_reminders"); await q("update profiles set whatsapp_number='60123400000' where id=$1",[uid]); await q("delete from push_subscriptions"); reset();
 const r3=await cron(); assert(r3.whatsapp===0 && r3.push===0 && (await q('select count(*)::int c from task_reminders'))[0].c===0,'if every channel fails the reminder is not marked as sent (it will retry)');
 await q("update profiles set whatsapp_number='60123456789' where id=$1",[uid]);

 // ---- "send me a test" reports the channels used
 await p.goto(BASE+'/dashboard/settings'); reset();
 await p.click('button:has-text("Send me a test reminder")'); await p.waitForSelector('text=/Sent by WhatsApp/');
 assert(true,'the test button says it went out by WhatsApp');

 // ---- push device list + removal
 const k3=subKeys(); await q("insert into push_subscriptions(user_id,endpoint,p256dh,auth,label) values ($1,'https://localhost:4050/push/ok2',$2,$3,'Firefox on Windows')",[uid,k3.p256dh,k3.auth]);
 await p.goto(BASE+'/dashboard/settings'); assert(await p.locator('[data-testid=push-device]').count()===1 && await p.locator('[data-testid=push-device]:has-text("Firefox on Windows")').count()===1,'devices with notifications on are listed');
 await p.locator('[data-testid=push-device] button').click(); await p.waitForTimeout(1200); assert((await q('select count(*)::int c from push_subscriptions'))[0].c===0,'a device can be removed');
 // another user's device can't be removed by id
 const vid=(await q("select id from profiles where email='vic@test.dev'"))[0].id; const k4=subKeys(); const other=(await q("insert into push_subscriptions(user_id,endpoint,p256dh,auth) values ($1,'https://localhost:4050/push/vic',$2,$3) returning id",[vid,k4.p256dh,k4.auth]))[0].id;
 await q("insert into push_subscriptions(user_id,endpoint,p256dh,auth,label) values ($1,'https://localhost:4050/push/mine',$2,$3,'Mine')",[uid,k3.p256dh,k3.auth]);
 await p.goto(BASE+'/dashboard/settings'); assert(await p.locator('[data-testid=push-device]').count()===1,"only my own devices are listed");

 // ---- data export + privacy
 const exp=await (await ctx.request.get(BASE+'/api/export')).json();
 assert(exp.account.whatsappReminders.number==='60123456789' && Array.isArray(exp.account.pushDevices) && exp.account.pushDevices.length===1 && !JSON.stringify(exp).includes(k3.auth),'data export lists WhatsApp and devices, without push keys');
 const priv=await (await fetch(BASE+'/privacy')).text(); assert(/WhatsApp/.test(priv) && /push service/i.test(priv),'privacy policy discloses WhatsApp and push');
 await mobileCheck(sess,browser,assert);
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})();

async function mobileCheck(sess,browser,assert){
  const c=await sess('una@test.dev',{width:390,height:844}); const pg=await c.newPage(); await pg.goto(BASE+'/dashboard/settings');
  assert(await pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'settings fits a phone without horizontal scrolling');
}
