// Left menu revamp: Dashboard rename, grouped/collapsible menu, tooltips on the three footer icons, edit-home pencil, desktop/tablet/phone fit.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const fits=async(pg,sel)=>pg.evaluate((s)=>{const e=document.querySelector(s); if(!e) return false; const r=e.getBoundingClientRect(); return r.top>=0&&r.left>=0&&r.bottom<=innerHeight+0.5&&r.right<=innerWidth+0.5;},sel);

 // ---------- desktop
 const dc=await sess('admin@test.dev',{width:1440,height:900}); const d=await dc.newPage(); d.on('pageerror',e=>errs.push(e.message));
 await d.goto(BASE+'/dashboard'); await d.waitForSelector('aside nav[aria-label=Primary]');
 const names=await d.locator('aside nav[aria-label=Primary] > a').allInnerTexts(); 
 assert(names[0].trim()==='Dashboard' && !names.some(n=>n.trim()==='Home'),`the first menu item is "Dashboard", not "Home" (${names.join(', ')})`);
 assert(await d.locator('aside a[href="/dashboard"] svg.lucide-layout-dashboard').count()===1,'it has the dashboard icon');
 assert(await d.locator('aside nav[aria-label=Primary] button:has-text("Records")').count()===1 && await d.locator('aside nav[aria-label=Primary] >> text=Account').count()===1,'the menu has Records and Account groups');
 // records collapse
 assert(await d.locator('#records-group a').count()===5,'Records lists five pages');
 await d.click('aside button:has-text("Records")'); assert(await d.locator('#records-group').count()===0 || !(await d.locator('#records-group a').first().isVisible().catch(()=>false)),'Records collapses');
 await d.reload(); await d.waitForSelector('aside nav[aria-label=Primary]'); await d.waitForTimeout(300); assert(await d.locator('#records-group').count()===0,'and stays collapsed on reload');
 await d.click('aside button:has-text("Records")'); assert(await d.locator('#records-group a').count()===5,'and opens again');
 await d.goto(BASE+'/dashboard/documents'); await d.waitForSelector('#records-group'); assert(await d.locator('#records-group a[aria-current=page]').count()===1,'the Records group is open on a Records page, with the page highlighted');
 // tooltips on the three footer icons
 const tipOf=async(label)=>{ const b=d.locator(`aside button[aria-label="${label}"]`).first(); await b.hover(); await d.waitForTimeout(700); const t=b.locator('xpath=following-sibling::span[@data-tip]'); const tt=(await t.count())? t : b.locator('xpath=ancestor::span[contains(@class,"group/tip")]/span[@data-tip]'); return {text:(await tt.first().innerText()).trim(), shown:(await tt.first().evaluate(e=>getComputedStyle(e).opacity))==='1', box:await tt.first().boundingBox()}; };
 const t1=await tipOf('Switch to dark mode'); assert(t1.shown && /dark mode/i.test(t1.text),`hovering the day/night icon shows "${t1.text}"`);
 const t2=await tipOf('Sign out'); assert(t2.shown && t2.text==='Sign out',`hovering the sign-out icon shows "${t2.text}"`);
 const t3=await tipOf('Collapse sidebar'); assert(t3.shown && /menu/i.test(t3.text),`hovering the collapse icon shows "${t3.text}"`);
 assert([t1,t2,t3].every(t=>t.box && t.box.x>=0 && t.box.x+t.box.width<=1440 && t.box.y>=0),'tooltips stay inside the window');
 await d.screenshot({path:S+'/menu-desktop.png',clip:{x:0,y:0,width:520,height:900}});
 // short window: nothing important is pushed out of reach
 await d.setViewportSize({width:1280,height:600}); await d.waitForTimeout(300);
 assert(await fits(d,'aside button[aria-label="Sign out"]') && await fits(d,'aside button[aria-label="Collapse sidebar"]') && await fits(d,'aside a[href="/admin"]'),'on a short window the footer (Admin, theme, sign out, collapse) is still on screen');
 await d.locator('aside a[href="/dashboard/settings"]').scrollIntoViewIfNeeded(); assert(await fits(d,'aside a[href="/dashboard/settings"]'),'and Settings can be scrolled to');
 await d.screenshot({path:S+'/menu-short.png',clip:{x:0,y:0,width:420,height:600}});
 // collapsed rail tooltips
 await d.setViewportSize({width:1440,height:900}); await d.click('aside button[aria-label="Collapse sidebar"]'); await d.waitForTimeout(500);
 const r1=await tipOf('Sign out'); assert(r1.shown && r1.box.x>=60,'in the icon rail, the tooltip opens to the right of the icon');
 await d.screenshot({path:S+'/menu-rail.png',clip:{x:0,y:0,width:420,height:900}});
 await d.click('aside button[aria-label="Expand sidebar"]');

 // ---------- My homes: pencil edits a home (not only the current one)
 const uc=await sess('una@test.dev',{width:1280,height:900}); const u=await uc.newPage(); u.on('pageerror',e=>errs.push(e.message));
 await u.goto(BASE+'/dashboard/homes'); await u.fill('input[name=name]','Beach Villa'); await u.click('button:has-text("Add home")'); await u.waitForURL(BASE+'/dashboard');
 await u.goto(BASE+'/dashboard/homes'); const pencils=await u.locator('[data-testid=edit-home]').count(); assert(pencils>=2,`every home you manage has a pencil (${pencils})`);
 const other=u.locator('[data-testid=edit-home][data-current=false]').first(); const oname=(await other.getAttribute('aria-label')).replace(/^Edit /,'');
 await other.click(); await u.waitForSelector('[role=dialog] input[name=name]'); assert((await u.inputValue('[role=dialog] input[name=name]'))===oname,"the pencil opens that home's details, not the current home's");
 await u.fill('[role=dialog] input[name=name]','Renamed Elsewhere'); await u.selectOption('[role=dialog] select[name=climate]','temperate'); await u.click('[role=dialog] button:has-text("Save home")'); await u.waitForSelector('text=Home updated');
 const row=(await q("select name,climate from households where name='Renamed Elsewhere'")); assert(row.length===1 && row[0].climate==='temperate','saving from the pencil updates that other home');
 assert((await q("select count(*)::int n from households where name=$1",[oname]))[0].n===0,'and only that home');
 await u.keyboard.press('Escape'); await u.goto(BASE+'/dashboard/settings/profile');
 assert(await u.locator('#settings-sections a:has-text("Home")').count()===0 && (await u.goto(BASE+'/dashboard/settings/home')).status()===404,'the old Settings → Home page is gone');
 // someone else's home cannot be edited through the form
 const foreign=(await q("select id from households where id not in (select household_id from household_members where user_id=(select id from profiles where email='una@test.dev')) limit 1"));
 if(foreign.length){ const before=(await q('select name from households where id=$1',[foreign[0].id]))[0].name; await u.goto(BASE+'/dashboard/homes'); await u.locator('[data-testid=edit-home]').first().click(); await u.waitForSelector('[role=dialog] input[name=homeId]',{state:'attached'}); await u.evaluate((id)=>{document.querySelector('[role=dialog] input[name=homeId]').value=id},foreign[0].id); await u.fill('[role=dialog] input[name=name]','Hacked'); await u.click('[role=dialog] button:has-text("Save home")'); await u.waitForTimeout(1200); assert((await q('select name from households where id=$1',[foreign[0].id]))[0].name===before,'a tampered form cannot rename a home you are not in'); }

 // ---------- tablet: starts as the icon rail, content not overlapped
 const tc=await sess('una@test.dev',{width:820,height:1180}); const t=await tc.newPage(); t.on('pageerror',e=>errs.push(e.message));
 await t.goto(BASE+'/dashboard'); await t.waitForSelector('aside'); await t.waitForTimeout(600);
 const aw=(await t.locator('aside').boundingBox()).width, mx=(await t.locator('main').evaluate(e=>parseFloat(getComputedStyle(e).paddingLeft)));
 assert(aw<100 && mx>=aw,`on a tablet the menu starts as a slim icon rail (${Math.round(aw)}px) and the page keeps its room`);
 assert(await t.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'tablet: no sideways scrolling');
 for(const [lbl,sel] of [['theme','aside button[aria-label*="mode"]'],['sign out','aside button[aria-label="Sign out"]'],['expand','aside button[aria-label="Expand sidebar"]']]) assert(await fits(t,sel),`tablet: the ${lbl} icon is on screen`);
 await t.click('aside button[aria-label="Expand sidebar"]'); await t.waitForTimeout(500); assert((await t.locator('aside').boundingBox()).width>200 && await t.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'tablet: it can be expanded to the full menu');
 await t.screenshot({path:S+'/menu-tablet.png',clip:{x:0,y:0,width:820,height:700}});

 // ---------- phone
 const pc=await sess('admin@test.dev',{width:390,height:844}); const p=await pc.newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.goto(BASE+'/dashboard'); await p.waitForSelector('nav[aria-label=Primary]:visible');
 const tabs=await p.locator('nav[aria-label=Primary]:visible a').allInnerTexts(); assert(tabs.map(x=>x.trim()).join('|')==='Dashboard|Assets|Schedule|Household|Passport|More',`phone tab bar: ${tabs.map(x=>x.trim()).join(', ')}`);
 const clipped=await p.evaluate(()=>[...document.querySelectorAll('nav[aria-label=Primary] a')].filter(a=>a.offsetParent).filter(a=>a.scrollWidth>a.clientWidth+1).length); assert(clipped===0,'phone: tab labels (incl. "Dashboard") fit without clipping');
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone: no sideways scrolling');
 await p.screenshot({path:S+'/menu-phone.png'});
 await p.goto(BASE+'/dashboard/more'); const more=await p.locator('main').innerText(); assert(['My homes','Settings','Admin portal'].every(x=>more.includes(x)),'phone: More has My homes, Settings and the Admin portal');
 await p.screenshot({path:S+'/menu-more.png'});
 await p.goto(BASE+'/dashboard/homes'); assert(await p.locator('[data-testid=edit-home]').first().isVisible() && await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone: My homes shows the pencil without overflowing');
 await p.screenshot({path:S+'/menu-homes-phone.png'});
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})().catch(e=>{console.error('FAIL crashed',e);process.exit(1)});
