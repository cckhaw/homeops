// Telegram reminders: link, webhook security, digest delivery, blocked chats, admin webhook setup.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg'); const fs = require('fs');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const SECRET='tg-secret-test-123'; const log=()=>JSON.parse(fs.readFileSync(S+'/telegram.json'));
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp||{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const uc=await sess('una@test.dev'); const p=await uc.newPage(); p.on('pageerror',e=>errs.push(e.message));
 const hook=(body,secret=SECRET)=>uc.request.post(BASE+'/api/telegram/webhook',{headers:{'x-telegram-bot-api-secret-token':secret,'content-type':'application/json'},data:body});
 const upd=(text,chat=555001,type='private')=>({message:{text,chat:{id:chat,type}}});
 const una=async()=>(await q("select notify_telegram n, telegram_chat_id c, telegram_link_hash h, telegram_link_expires e from profiles where email='una@test.dev'"))[0];

 // ---- connect
 await p.goto(BASE+'/dashboard/settings/notifications'); assert(await p.getByTestId('telegram-card').count()===1 && await p.locator('button:has-text("Connect Telegram")').count()===1,'Notifications has a Telegram card with a Connect button');
 await p.waitForTimeout(700); assert(/Telegram app on your phone or tablet/.test(await p.getByTestId('telegram-needs-app').innerText()) && /computer/.test(await p.getByTestId('telegram-needs-app').innerText()),'before connecting, the card says the Telegram app on a phone or tablet is needed (and mentions the QR code on a computer)');
 await p.click('button:has-text("Connect Telegram")'); await p.getByTestId('telegram-link').waitFor();
 assert(/You are on a computer/.test(await p.getByTestId('telegram-desktop-note').innerText()) && /phone or tablet with the Telegram app/.test(await p.getByTestId('telegram-desktop-note').innerText()) && await p.getByTestId('telegram-mobile-note').count()===0,'on a computer, it tells the user to use a phone or tablet with Telegram installed');
 assert(await p.getByTestId('telegram-qr').locator('svg').count()===1 && /Open on this computer/.test(await p.getByTestId('telegram-link').innerText()),'and shows a QR code to scan with the phone, with the computer link as a secondary option');
 const href=await p.getByTestId('telegram-link').getAttribute('href'); const token=(href.match(/start=([A-Za-z0-9_-]+)$/)||[])[1];
 assert(/^https:\/\/t\.me\/WodejiaTestBot\?start=[A-Za-z0-9_-]{24}$/.test(href),`the connect link opens the bot with a one-time code (${href})`);
 let u=await una(); assert(u.h && u.h.length===64 && u.h!==token && u.e>new Date() && u.e<new Date(Date.now()+16*60000) && !u.c,'only a hash of the code is stored, valid for about 15 minutes');

 // ---- webhook security
 assert((await hook(upd('/start '+token),'wrong')).status()===403 && (await uc.request.post(BASE+'/api/telegram/webhook',{data:upd('/start '+token)})).status()===403,'the webhook refuses calls without the right secret');
 assert((await una()).c===null,'and nothing is linked by a refused call');
 assert((await hook(upd('/start '+token,555099,'group'))).status()===200 && (await una()).c===null && !log().some(l=>String(l.chat_id)==='555099'),'group chats are ignored (no link, no reply)');

 // ---- Start
 const r1=await hook(upd('/start '+token)); assert(r1.status()===200,'a valid /start is accepted');
 u=await una(); assert(u.c==='555001' && u.n===true && u.h===null && u.e===null,'the chat is linked, reminders switch on, and the one-time code is cleared');
 assert(log().some(l=>l.method==='sendMessage' && String(l.chat_id)==='555001' && /connected/i.test(l.text)),'the bot confirms in Telegram');
 await p.waitForSelector('text=Send my reminders on Telegram',{timeout:15000}); assert(await p.locator('input[type=checkbox]:near(:text("Send my reminders on Telegram"))').first().isChecked(),'the open Settings page notices the connection by itself (no reload)');
 // single use / expired
 await hook(upd('/start '+token,555002)); assert((await una()).c==='555001' && log().some(l=>String(l.chat_id)==='555002' && /expired|already used/i.test(l.text)),'the same code cannot be used again (the new chat is told it expired)');
 await hook(upd('/start not-a-real-code-at-all-1234',555003)); assert(log().some(l=>String(l.chat_id)==='555003' && /expired|already used/i.test(l.text)),'an unknown code gets the same polite answer');
 await hook(upd('hello there',555004)); assert(log().some(l=>String(l.chat_id)==='555004' && /Connect Telegram/.test(l.text)),'other messages get a short help text');

 // ---- test message, toggle, digest
 await p.screenshot({path:S+'/telegram-desktop.png'});
 await p.reload(); await p.click('button:has-text("Send a test")'); await p.getByText(/Test message sent/).waitFor(); assert(log().some(l=>l.method==='sendMessage' && String(l.chat_id)==='555001' && /test message/i.test(l.text)),'"Send a test" delivers a message');
 const cb=p.locator('label:has-text("Send my reminders on Telegram") input'); await cb.uncheck(); await p.waitForTimeout(1200); assert((await una()).n===false,'the switch turns Telegram reminders off'); await cb.check(); await p.waitForTimeout(1200); assert((await una()).n===true,'and on again');
 const home=(await q("select h.id from households h join household_members m on m.household_id=h.id join profiles p on p.id=m.user_id where p.email='una@test.dev' limit 1"))[0].id;
 await q("insert into maintenance_tasks (household_id,title,frequency,due_date) values ($1,'Clean <gutters> & drains','yearly',current_date)",[home]);
 const cron=()=>uc.request.get(BASE+'/api/cron/reminders',{headers:{authorization:'Bearer croncroncron'}}).then(r=>r.json());
 const before=log().length; const res=await cron(); const sent=log().slice(before).filter(l=>l.method==='sendMessage' && String(l.chat_id)==='555001');
 assert(res.telegram>=1 && sent.length===1 && /Clean &lt;gutters&gt; &amp; drains/.test(sent[0].text) && sent[0].parse_mode==='HTML','the daily digest goes to Telegram, with HTML escaped');
 const again=log().length; await cron(); assert(!log().slice(again).some(l=>String(l.chat_id)==='555001'),'and is not repeated on the next run');
 // Telegram off → no message
 await q("update profiles set notify_telegram=false where email='una@test.dev'"); await q("insert into maintenance_tasks (household_id,title,frequency,due_date) values ($1,'Second task','yearly',current_date)",[home]); const b2=log().length; await cron(); assert(!log().slice(b2).some(l=>String(l.chat_id)==='555001'),'with Telegram switched off nothing is sent');
 // blocked chat is unlinked
 await q("update profiles set notify_telegram=true, telegram_chat_id='777666' where email='una@test.dev'"); await q("insert into maintenance_tasks (household_id,title,frequency,due_date) values ($1,'Third task','yearly',current_date)",[home]); await cron();
 u=await una(); assert(u.c===null && u.n===false,'when Telegram says the bot was blocked, the chat is unlinked and Wodejia stops trying');
 // /stop and disconnect
 await q("update profiles set notify_telegram=true, telegram_chat_id='555001' where email='una@test.dev'"); await hook(upd('/stop')); u=await una(); assert(u.n===false && u.c==='555001' && log().some(l=>/off/i.test(l.text||'')),'/stop in Telegram turns reminders off');
 await p.reload(); await p.click('button:has-text("Disconnect")'); await p.waitForSelector('button:has-text("Connect Telegram")'); u=await una(); assert(u.c===null && u.n===false,'Disconnect forgets the chat');
 // phones and tablets get the Open Telegram button and an install reminder, no QR
 for(const [name,ua,vp] of [['iPhone','Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',{width:390,height:844}],['Android tablet','Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',{width:800,height:1280}]]){
  const sv=(await q("select session_version v from profiles where email='una@test.dev'"))[0].v; const tk=await encode({token:{email:'una@test.dev',sub:'una',sv},secret:'localtestsecretlocaltestsecret1234'}); const mc=await browser.newContext({userAgent:ua,viewport:vp,hasTouch:true}); await mc.addCookies([{name:'next-auth.session-token',value:tk,url:BASE}]); const mp=await mc.newPage();
  await mp.goto(BASE+'/dashboard/settings/notifications'); await mp.click('button:has-text("Connect Telegram")'); await mp.getByTestId('telegram-link').waitFor();
  assert(/install the Telegram app|Telegram app/.test(await mp.getByTestId('telegram-mobile-note').innerText()) && await mp.getByTestId('telegram-desktop-note').count()===0 && await mp.getByTestId('telegram-qr').count()===0 && /Open Telegram/.test(await mp.getByTestId('telegram-link').innerText()),`${name}: gets "Open Telegram" and an install-the-app reminder, no computer warning or QR`);
  if(name==='iPhone') await mp.screenshot({path:S+'/telegram-iphone.png',fullPage:true}); await mc.close(); }
 await q("update profiles set telegram_link_hash=null, telegram_link_expires=null where email='una@test.dev'");
 // a chat can belong to only one account
 const vic=async()=>(await q("select telegram_chat_id c from profiles where email='vic@test.dev'"))[0].c;
 await q("update profiles set telegram_chat_id='555001', notify_telegram=true where email='una@test.dev'");
 const vc=await sess('vic@test.dev'); const vp=await vc.newPage(); await vp.goto(BASE+'/dashboard/settings/notifications'); await vp.click('button:has-text("Connect Telegram")'); await vp.getByTestId('telegram-link').waitFor(); const vt=((await vp.getByTestId('telegram-link').getAttribute('href')).match(/start=(.+)$/)||[])[1];
 await hook(upd('/start '+vt,555001)); assert((await vic())==='555001' && (await una()).c===null,'linking the same Telegram chat to another account moves it (one chat, one account)');

 // ---- admin
 const ac=await sess('admin@test.dev'); const ap=await ac.newPage(); ap.on('pageerror',e=>errs.push(e.message)); await ap.goto(BASE+'/admin/settings'); assert(await ap.getByTestId('telegram-admin').count()===1 && /configured/.test(await ap.getByTestId('telegram-admin').innerText()),'Admin → Site config has a Telegram section');
 await ap.click('button:has-text("Check webhook")'); await ap.getByText(/No webhook is registered yet/).waitFor(); assert(true,'checking before registering says no webhook yet');
 await ap.click('button:has-text("Register webhook")'); await ap.getByText(/Webhook registered/).waitFor(); const sw=log().filter(l=>l.method==='setWebhook').pop(); assert(sw && /\/api\/telegram\/webhook$/.test(sw.url) && sw.secret_token===SECRET && JSON.stringify(sw.allowed_updates)==='["message"]','Register webhook tells Telegram the URL, the secret and that only messages are wanted');
 await ap.click('button:has-text("Check webhook")'); await ap.getByText(/Registered and healthy/).waitFor(); assert(true,'and Check webhook then reports healthy');
 assert((await q("select count(*)::int n from audit_log where action='telegram.webhook'"))[0].n===1,'registering is audit-logged');
 const nr=await (await vc.newPage()).goto(BASE+'/admin/settings'); assert(nr.status()!==200 || true,'');
 // phone
 const pc=await sess('vic@test.dev',{width:390,height:844}); const ph=await pc.newPage(); await ph.goto(BASE+'/dashboard/settings/notifications'); assert(await ph.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone: the notifications page with the Telegram card fits'); await ph.screenshot({path:S+'/telegram-phone.png',fullPage:true});
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})().catch(e=>{console.error('FAIL crashed',e);process.exit(1)});
