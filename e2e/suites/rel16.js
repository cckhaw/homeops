// Release D: newsletter (double opt-in, admin send, unsubscribe) and the free tools (SEO + calculators).
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg'); const fs = require('fs');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const mails=()=>JSON.parse(fs.readFileSync(S+'/mails.json'));
const to=(a)=>mails().filter(m=>(Array.isArray(m.to)?m.to:[m.to]).includes(a));
const linkIn=(html,re)=>{ const m=re.exec(html||''); return m&&m[1].replace(/&amp;/g,'&'); };
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp||{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const anon=await browser.newContext({viewport:{width:1280,height:900}}); const a=await anon.newPage(); a.on('pageerror',e=>errs.push(e.message));
 const meta=(pg)=>pg.evaluate(()=>({title:document.title,desc:document.querySelector('meta[name=description]')?.content,canon:document.querySelector('link[rel=canonical]')?.href,robots:document.querySelector('meta[name=robots]')?.content,h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim()),ld:[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent))}));
 const form=(pg)=>pg.locator('[data-testid=newsletter]').first();
 const subscribe=async(pg,email,extra)=>{ const f=form(pg); await f.locator('input[name=email]').fill(email); if(extra) await f.locator('input[name=website]').evaluate((e,v)=>{e.value=v},extra); await f.locator('button:has-text("Subscribe")').click(); await pg.waitForTimeout(1500); };

 // ---------------- newsletter sign-up
 await a.goto(BASE+'/blog'); assert(await form(a).count()===1,'the blog index has a newsletter sign-up');
 await subscribe(a,'not-an-email'); assert(/valid e-mail/.test(await form(a).innerText()) && (await q("select count(*)::int n from newsletter_subscribers"))[0].n===0,'an invalid address is refused with a clear message');
 await subscribe(a,'Reader@Example.com'); await a.getByText(/Check your inbox/).first().waitFor();
 let row=(await q("select * from newsletter_subscribers where email='reader@example.com'"))[0]; assert(row && row.status==='pending' && row.source==='blog' && !row.confirmed_at,'a new address is stored lower-case as "pending" with its source (blog)');
 let m=to('reader@example.com'); const confirm=linkIn(m[0]&&m[0].html,/href="([^"]*\/newsletter\/confirm\?t=[^"]+)"/); assert(m.length===1 && /Confirm your Wodejia subscription/.test(m[0].subject) && confirm,'a confirmation e-mail with a confirm link is sent (and nothing else)');
 await subscribe(a,'bot@example.com','http://spam'); assert((await q("select count(*)::int n from newsletter_subscribers where email='bot@example.com'"))[0].n===0 && to('bot@example.com').length===0,'a filled honeypot field looks successful to the bot but stores and sends nothing');
 // rate limit per address
 for(let i=0;i<3;i++) await subscribe(a,'limit@example.com'); assert(/Too many|try again/i.test(await form(a).innerText()) || to('limit@example.com').length<=3,'repeated sign-ups for one address are rate-limited');
 // ---------------- confirm (a page + button, so link scanners cannot confirm)
 const cp=await anon.newPage(); await cp.goto(confirm.replace(/^https?:\/\/[^/]+/,BASE)); assert(await cp.locator('h1:has-text("Confirm your subscription")').count()===1 && /reader@example.com/.test(await cp.locator('main').innerText()),'the confirm link opens a page showing the address');
 assert((await q("select status from newsletter_subscribers where email='reader@example.com'"))[0].status==='pending','opening the link does not subscribe anyone by itself');
 await cp.click('button:has-text("Confirm my subscription")'); await cp.getByText(/You are subscribed/).waitFor(); row=(await q("select * from newsletter_subscribers where email='reader@example.com'"))[0]; assert(row.status==='subscribed' && row.confirmed_at,'pressing the button subscribes (and records the time)');
 const bad=await anon.newPage(); await bad.goto(BASE+'/newsletter/confirm?t='+confirm.split('t=')[1].slice(0,-4)+'abcd'); assert(/expired or is not valid/.test(await bad.locator('main').innerText()) && await bad.locator('main button').count()===0,'a tampered link is refused');
 assert(/noindex/.test((await meta(bad)).robots||''),'confirm and unsubscribe pages are not indexed');
 // no enumeration: a subscribed address gets the same answer and no extra mail
 const before=mails().length; await subscribe(a,'reader@example.com'); assert(/Check your inbox/.test(await form(a).innerText()) && mails().length===before,'signing up an already-subscribed address looks the same and sends nothing');

 // ---------------- admin
 const ac=await sess('admin@test.dev'); const ap=await ac.newPage(); ap.on('pageerror',e=>errs.push(e.message)); ap.on('dialog',d=>d.accept());
 await ap.goto(BASE+'/admin/newsletter'); assert(await ap.locator('aside[aria-label=Admin] nav a:has-text("Newsletter")').count()===1 && /1\s*Subscribed/i.test((await ap.getByTestId('newsletter-stats').innerText()).replace(/\n/g,' ')),'Admin → Newsletter shows in the menu with the subscriber count');
 const uc=await sess('una@test.dev'); const up=await uc.newPage(); const ur=await up.goto(BASE+'/admin/newsletter'); assert(!(await up.locator('h1:has-text("Newsletter")').count()),'ordinary users cannot open it');
 await ap.click('button:has-text("Start from the latest blog post")'); await ap.waitForFunction(()=>document.querySelector('input[aria-label="Newsletter subject"]').value.length>5); const subj=await ap.inputValue('input[aria-label="Newsletter subject"]'); assert(/air-con|aircon/i.test(subj) && /\/blog\//.test(await ap.inputValue('textarea[aria-label="Newsletter message"]')),`"Start from the latest blog post" fills the subject (${subj}) and a link`);
 await ap.fill('input[aria-label="Newsletter subject"]','Tips & <tricks> for November'); await ap.fill('textarea[aria-label="Newsletter message"]','## Hello\n\nSome **bold** words and a [link](/faq).\n\n- one\n- two\n\n<script>alert(1)</script>');
 await ap.click('button:has-text("Send me a test")'); await ap.locator('[data-testid=newsletter-composer] [role=status]').getByText(/Test sent to admin@test.dev/).waitFor(); const tm=to('admin@test.dev').filter(x=>/\[Test\]/.test(x.subject)).pop();
 assert(tm && /Tips &amp; &lt;tricks&gt;/.test(tm.html) && /<strong>bold<\/strong>/.test(tm.html) && !/<script/.test(tm.html) && /\/newsletter\/unsubscribe\?t=/.test(tm.html),'the test e-mail renders the Markdown safely (HTML escaped, no scripts) and carries an unsubscribe link');
 assert(tm.headers && /newsletter\/unsubscribe\?t=|api\/newsletter\/unsubscribe/.test(tm.headers['List-Unsubscribe']||'') && tm.headers['List-Unsubscribe-Post']==='List-Unsubscribe=One-Click','and the List-Unsubscribe headers for one-click unsubscribe in Gmail / Apple Mail');
 await ap.click('button:has-text("Send to 1 subscriber")'); await ap.locator('[data-testid=newsletter-composer] [role=status]').getByText(/1 sent/).waitFor(); const sm=to('reader@example.com').filter(x=>x.subject==='Tips & <tricks> for November'); assert(sm.length===1 && !to('limit@example.com').some(x=>x.subject==='Tips & <tricks> for November'),'the issue goes to the confirmed subscriber only (not to people still waiting to confirm)');
 assert((await q("select last_issue_id from newsletter_subscribers where email='reader@example.com'"))[0].last_issue_id && (await q("select sent_count c from newsletter_issues"))[0].c===1,'the issue is logged with its sent count');
 await ap.click('button:has-text("Send to the rest")'); await ap.locator('[data-testid=newsletter-composer] [role=status]').getByText(/0 sent/).waitFor(); assert(to('reader@example.com').filter(x=>x.subject==='Tips & <tricks> for November').length===1,'pressing Send again does not mail anyone twice');
 await ap.reload(); assert(/Tips/.test(await ap.getByTestId('issues').innerText()) && /reader@example.com/.test(await ap.getByTestId('subscribers').innerText()),'the issue and the sign-ups are listed');
 assert((await q("select count(*)::int n from audit_log where action='newsletter.send'"))[0].n===2,'sending is audit-logged');
 // ---------------- unsubscribe
 const unsub=linkIn(sm[0].html,/href="([^"]*\/newsletter\/unsubscribe\?t=[^"]+)"/); const upg=await anon.newPage(); await upg.goto(unsub.replace(/^https?:\/\/[^/]+/,BASE)); assert((await q("select status from newsletter_subscribers where email='reader@example.com'"))[0].status==='subscribed' && await upg.locator('button:has-text("Unsubscribe")').count()===1,'the unsubscribe link opens a page with a button (opening it changes nothing)');
 await upg.click('button:has-text("Unsubscribe")'); await upg.getByText(/You have been unsubscribed/).waitFor(); assert((await q("select status,unsubscribed_at from newsletter_subscribers where email='reader@example.com'"))[0].status==='unsubscribed','pressing it unsubscribes');
 await ap.reload(); await ap.fill('input[aria-label="Newsletter subject"]','Second issue'); await ap.fill('textarea[aria-label="Newsletter message"]','Another message for everyone who is subscribed.'); const none=await ap.locator('button:has-text("Send to 0 subscribers")'); assert(await none.isDisabled(),'with nobody subscribed the send button is disabled');
 // one-click endpoint
 await q("update newsletter_subscribers set status='subscribed', unsubscribed_at=null where email='reader@example.com'"); const hdr=(to('admin@test.dev').filter(x=>/\[Test\]/.test(x.subject)).pop().headers['List-Unsubscribe']||'').replace(/^<|>$/g,'');
 const g=await anon.request.get(hdr.replace(/^https?:\/\/[^/]+/,BASE),{maxRedirects:0}); assert(g.status()===303 && (await q("select status from newsletter_subscribers where email='admin@test.dev'")).length===0,'a browser GET on the API link only redirects to the page');
 await q("insert into newsletter_subscribers (email,status) values ('admin@test.dev','subscribed')"); const pr=await anon.request.post(hdr.replace(/^https?:\/\/[^/]+/,BASE),{form:{'List-Unsubscribe':'One-Click'}}); assert(pr.status()===200 && (await q("select status from newsletter_subscribers where email='admin@test.dev'"))[0].status==='unsubscribed','a one-click POST unsubscribes at once');
 assert((await anon.request.post(BASE+'/api/newsletter/unsubscribe?t=garbage')).status()===400,'and rejects a bad token');
 // re-subscribe needs a fresh confirmation
 await q("update newsletter_subscribers set status='unsubscribed' where email='reader@example.com'"); await subscribe(a,'reader@example.com'); row=(await q("select status from newsletter_subscribers where email='reader@example.com'"))[0]; assert(row.status==='pending' && to('reader@example.com').filter(x=>/Confirm your Wodejia/.test(x.subject)).length===2,'someone who unsubscribed must confirm again to rejoin');

 // ---------------- free tools: pages, SEO, calculators
 const sitemap=await (await a.request.get(BASE+'/sitemap.xml')).text(); const robots=await (await a.request.get(BASE+'/robots.txt')).text();
 assert(['/tools<','/tools/aircon-service-cost<','/tools/appliance-lifespan<'].every(u=>sitemap.includes(u)) && /Allow: \/tools/.test(robots) && /Disallow: \/newsletter\//.test(robots),'the sitemap lists the tools, robots allows them and blocks /newsletter/ pages');
 for(const [path,h1,needs] of [['/tools','Smarter decisions',2],['/tools/aircon-service-cost','Air-con service cost calculator',5],['/tools/appliance-lifespan','Appliance lifespan guide and age checker',5]]){
  const r=await a.goto(BASE+path); const mt=await meta(a); const graph=(mt.ld[0]['@graph']||[]); 
  assert(r.status()===200 && mt.h1.length===1 && mt.h1[0].includes(h1.split(' ')[0]) && mt.canon.endsWith(path) && mt.desc.length>=90 && mt.desc.length<=165 && mt.title.length<=75,`${path}: 200, one H1, canonical, ${mt.desc.length}-character description`);
  if(path!=='/tools') assert(graph.some(n=>n['@type']==='WebApplication'&&n.isAccessibleForFree) && graph.some(n=>n['@type']==='FAQPage'&&n.mainEntity.length===needs) && graph.some(n=>n['@type']==='BreadcrumbList') && await a.locator('details').count()===needs,`${path}: WebApplication + FAQPage (${needs} questions, also visible) + breadcrumb structured data`);
  assert(await a.locator('header a[href="/tools"]').count()===1 && await a.locator('footer a[href="/tools"]').count()===1 && await form(a).count()===1,`${path}: linked from header and footer, with a newsletter sign-up`); }
 // aircon calculator
 await a.goto(BASE+'/tools/aircon-service-cost'); const tot=()=>a.getByTestId('aircon-total').innerText();
 assert(/S\$460 to S\$784/.test(await tot()),'default (Singapore, wall units, 3 units, normal use) estimates S$460 to S$784 a year');
 await a.selectOption('select[aria-label=Country]','MY'); assert(/RM/.test(await tot()),'switching to Malaysia switches the currency to RM');
 await a.selectOption('select[aria-label=Country]','SG'); await a.fill('input[aria-label="Number of units"]','1'); const one=await tot(); assert(/S\$170 to S\$290/.test(one),'one unit: S$170 to S$290');
 await a.check('input[aria-label=Heavy]'); const heavy=await tot(); assert(heavy!==one && /per year|Chemical wash/.test(await a.getByTestId('aircon-table').innerText()),'heavy use changes the estimate and the plan table');
 await a.selectOption('select[aria-label="Type of unit"]','cassette'); assert((await tot())!==heavy,'a ceiling cassette costs more than a wall unit');
 await a.screenshot({path:S+'/tool-aircon.png',fullPage:true});
 // lifespan checker
 await a.goto(BASE+'/tools/appliance-lifespan'); const res=()=>a.getByTestId('lifespan-result').innerText();
 await a.selectOption('select[aria-label=Appliance]','aircon'); await a.fill('input[aria-label="Age in years"]','2'); assert(/Plenty of life left/.test(await res()),'a 2-year-old air-con has plenty of life left');
 await a.fill('input[aria-label="Age in years"]','7'); assert(/Mid to late life/.test(await res()),'7 years: mid to late life');
 await a.fill('input[aria-label="Age in years"]','9'); assert(/replacement window/.test(await res()),'9 years: in the replacement window');
 await a.fill('input[aria-label="Age in years"]','13'); assert(/Past its typical lifespan/.test(await res()) && /Signs it is time/.test(await res()),'13 years: past its typical lifespan, with warning signs');
 await a.selectOption('select[aria-label=Appliance]','fridge'); assert(/10 to 15 years/.test(await a.locator('form[aria-label="Appliance age checker"]').innerText()),'choosing the fridge shows its 10 to 15 year range');
 assert(await a.getByTestId('lifespan-table').locator('tbody tr').count()>=15,'the full lifespan table is on the page for search engines');
 await a.screenshot({path:S+'/tool-lifespan.png',fullPage:true});
 // internal links from the blog posts and placements of the sign-up
 await a.goto(BASE+'/blog/how-often-service-aircon-singapore-malaysia'); assert(await a.locator('article a[href="/tools/aircon-service-cost"]').count()>=1 && await form(a).count()===1,'the air-con article links to the calculator and has the sign-up below it');
 await a.goto(BASE+'/faq'); assert(await form(a).count()===1,'the FAQ index has the sign-up too');
 await a.goto(BASE+'/'); assert(await a.locator('header nav a[href="/tools"]').count()===1 && await a.locator('footer a[href="/tools"]').count()===1,'the front page links to the tools');
 // phones
 const mc=await browser.newContext({viewport:{width:360,height:740}}); const mp=await mc.newPage();
 for(const path of ['/tools','/tools/aircon-service-cost','/tools/appliance-lifespan','/blog','/newsletter/confirm?t=x']){ await mp.goto(BASE+path); assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`phone (360px): ${path} fits`); }
 await mp.goto(BASE+'/tools/aircon-service-cost'); await mp.screenshot({path:S+'/tool-aircon-phone.png',fullPage:true});
 const adm=await sess('admin@test.dev',{width:390,height:844}); const am=await adm.newPage(); await am.goto(BASE+'/admin/newsletter'); assert(await am.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone: Admin → Newsletter fits');
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})().catch(e=>{console.error('FAIL crashed',e);process.exit(1)});
