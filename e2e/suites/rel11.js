// FAQ / help centre: public pages with SEO markup, in-app help, "Support" group, links, search.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const CATS=['getting-started','assets-and-warranties','maintenance-and-reminders','documents-bills-and-contractors','sharing-and-households','privacy-and-security','account-and-sign-in','troubleshooting'];
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const anon=await browser.newContext({viewport:{width:1280,height:900}}); const a=await anon.newPage(); a.on('pageerror',e=>errs.push(e.message));
 const meta=(pg)=>pg.evaluate(()=>({title:document.title,desc:document.querySelector('meta[name=description]')?.content,canon:document.querySelector('link[rel=canonical]')?.href,robots:document.querySelector('meta[name=robots]')?.content,h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim()),ld:[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)),ogTitle:document.querySelector('meta[property="og:title"]')?.content}));

 // ---- index
 const r=await a.goto(BASE+'/faq'); assert(r.status()===200,'/faq loads without signing in');
 let m=await meta(a); assert(m.h1.length===1 && /help/i.test(m.h1[0]) && m.canon.endsWith('/faq') && m.desc.length>=100 && m.desc.length<=170 && !/noindex/.test(m.robots||''),`index: one H1, canonical, a ${m.desc.length}-character description, indexable`);
 assert(m.ld[0]['@graph'].some(n=>n['@type']==='BreadcrumbList') && m.ld[0]['@graph'].some(n=>n['@type']==='ItemList'),'index: breadcrumb + category list structured data');
 assert(await a.locator('a[href^="/faq/"]').count()>=40,'index: links to every category and question');
 // search
 await a.fill('input[type=search]','warranty'); await a.waitForTimeout(300);
 const shown=await a.locator('#faq-all [data-faq-item]:visible').count(); assert(shown>=3 && shown<45 && /found/.test(await a.locator('[role=status]').first().innerText()),`search narrows the list (${shown} found for "warranty")`);
 await a.fill('input[type=search]','zzzzqqq'); await a.waitForTimeout(300); assert(await a.locator('#faq-all [data-faq-item]:visible').count()===0 && /No questions match/.test(await a.locator('[role=status]').first().innerText()),'search shows a friendly message when nothing matches');
 await a.fill('input[type=search]','');

 // ---- every category + question page
 let bad=[]; let qCount=0;
 for(const c of CATS){
  const rc=await a.goto(BASE+'/faq/'+c); const mc=await meta(a);
  const faq=mc.ld[0]['@graph'].find(n=>n['@type']==='FAQPage');
  const arts=await a.locator('article[data-faq-item]').count();
  if(rc.status()!==200||!faq||faq.mainEntity.length!==arts||arts<4||mc.h1.length!==1||!mc.canon.endsWith('/faq/'+c)||mc.title.length>80) bad.push(c);
  const hrefs=await a.locator('article h2 a').evaluateAll(e=>e.map(x=>x.getAttribute('href')));
  for(const h of hrefs){ const rq=await a.goto(BASE+h); const mq=await meta(a); qCount++;
   const f=mq.ld[0]['@graph'].find(n=>n['@type']==='FAQPage'); const bc=mq.ld[0]['@graph'].find(n=>n['@type']==='BreadcrumbList');
   if(rq.status()!==200||mq.h1.length!==1||mq.title.split(' · ')[0]!==mq.h1[0]||!mq.desc||mq.desc.length>160||!mq.canon.endsWith(h)||!f||f.mainEntity.length!==1||f.mainEntity[0].name!==mq.h1[0]||!bc||bc.itemListElement.length!==4||(await a.locator('#related ~ ul li, section[aria-labelledby=related] li').count())<3) bad.push(h);
  }
 }
 assert(bad.length===0,`all 8 category pages and ${qCount} question pages: 200, one H1, title = question, canonical, ≤160-char description, FAQPage + breadcrumb data, related links${bad.length?' — BAD: '+bad.join(', '):''}`);
 assert((await a.goto(BASE+'/faq/nope')).status()===404 && (await a.goto(BASE+'/faq/getting-started/nope')).status()===404,'unknown FAQ URLs are 404');
 // sitemap / robots / links
 const sm=await (await a.request.get(BASE+'/sitemap.xml')).text(); assert(sm.includes('/faq<')&&CATS.every(c=>sm.includes('/faq/'+c+'<'))&&sm.includes('/faq/troubleshooting/contact-support'),'the sitemap lists /faq, every category and every question');
 { const locs=[...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]); const mods=[...sm.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(x=>x[1]);
   assert(new Set(locs).size===locs.length && locs.length===mods.length && mods.every(m=>!Number.isNaN(Date.parse(m)) && Date.parse(m)<=Date.now()+86400000),`the sitemap has ${locs.length} unique URLs, each with a valid last-modified date that is not in the future`);
   assert(!locs.some(u=>/\/(dashboard|admin|api|passport|join|reset-password|forgot-password|brand-asset)(\/|$)/.test(u)),'and none of them is a private page'); }
 const rb=await (await a.request.get(BASE+'/robots.txt')).text(); assert(/Allow: \/faq/.test(rb) && /Disallow: \/dashboard/.test(rb) && /Disallow: \/brand-asset\//.test(rb) && /Sitemap: .*sitemap\.xml/.test(rb),'robots.txt allows /faq, blocks private areas and points to the sitemap');
 await a.goto(BASE+'/'); assert(await a.locator('header nav a[href="/faq"]').count()===1 && await a.locator('footer a[href="/faq"]').count()===1,'the front page links to the FAQ in the header and footer');
 await a.goto(BASE+'/blog'); assert(await a.locator('header a[href="/faq"]').count()>=1 && await a.locator('footer a[href="/faq"]').count()===1,'the blog header/footer link to it too');
 await a.goto(BASE+'/faq/getting-started/is-wodejia-free'); assert(await a.locator('main a:has-text("Get started")').count()>=1,'question pages carry a sign-up call to action');
 // a link in an answer
 await a.goto(BASE+'/faq/privacy-and-security/is-my-data-safe'); assert(await a.locator('main a[href="/privacy"]').count()>=1,'answers link to the Privacy Policy');
 await a.screenshot({path:S+'/faq-question.png'});
 await a.goto(BASE+'/faq'); await a.screenshot({path:S+'/faq-index.png'});

 // ---- signed in: in-app help + Support group
 const dc=await sess('admin@test.dev',{width:1440,height:900}); const d=await dc.newPage(); d.on('pageerror',e=>errs.push(e.message));
 await d.goto(BASE+'/dashboard/help'); assert(await d.locator('h1:has-text("Help & FAQ")').count()===1 && await d.locator('aside a[href="/dashboard/help"]').count()===1,'in the app, Help & FAQ opens inside the menu layout and the sidebar links to it');
 const mh=await meta(d); assert(/noindex/.test(mh.robots||''),'the in-app copy is not indexed (the public pages are)');
 const first=d.locator('#help-all details').first(); await first.locator('summary').click(); assert(await first.evaluate(e=>e.open),'questions open like an accordion');
 await d.fill('input[type=search]','passport'); await d.waitForTimeout(300); const hv=await d.locator('#help-all details:visible').count(); assert(hv>=2 && hv<20,`in-app search works (${hv} for "passport")`);
 assert(await d.locator('[data-faq-group]:visible').count()<8,'empty groups hide while searching');
 await d.screenshot({path:S+'/help-app.png'});
 // phone: More page
 const pc=await sess('admin@test.dev',{width:390,height:844}); const p=await pc.newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.goto(BASE+'/dashboard/more'); const heads=await p.locator('main h2').allInnerTexts(); 
 assert(heads.some(h=>/^support$/i.test(h.trim())) && !heads.some(h=>/owner/i.test(h)),`More has a "Support" section (${heads.map(h=>h.trim()).join(' / ')})`);
 const sup=p.locator('section:has(h2:has-text("Support"))'); assert(await sup.locator('a[href="/dashboard/help"]').count()===1,'Support contains Help & FAQ');
 assert(await p.locator('section:has(h2:has-text("Admin")) a[href="/admin"]').count()===1,'the Admin portal sits in its own admin-only section');
 await p.screenshot({path:S+'/more-support.png',fullPage:true});
 const uc=await sess('una@test.dev',{width:390,height:844}); const u=await uc.newPage(); await u.goto(BASE+'/dashboard/more'); assert(await u.locator('main a[href="/admin"]').count()===0,'regular users do not see the Admin portal');
 await p.goto(BASE+'/dashboard/help'); assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone: Help page has no sideways scrolling');
 await p.screenshot({path:S+'/help-phone.png'});
 // public pages on a phone
 const mc2=await browser.newContext({viewport:{width:360,height:740}}); const mp=await mc2.newPage();
 for(const path of ['/faq','/faq/troubleshooting','/faq/getting-started/what-is-wodejia']){ await mp.goto(BASE+path); assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`phone (360px): ${path} fits without sideways scrolling`); }
 await mp.goto(BASE+'/faq'); await mp.screenshot({path:S+'/faq-phone.png'});
 // tablet
 const tc=await browser.newContext({viewport:{width:820,height:1180}}); const tp=await tc.newPage(); await tp.goto(BASE+'/faq'); assert(await tp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'tablet: /faq fits'); await tp.screenshot({path:S+'/faq-tablet.png'});
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})().catch(e=>{console.error('FAIL crashed',e);process.exit(1)});
