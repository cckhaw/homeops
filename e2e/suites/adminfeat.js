const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const fs=require('fs'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const PW='correct horse battery staple';
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const mails=()=>JSON.parse(fs.readFileSync(S+'/mails.json'));
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:{width:1100,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const admin=await sess('admin@test.dev'); const ap=await admin.newPage(); ap.on('pageerror',e=>errs.push(e.message));
 const vic=(await q("select id from profiles where email='vic@test.dev'"))[0].id, una=(await q("select id from profiles where email='una@test.dev'"))[0].id, adm=(await q("select id from profiles where email='admin@test.dev'"))[0].id;
 // give victim a home + asset so deletion has something to erase
 const vctx=await sess('vic@test.dev'); const vp=await vctx.newPage(); await vp.goto(BASE+'/dashboard/assets'); await vp.click('text=Add asset'); await vp.fill('input[name=name]','Victim fridge'); await vp.click('button:has-text("Add to passport")'); await vp.waitForURL(/assets\/[0-9a-f-]{36}/);

 // ---- list + search
 await ap.goto(BASE+'/admin/users'); assert(await ap.locator('a[href^="/admin/users/"]').count()===3,'user list shows every user as a link to a support page');
 await ap.fill('input[aria-label="Search users"]','vic'); await ap.press('input[aria-label="Search users"]','Enter'); await ap.waitForURL(/q=vic/); assert(await ap.locator('a[href^="/admin/users/"]').count()===1 && await ap.locator('text=Vic Victim').count()>0,'search by name/e-mail filters the list');
 await ap.goto(BASE+'/admin/users?q=%25'); assert(await ap.locator('a[href^="/admin/users/"]').count()===0,'a literal "%" search matches nothing (LIKE wildcards are escaped)');
 // ---- detail page
 await ap.goto(BASE+'/admin/users/'+vic); const dt=await ap.textContent('body');
 assert(/vic@test.dev/.test(dt) && /Two-factor/.test(dt) && /Victim fridge|1 assets/.test(dt) && /Last sign-in/.test(dt),'support page shows account facts and homes');
 assert(!/scrypt\$|password_hash|totp_secret/i.test(await ap.content()),'support page never exposes password hashes or 2FA secrets');
 assert((await (await sess('una@test.dev')).request.get(BASE+'/admin/users/'+vic,{maxRedirects:0})).status()===307,'non-admins cannot open a support page');
 assert((await (await browser.newContext()).request.get(BASE+'/admin/audit',{maxRedirects:0})).status()===307,'audit log requires sign-in');

 // ---- suspend: blocks sign-in, ends the live session
 await ap.click('button:has-text("Suspend account")'); await ap.waitForSelector('text=Account suspended'); 
 assert((await q("select suspended_at s from profiles where id=$1",[vic]))[0].s!==null,'suspend recorded');
 await vp.goto(BASE+'/dashboard'); await vp.waitForURL(/\/login/); assert(true,'the suspended user\'s open session stops working immediately');
 const lg=await browser.newContext(); const lp=await lg.newPage(); await lp.goto(BASE+'/login'); await lp.fill('input[type=email]','vic@test.dev'); await lp.locator('input[type=password]').fill(PW); await lp.click('button:has-text("Sign in")'); await lp.waitForSelector('text=suspended'); assert(true,'correct password is refused with a clear "suspended" message');
 await lp.goto(BASE+'/login'); await lp.fill('input[type=email]','vic@test.dev'); await lp.locator('input[type=password]').fill('wrong wrong wrong wrong'); await lp.click('button:has-text("Sign in")'); await lp.waitForSelector('text=Incorrect e-mail or password'); assert(true,'wrong password still gets the generic message (status not revealed)');
 await ap.reload(); await ap.click('button:has-text("Reinstate account")'); await ap.waitForSelector('text=Account reinstated');
 await lp.goto(BASE+'/login'); await lp.fill('input[type=email]','vic@test.dev'); await lp.locator('input[type=password]').fill(PW); await lp.click('button:has-text("Sign in")'); await lp.waitForURL(BASE+'/dashboard'); assert(true,'reinstated user can sign in again');
 assert((await q("select last_login_at l from profiles where id=$1",[vic]))[0].l!==null,'last sign-in time is recorded');

 // ---- lockout + unlock, sign out everywhere, reset e-mail
 await q("update profiles set failed_attempts=5, locked_until=now()+interval '15 minutes' where id=$1",[vic]); await ap.reload(); assert(await ap.locator('text=Locked until').count()>0,'locked account is flagged on the support page');
 await ap.click('button:has-text("Unlock account")'); await ap.waitForSelector('text=Account unlocked'); assert((await q("select failed_attempts f, locked_until l from profiles where id=$1",[vic]))[0].l===null,'unlock clears the lockout');
 await ap.click('button:has-text("Sign out everywhere")'); await ap.waitForSelector('text=All sessions ended'); await lp.goto(BASE+'/dashboard'); await lp.waitForURL(/\/login/); assert(true,'"sign out everywhere" ends the user\'s sessions');
 const mb=mails().length; await ap.click('button:has-text("Send password-reset e-mail")'); await ap.waitForSelector('text=Reset e-mail sent'); const rm=mails().at(-1);
 assert(mails().length===mb+1 && rm.to==='vic@test.dev' && /reset-password\?token=/.test(rm.html),'reset e-mail goes to the user (admin never sets or sees a password)');

 // ---- guards
 await ap.goto(BASE+'/admin/users/'+adm); assert(await ap.locator('button:has-text("Suspend account")').count()===0 && await ap.locator('text=Delete this account').count()===0,'admins cannot suspend or delete their own account from the portal');
 await ap.goto(BASE+'/admin/users/'+una); await ap.click('button:has-text("Make admin")'); await ap.waitForSelector('button:has-text("Remove admin role")');
 await ap.fill('input[aria-label^="Type the e-mail"]','una@test.dev'); ap.once('dialog',d=>d.accept()); await ap.click('button:has-text("Delete account")'); await ap.waitForSelector('text=Remove their admin role'); assert((await q("select count(*)::int n from profiles where id=$1",[una]))[0].n===1,'an admin account cannot be deleted until demoted');
 await ap.click('button:has-text("Remove admin role")'); await ap.waitForSelector('button:has-text("Make admin")');
 // ---- delete with confirmation
 await ap.goto(BASE+'/admin/users/'+vic); ap.once('dialog',d=>d.accept()); await ap.fill('input[aria-label^="Type the e-mail"]','nope@test.dev'); await ap.click('button:has-text("Delete account")'); await ap.waitForSelector('text=Type the user’s e-mail'); assert((await q("select count(*)::int n from profiles where id=$1",[vic]))[0].n===1,'deletion needs the exact e-mail typed');
 ap.once('dialog',d=>d.accept()); await ap.fill('input[aria-label^="Type the e-mail"]','vic@test.dev'); await ap.click('button:has-text("Delete account")'); await ap.waitForSelector('text=Deleted vic@test.dev');
 assert((await q("select count(*)::int n from profiles where id=$1",[vic]))[0].n===0 && (await q("select count(*)::int n from assets where name='Victim fridge'"))[0].n===0,'account and its solo-home data are erased');

 // ---- audit log
 const log=await q("select action, summary, actor_email from audit_log order by created_at"); const acts=log.map(r=>r.action);
 for (const a of ['user.suspend','user.unsuspend','user.unlock','user.signout','user.reset_sent','user.admin_grant','user.admin_revoke','user.delete']) assert(acts.includes(a),`audit log recorded ${a}`);
 assert(log.every(r=>r.actor_email==='admin@test.dev'),'every entry names the acting admin');
 await ap.goto(BASE+'/admin/audit'); assert(await ap.locator('text=Deleted account vic@test.dev').count()>0 && await ap.locator('text=Suspended vic@test.dev').count()>0,'audit page lists the actions, newest first');
 await ap.fill('input[aria-label="Search the audit log"]','suspend'); await ap.press('input[aria-label="Search the audit log"]','Enter'); await ap.waitForURL(/q=suspend/); assert(await ap.locator('text=Deleted account').count()===0 && await ap.locator('text=Suspended').count()>0,'audit log search filters entries');
 // brand + settings audit
 await ap.goto(BASE+'/admin/brands'); await ap.click('button:has-text("Add brand")'); await ap.fill('.fixed input[name=name]','Audit Brand'); await ap.fill('.fixed input[name=domain]','example.org'); await ap.click('.fixed button:has-text("Add brand")'); await ap.waitForSelector('ul li:has-text("Audit Brand")');
 await ap.goto(BASE+'/admin/settings'); await ap.fill('input[name=free_asset_limit]','7'); await ap.click('button:has-text("Save settings")'); await ap.waitForSelector('text=live immediately');
 const acts2=(await q("select action from audit_log")).map(r=>r.action); assert(acts2.includes('brand.create') && acts2.includes('settings.update'),'brand and site-setting changes are audited too');
 await ap.screenshot({path:S+'/admin-audit.png'});
 console.log('page errors:',errs); await browser.close(); await pool.end();
})().catch(e=>{console.error(e);process.exit(1)});
