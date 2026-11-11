// Blog: public pages, scheduling, admin management; admin sidebar.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const AIRCON='how-often-service-aircon-singapore-malaysia', WARRANTY='home-appliance-warranty-checklist';
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp||{width:1280,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const anon=await browser.newContext({viewport:{width:1280,height:900}}); const a=await anon.newPage(); a.on('pageerror',e=>errs.push(e.message));

 // ---------------- the two starter posts
 const seeded=await q("select slug,status,publish_at from blog_posts where slug in ($1,$2) order by publish_at",[AIRCON,WARRANTY]);
 assert(seeded.length===2 && seeded[1].publish_at.toISOString()==='2026-11-13T01:00:00.000Z','both starter posts exist; the warranty checklist is set for 13 Nov 2026, 09:00 Singapore time');
 // make the test independent of today's date: force the warranty post into the future for the scheduling checks, then restore
 const future=new Date(Date.now()+7*86400000).toISOString(); await q("update blog_posts set publish_at=$2 where slug=$1",[WARRANTY,future]); await q("update blog_posts set publish_at=now() - interval '1 hour' where slug=$1",[AIRCON]);

 await a.goto(BASE+'/blog'); assert(/blog/i.test(await a.title()) && await a.locator('h1').count()===1,'the blog index loads');
 assert(await a.locator('[data-testid=post-card]:has-text("How often should you service")').count()===1,'the air-con article is listed');
 assert(await a.locator('[data-testid=post-card]:has-text("Warranty Checklist")').count()===0,'the scheduled warranty checklist is NOT listed yet');
 const r1=await a.goto(BASE+'/blog/'+WARRANTY); assert(r1.status()===404,'its page returns 404 before its time');
 assert(!(await (await a.request.get(BASE+'/sitemap.xml')).text()).includes(WARRANTY) && !(await (await a.request.get(BASE+'/blog/rss.xml')).text()).includes(WARRANTY),'it is missing from the sitemap and RSS feed too');
 // article
 const r2=await a.goto(BASE+'/blog/'+AIRCON); assert(r2.status()===200,'the air-con article loads');
 assert(await a.locator('h1:has-text("How often should you service your air-con in Singapore/Malaysia?")').count()===1,'exact title as requested');
 assert(await a.locator('article table').count()===1 && await a.locator('article table tbody tr').count()===5,'the schedule table renders');
 assert(await a.locator('article [role=img][aria-label="To do"]').count()>=7,'the service checklist renders as checkboxes');
 assert(await a.locator('nav[aria-label="In this article"] a').count()>=5,'a contents list links to the sections');
 assert(await a.locator('article a[href="/register"]').count()>=1 && await a.locator('aside a:has-text("Create your free account")').count()===1,'calls to action link to sign-up');
 const meta=await a.evaluate(()=>({d:document.querySelector('meta[name=description]')?.content, c:document.querySelector('link[rel=canonical]')?.href, og:document.querySelector('meta[property="og:type"]')?.content, ld:document.querySelector('script[type="application/ld+json"]')?.textContent}));
 assert(meta.d&&meta.d.length>40 && /\/blog\/how-often/.test(meta.c) && meta.og==='article' && JSON.parse(meta.ld)['@graph'].some(x=>x['@type']==='BlogPosting'),'SEO: description, canonical URL, article Open Graph and BlogPosting data');
 assert(await a.locator('script:not([type]), article script').evaluateAll(els=>els.every(e=>!/alert\(/.test(e.textContent||''))),'no script injected through the article body');
 const sm=await (await a.request.get(BASE+'/sitemap.xml')).text(); assert(sm.includes('/blog/'+AIRCON) && sm.includes('/blog</loc>'),'the sitemap lists the blog and the live article');
 assert((await (await a.request.get(BASE+'/blog/rss.xml')).text()).includes('<title>How often should you service'),'the RSS feed lists it');
 assert((await a.request.get(BASE+'/blog/does-not-exist')).status()===404,'unknown posts are a 404');
 assert((await a.request.get(BASE+'/robots.txt').then(r=>r.text())).includes('/blog'),'robots.txt allows the blog');

 // ---------------- SEO of the live article
 const html=await (await a.request.get(BASE+'/blog/'+AIRCON)).text();
 const t=await a.title(); assert(t.length<=60 && /^How Often to Service Aircon/.test(t),`the page <title> is search-friendly: "${t}" (${t.length} characters)`);
 const m2=await a.evaluate(()=>({ d:document.querySelector('meta[name=description]').content, c:document.querySelector('link[rel=canonical]').href, ot:document.querySelector('meta[property="og:title"]')?.content, oi:document.querySelector('meta[property="og:image"]')?.content, od:document.querySelector('meta[property="og:description"]')?.content, mod:document.querySelector('meta[property="article:modified_time"]')?.content, sec:document.querySelector('meta[property="article:section"]')?.content, tw:document.querySelector('meta[name="twitter:card"]')?.content, robots:document.querySelector('meta[name=robots]')?.content||'', lang:document.documentElement.lang, h1:document.querySelectorAll('h1').length, h3:document.querySelectorAll('article h3').length, rss:document.querySelector('link[rel=alternate][type="application/rss+xml"]')?.href }));
 assert(m2.d.length>=70 && m2.d.length<=160,`the meta description is ${m2.d.length} characters (70–160)`);
 assert(/^https?:\/\/[^/]+\/blog\/how-often-service-aircon-singapore-malaysia$/.test(m2.c),'the canonical URL is absolute and matches the short keyword URL');
 assert(m2.ot==='How often should you service your air-con in Singapore/Malaysia?' && /^https?:\/\//.test(m2.oi) && /\/og$/.test(m2.oi) && m2.od===m2.d && m2.sec==='Maintenance' && !!m2.mod && m2.tw==='summary_large_image','social tags: full title, description, absolute image, section and modified time');
 const og=await a.request.get(m2.oi.replace(/^https?:\/\/[^/]+/,BASE)); assert(og.status()===200 && /image\/png/.test(og.headers()['content-type']) && /s-maxage=3600/.test(og.headers()['cache-control']),'every article has its own share image (PNG), cached for an hour');
 assert(!/noindex/.test(m2.robots) && m2.lang==='en' && m2.h1===1 && m2.h3>=4,'indexable, language set, a single H1, and question-style H3s for the FAQ');
 assert(!!m2.rss,'the RSS feed is advertised in the page head');
 const graph=JSON.parse(await a.locator('script[type="application/ld+json"]').first().textContent())['@graph']; const art=graph.find(x=>x['@type']==='BlogPosting'), bc=graph.find(x=>x['@type']==='BreadcrumbList');
 assert(art.image.length===1 && !!art.dateModified && art.wordCount>=900 && art.inLanguage==='en' && art.publisher.logo && art.articleSection==='Maintenance','structured data: BlogPosting with image, dates, word count, publisher logo and section');
 assert(bc.itemListElement.length===4 && bc.itemListElement[2].item.endsWith('/blog/category/maintenance'),'structured data: breadcrumb trail Home › Blog › Maintenance › post');
 assert(await a.locator('nav[aria-label=Breadcrumb] a[href="/blog/category/maintenance"]').count()===1,'a visible breadcrumb links to the category page');
 assert(/<h1[^>]*>How often should you service your air-con/.test(html) && /Wash the filters yourself every 2–4 weeks/.test(html) && !/<script[^>]*>[^<]*alert/.test(html),'the full article text is in the server-rendered HTML (no JavaScript needed to index it)');
 assert(/aircon/i.test(html) && /air-con/i.test(html),'both spellings searchers use ("aircon" and "air-con") appear in the content');
 const cat=await a.goto(BASE+'/blog/category/maintenance'); assert(cat.status()===200 && await a.locator('h1:has-text("Maintenance guides")').count()===1 && /\/blog\/category\/maintenance$/.test(await a.locator('link[rel=canonical]').getAttribute('href')),'the Maintenance category has its own indexable page with its own canonical URL');
 assert((await a.goto(BASE+'/blog/category/nonsense')).status()===404 && (await a.goto(BASE+'/blog/category/product-updates')).status()===404,'unknown or empty categories are 404, not thin pages');
 assert((await (await a.request.get(BASE+'/sitemap.xml')).text()).includes('/blog/category/maintenance'),'the sitemap lists the category page');
 assert((await a.request.get(BASE+'/blog/'+AIRCON.toUpperCase())).status()===404,'URLs are lowercase only (no duplicate-content variants)');

 // ---------------- admin: access
 assert((await a.goto(BASE+'/admin/blog')).url().includes('signin')||/login/.test(a.url()),'signed-out visitors cannot open the blog manager');
 const una=await sess('una@test.dev'); const up=await una.newPage(); await up.goto(BASE+'/admin/blog'); assert(!/Blog · Admin|New post/.test(await up.content()) && /dashboard/.test(up.url()),'a normal user is sent back to the app');
 const adm=await sess('admin@test.dev'); const p=await adm.newPage(); p.on('pageerror',e=>errs.push(e.message));

 // ---------------- admin: list
 await p.goto(BASE+'/admin/blog'); assert(await p.locator('[data-testid=admin-post]').count()>=2 && /Scheduled/.test(await p.locator('[data-testid=admin-post]:has-text("Warranty Checklist")').innerText()) && /Published/.test(await p.locator('[data-testid=admin-post]:has-text("How often should you service")').innerText()),'the list shows the air-con post as Published and the checklist as Scheduled');
 assert(await p.locator('[data-testid=admin-post]:has-text("Warranty Checklist")').innerText().then(t=>/Goes live .* SGT/.test(t)),'the scheduled post shows when it goes live (Singapore time)');
 assert(+(await p.locator('[data-testid=count-scheduled]').innerText())>=1,'the Scheduled tile counts it');
 await p.click('a:has([data-testid=count-scheduled])'); await p.waitForTimeout(500); assert((await p.locator('[data-testid=admin-post]').count())>=1 && await p.locator('[data-testid=admin-post]:has-text("How often should you service")').count()===0,'filtering by Scheduled hides published posts');
 assert(await p.locator('aside a[href="/admin/blog"] >> text=/^\\d+$/').count()>=0 && /Blog/.test(await p.locator('aside[aria-label=Admin] nav').innerText()),'the sidebar has a Blog entry');

 // ---------------- admin: create a draft
 await p.goto(BASE+'/admin/blog/new'); await p.fill('input[name=title]','E2E: Checking gutters twice a year'); 
 assert(await p.inputValue('input[name=slug]')==='e2e-checking-gutters-twice-a-year','the URL name is suggested from the title');
 await p.fill('textarea[name=body]','## Why it matters\n\nBlocked gutters **overflow**.\n\n- [ ] Clear leaves\n- [x] Check downpipes\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))'); await p.selectOption('select[name=category]','Maintenance'); await p.fill('input[name=tags]','Gutters, Rain, gutters');
 assert(await p.locator('[data-testid=seo-panel]').count()===1 && await p.locator('[data-testid=seo-panel] li[data-ok=false]').count()>=3,'the editor has an SEO panel that flags what is missing on a new post');
 await p.fill('input[name=seoTitle]','Gutters Twice a Year'); await p.fill('textarea[name=metaDescription]','Why you should check and clear your gutters twice a year, and how to do it safely before the wet season.');
 assert(/Gutters Twice a Year · Wodejia/.test(await p.locator('[aria-label="Search result preview"]').innerText()) && /Why you should check/.test(await p.locator('[aria-label="Search result preview"]').innerText()),'a live search-result preview shows the title and description');
 await p.click('button:has-text("Save draft")'); await p.waitForURL(/\/admin\/blog\/[0-9a-f-]{36}\?saved=1/); const id=p.url().split('/admin/blog/')[1].split('?')[0];
 const d=(await q('select * from blog_posts where id=$1',[id]))[0]; assert(d.status==='draft' && d.tags==='gutters,rain' && d.author_name==='Wodejia Team' && d.excerpt.length>5,'a draft is saved with cleaned tags and an automatic summary');
 assert((await a.request.get(BASE+'/blog/e2e-checking-gutters-twice-a-year')).status()===404 && !(await (await a.request.get(BASE+'/blog')).text()).includes('E2E: Checking'),'drafts are invisible to readers');
 // preview shows a draft, safely
 const pv=await adm.newPage(); await pv.goto(BASE+'/admin/blog/'+id+'/preview'); assert(await pv.locator('h1:has-text("E2E: Checking gutters")').count()===1 && /not visible to readers/.test(await pv.content()),'the admin preview shows the draft, labelled as not public');
 assert(await pv.locator('article script').count()===0 && /&lt;script&gt;/.test(await pv.content()) && await pv.locator('a[href^="javascript"]').count()===0,'HTML and javascript: links in the body are shown as plain text, never executed');
 // validation
 await p.goto(BASE+'/admin/blog/new'); await p.fill('input[name=title]','Another'); await p.fill('input[name=slug]','e2e-checking-gutters-twice-a-year'); await p.fill('textarea[name=body]','Some body text for the duplicate slug check.'); await p.click('button:has-text("Save draft")'); await p.waitForSelector('text=already uses that URL name'); assert(true,'a duplicate URL name is refused');
 await p.fill('input[name=slug]','Bad Slug'); await p.click('button:has-text("Save draft")'); await p.waitForSelector('text=lowercase letters'); assert(true,'an invalid URL name is refused');
 await p.fill('input[name=slug]','e2e-valid-slug'); await p.locator('label:has(input[value=schedule]) span').first().click(); await p.fill('input[name=publishAt]','2020-01-01T09:00'); await p.evaluate(()=>document.querySelectorAll('form').forEach(f=>f.noValidate=true)); await p.click('button:has-text("Schedule post")'); await p.waitForSelector('text=must be in the future'); assert(true,'scheduling in the past is refused');

 // ---------------- schedule it, then it goes live by itself
 await p.goto(BASE+'/admin/blog/'+id); await p.locator('label:has(input[value=schedule]) span').first().click();
 const when=new Date(Date.now()+3*86400000+8*3600000).toISOString().slice(0,16); await p.fill('input[name=publishAt]',when); await p.click('button:has-text("Schedule post")'); await p.waitForSelector('text=Scheduled.');
 const sc=(await q('select status, publish_at from blog_posts where id=$1',[id]))[0]; assert(sc.status==='published' && Math.abs(sc.publish_at.getTime()-(new Date(when+':00Z').getTime()-8*3600000))<1000,'the time typed in Singapore time is stored as the right UTC instant (UTC+8)');
 assert((await a.request.get(BASE+'/blog/e2e-checking-gutters-twice-a-year')).status()===404,'a scheduled post is not public before its time');
 await q("update blog_posts set publish_at=now() - interval '1 minute' where id=$1",[id]); // the moment passes
 const live=await a.request.get(BASE+'/blog/e2e-checking-gutters-twice-a-year'); assert(live.status()===200 && /<title>Gutters Twice a Year · Wodejia<\/title>/.test(await live.text()),'once the time passes it goes live with no manual step, using the dedicated search title');
 await a.goto(BASE+'/blog'); assert(await a.locator('[data-testid=post-card]:has-text("E2E: Checking")').count()===1,'and appears on the blog list');
 // publish-now keeps the original date; unpublish; delete
 await p.goto(BASE+'/admin/blog/'+id); await p.locator('label:has(input[value=publish]) span').first().click(); const before=(await q('select publish_at from blog_posts where id=$1',[id]))[0].publish_at; await p.click('button:has-text("Publish")'); await p.waitForSelector('text=Published.');
 assert(Math.abs((await q('select publish_at from blog_posts where id=$1',[id]))[0].publish_at-before)<1000,'re-saving a live post keeps its original publish date');
 await p.click('button:has-text("Move back to draft")'); await p.waitForTimeout(1200); assert((await q('select status from blog_posts where id=$1',[id]))[0].status==='draft' && (await a.request.get(BASE+'/blog/e2e-checking-gutters-twice-a-year')).status()===404,'moving it back to draft takes it offline');
 await p.goto(BASE+'/admin/blog/'+id); p.once('dialog',d=>d.accept()); await p.click('button:has-text("Delete post")'); await p.waitForURL(/admin\/blog\?deleted=1/); assert((await q('select count(*)::int c from blog_posts where id=$1',[id]))[0].c===0,'a post can be deleted');
 const aud=(await q("select action from audit_log where action like 'blog.%' order by created_at")).map(r=>r.action); assert(['blog.create','blog.update','blog.unpublish','blog.delete'].every(x=>aud.includes(x)),'blog changes are written to the audit log');
 // restore the real schedule for the warranty post
 await q("update blog_posts set publish_at='2026-11-13 01:00:00' where slug=$1",[WARRANTY]);

 // ---------------- layout on three sizes
 for(const [n,vp] of [['desktop',{width:1440,height:900}],['tablet',{width:820,height:1180}],['phone',{width:390,height:844}]]){
  const c=await browser.newContext({viewport:vp}); const pg=await c.newPage(); 
  for(const path of ['/blog','/blog/'+AIRCON]){ await pg.goto(BASE+path); await pg.waitForTimeout(400); assert(await pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${n}: ${path.slice(0,22)} has no sideways scrolling`); if(path==='/blog') await pg.screenshot({path:`${S}/blog-${n}.png`,fullPage:true}); }
  await c.close();
  const ac=await sess('admin@test.dev',vp); const ap=await ac.newPage(); for(const path of ['/admin/blog','/admin/blog/new']){ await ap.goto(BASE+path); await ap.waitForTimeout(400); assert(await ap.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${n}: admin ${path} has no sideways scrolling`); } await ac.close();
 }
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})();
