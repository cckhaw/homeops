const { chromium } = require('playwright'); const fs=require('fs'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const PW='correct horse battery staple';
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const mails=()=>JSON.parse(fs.readFileSync(S+'/mails.json'));
const login=async(pg,email,pw=PW)=>{ await pg.goto(BASE+'/login'); await pg.fill('input[type=email]',email); await pg.locator('input[type=password]').fill(pw); await pg.click('button:has-text("Sign in")'); };
const iso=(d)=>{const x=new Date(Date.now()+d*86400000);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 // =============== A. regional defaults, locale, currency, climate (a Malaysian visitor)
 const my=await browser.newContext({viewport:{width:1280,height:900},locale:'ms-MY'}); const p=await my.newPage(); p.on('pageerror',e=>errs.push(e.message));
 // a brand-new Malaysian user: first sign-in creates their home from the browser language
 await q("insert into profiles(id,email,full_name,email_verified_at,password_hash) select gen_random_uuid(),'siti@test.dev','Siti Aminah',now(),password_hash from profiles where email='una@test.dev'");
 await login(p,'siti@test.dev'); await p.waitForURL(BASE+'/dashboard');
 let h=(await q("select h.* from households h join profiles p on p.id=h.owner_id where p.email='siti@test.dev'"))[0];
 assert(h.currency==='MYR' && h.climate==='tropical','new home defaults from the browser language (ms-MY → MYR + tropical)');
 let tasks=(await q("select title from maintenance_tasks where household_id=$1",[h.id])).map(r=>r.title);
 assert(tasks.includes('Termite inspection') && tasks.some(t=>/air-conditioner filters/.test(t)) && !tasks.some(t=>/Winterize/.test(t)),`tropical seasonal tasks seeded, no winterizing (${tasks.length} tasks)`);
 await p.goto(BASE+'/dashboard/settings/appearance'); assert(await p.locator('select[name=locale] option:checked').textContent().then(t=>/Bahasa Melayu — Malaysia/.test(t)),'settings shows the detected language as "Automatic"');
 await p.goto(BASE+'/dashboard/settings/home'); assert((await p.locator('select[name=currency]').inputValue())==='MYR' && (await p.locator('select[name=climate]').inputValue())==='tropical','home settings show MYR + tropical');
 // asset with an Air Conditioner category -> aircon tasks; warranty in 10 days
 await p.goto(BASE+'/dashboard/assets'); await p.click('text=Add asset'); await p.fill('input[name=name]','Living room aircon'); await p.selectOption('select[name=category]','Air Conditioner'); await p.fill('input[name=warrantyExpiry]',iso(10)); await p.click('button:has-text("Add to passport")'); await p.waitForURL(/assets\/[0-9a-f-]{36}/);
 const aid=p.url().match(/assets\/([0-9a-f-]{36})/)[1];
 assert(await p.locator('text=Professional servicing (chemical wash)').count()>0,'Air Conditioner category generates its own maintenance tasks');
 // currency: service record cost shows in ringgit
 assert(await p.locator('label:has-text("Cost (MYR)")').count()>0,'cost field is labelled with the home currency');
 await p.fill('input[name=description]','Gas top-up'); await p.fill('input[name=cost]','150'); await p.click('button:has-text("Add service record")'); await p.waitForSelector('text=Gas top-up');
 assert(/RM\s?150\.00/.test(await p.textContent('body')),'service cost is displayed as RM150.00');
 // change home currency to SGD, climate -> temperate and add suggested tasks
 await p.goto(BASE+'/dashboard/settings/home'); await p.selectOption('select[name=currency]','SGD'); await p.selectOption('select[name=climate]','temperate'); await p.click('button:has-text("Save home")'); await p.waitForSelector('text=Home updated');
 await p.goto(BASE+'/dashboard/assets/'+aid); assert(/SGD\s?150\.00/.test(await p.textContent('body')) && !/RM\s?150/.test(await p.textContent('body')),'changing the home currency re-formats existing costs (ms-MY writes "SGD 150.00")');
 await p.goto(BASE+'/dashboard/settings/home'); await p.click('button:has-text("Add suggested tasks")'); await p.waitForSelector('text=Added');
 tasks=(await q("select title from maintenance_tasks where household_id=$1",[h.id])).map(r=>r.title);
 assert(tasks.includes('Winterize outdoor faucets') && tasks.includes('Termite inspection'),'"Add suggested tasks" adds the temperate set without removing existing tasks');
 await p.click('button:has-text("Add suggested tasks")'); await p.waitForSelector('text=already has all');
 assert(true,'running it again adds nothing (no duplicates)');
 // locale: switch to en-GB -> dates re-format
 await p.goto(BASE+'/dashboard/settings/appearance'); await p.selectOption('select[name=locale]','en-US'); await p.click('form:has(select[name=locale]) button:has-text("Save")'); await p.waitForSelector('text=Saved.'); await p.goto(BASE+'/dashboard/assets/'+aid);
 const us=await p.textContent('body'); await p.goto(BASE+'/dashboard/settings/appearance'); await p.selectOption('select[name=locale]','en-GB'); await p.click('form:has(select[name=locale]) button:has-text("Save")'); await p.waitForSelector('text=Saved.'); await p.goto(BASE+'/dashboard/assets/'+aid);
 const gb=await p.textContent('body'); const mUS=us.match(/([A-Za-z]{3}) (\d{1,2}), (\d{4})\s*·?/), mGB=gb.match(/(\d{1,2}) ([A-Za-z]{3}) (\d{4})/);
 assert(mUS && mGB,`dates follow the chosen format (US: "${mUS&&mUS[0]}", UK: "${mGB&&mGB[0]}")`);

 // =============== B. warranty reminders
 await p.goto(BASE+'/dashboard/settings/notifications'); await p.locator('input[name=notify]').check(); await p.selectOption('select[name=warranty]','30'); await p.click('form:has(input[name=notify]) button:has-text("Save")'); await p.waitForSelector('text=Reminders are on');
 assert((await q("select warranty_lead_days w, notify_reminders n from profiles where email='siti@test.dev'"))[0].w===30,'warranty lead time saved');
 let before=mails().length; await p.click('button:has-text("Send me a test reminder")'); await p.waitForSelector('text=/Sent by e-mail/'); let m=mails().at(-1);
 assert(mails().length===before+1 && /Warranties ending soon/.test(m.html) && /Living room aircon/.test(m.html) && /warranty/.test(m.subject),'test e-mail lists the warranty that ends in 10 days');
 await q("update profiles set locale=null where email='siti@test.dev'");
 const cron=()=>my.request.get(BASE+'/api/cron/reminders',{headers:{authorization:'Bearer croncroncron'}}).then(r=>r.json());
 const c1=await cron(); assert(c1.emails>=1 && c1.warranties>=1,`cron sends the warranty notice (${JSON.stringify(c1)})`);
 const c2=await cron(); assert(c2.warranties===0,'the same warranty notice is not sent again');
 await q("update assets set warranty_expiry=$1 where id=$2",[iso(3),aid]); const c3=await cron(); assert(c3.warranties===1,'a "final week" notice is sent later, once');
 const c4=await cron(); assert(c4.warranties===0,'…and not repeated');
 await q("update profiles set warranty_lead_days=0 where email='siti@test.dev'"); await q("delete from asset_reminders"); await q("update assets set warranty_expiry=$1 where id=$2",[iso(2),aid]); const c5=await cron(); assert(c5.warranties===0,'warranty reminders off → none sent');

 // =============== C. photos
 await p.goto(BASE+'/dashboard/assets/'+aid); const noPhoto=await p.locator(`img[src="/api/files/${aid}/photo"]`).count(); assert(noPhoto===0,'no photo → no image element');
 // client-side compression of a big photo
 const sizes=await p.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=3000;c.height=3000; const x=c.getContext('2d'); const img=x.createImageData(3000,3000); for(let i=0;i<img.data.length;i++) img.data[i]=Math.random()*255; x.putImageData(img,0,0);
   const blob=await new Promise(r=>c.toBlob(r,'image/png')); const f=new File([blob],'big.png',{type:'image/png'}); const input=document.querySelector('input[name=photo]'); const dt=new DataTransfer(); dt.items.add(f); input.files=dt.files; input.dispatchEvent(new Event('change',{bubbles:true}));
   await new Promise(r=>setTimeout(r,2500)); const out=input.files[0]; return {before:f.size,after:out.size,type:out.type,name:out.name}; });
 assert(sizes.after<sizes.before/2 && sizes.type==='image/jpeg',`photo is shrunk before upload (${(sizes.before/1e6).toFixed(1)} MB → ${(sizes.after/1e6).toFixed(2)} MB, ${sizes.type})`);
 await p.click('button:has-text("Save changes")'); await p.waitForSelector('text=not configured'); assert(true,'photo upload without storage shows a friendly message');
 await q("update assets set photo_url='https://abc.private.blob.vercel-storage.com/photos/x/p.jpg' where id=$1",[aid]);
 await p.goto(BASE+'/dashboard/assets'); assert(await p.locator(`img[src="/api/files/${aid}/photo"]`).count()===1,'asset list card shows the photo through the authenticated route');
 await p.goto(BASE+'/dashboard/assets/'+aid); assert(await p.locator(`img[src="/api/files/${aid}/photo"]`).count()>=1 && await p.locator('input[name=removePhoto]').count()===1,'asset page shows the photo and a "remove photo" option');
 assert(!(await p.content()).includes('private.blob.vercel-storage.com'),'raw storage address never reaches the browser');
 const anon=await browser.newContext(); assert((await anon.request.get(BASE+`/api/files/${aid}/photo`)).status()===401,'photo route requires sign-in');
 const exp=await (await my.request.get(BASE+'/api/export')).json(); assert(exp.homes[0].assets.some(a=>a.photoDownload && !a.photoUrl),'export gives a download link, not the raw photo URL');
 // public passport must not expose photos
 const ptok=(await q("select passport_token t from households where id=$1",[h.id]))[0].t; const pub=await (await anon.request.get(BASE+'/api/passport/'+ptok)).text(); assert(!/photo/i.test(pub),'public passport data contains no photo information');

 // =============== D. error pages, share images, robots, sitemap
 const nf=await anon.request.get(BASE+'/this-page-does-not-exist'); const nft=await nf.text(); assert(nf.status()===404 && /Page not found/.test(nft) && /Go to my dashboard/.test(nft),'unknown URL → branded 404 page');
 const rob=await (await anon.request.get(BASE+'/robots.txt')).text(); assert(/Disallow: \/dashboard/.test(rob) && /Disallow: \/admin/.test(rob) && /Disallow: \/passport\//.test(rob) && /Sitemap: .*\/sitemap\.xml/.test(rob) && /Allow: \/privacy/.test(rob),'robots.txt blocks private areas and points to the sitemap');
 const sm=await (await anon.request.get(BASE+'/sitemap.xml')).text(); assert(/<loc>[^<]*\/privacy<\/loc>/.test(sm) && /<loc>[^<]*\/terms<\/loc>/.test(sm) && !/dashboard|admin|passport/.test(sm),'sitemap lists public pages only');
 const og=await anon.request.get(BASE+'/opengraph-image'); const ogb=await og.body(); assert(og.status()===200 && og.headers()['content-type']==='image/png' && ogb.readUInt32BE(16)===1200 && ogb.readUInt32BE(20)===630,'site share image is a 1200×630 PNG');
 assert(/og:image/.test(await (await anon.request.get(BASE+'/')).text()) && /twitter:card/.test(await (await anon.request.get(BASE+'/')).text()),'home page advertises og:image and a large twitter card');
 const pog=await anon.request.get(BASE+`/passport/${ptok}/opengraph-image`); assert(pog.status()===200 && pog.headers()['content-type']==='image/png','passport share image renders');
 const pgen=await anon.request.get(BASE+`/passport/doesnotexisttoken/opengraph-image`); assert(pgen.status()===200,'unknown passport link still gets a generic card (no error)');
 await q("update households set passport_password_hash='scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA' where id=$1",[h.id]); const lockedPng=(await (await anon.request.get(BASE+`/passport/${ptok}/opengraph-image`)).body()); const genericPng=(await (await anon.request.get(BASE+`/passport/doesnotexisttoken/opengraph-image`)).body());
 assert(lockedPng.equals(genericPng),'a password-protected passport share image is identical to the generic one (home name not leaked)');
 await q("update households set passport_password_hash=null where id=$1",[h.id]);
 console.log('page errors:',errs); await browser.close(); await pool.end();
})().catch(e=>{console.error(e);process.exit(1)});
