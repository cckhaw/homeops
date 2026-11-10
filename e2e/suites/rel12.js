// Release A: nameplate (model sticker) scan and the warranty claim helper.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg'); const zlib = require('zlib'); const { unzipSync } = require('fflate');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const crcT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc=b=>{let c=0xffffffff;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0};
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c])};
const png=(w,h)=>{const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;const row=Buffer.concat([Buffer.from([0]),Buffer.from(Array(w).fill([120,120,120]).flat())]);return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(Buffer.concat(Array(h).fill(row)))),chunk('IEND',Buffer.alloc(0))])};
(async()=>{
 const browser=await chromium.launch(); const errs=[];
 const sess=async(email,vp)=>{ const sv=(await q('select session_version v from profiles where email=$1',[email]))[0].v; const t=await encode({token:{email,sub:email,sv},secret:'localtestsecretlocaltestsecret1234'}); const c=await browser.newContext({viewport:vp||{width:1280,height:900},permissions:['clipboard-read','clipboard-write']}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); return c; };
 const uc=await sess('una@test.dev'); const p=await uc.newPage(); p.on('pageerror',e=>errs.push(e.message));
 const fs=require('fs'); fs.mkdirSync(S+'/r12',{recursive:true}); fs.writeFileSync(S+'/r12/label.png',png(64,48));

 // ------------- nameplate scan in the Add asset sheet
 await p.goto(BASE+'/dashboard/assets'); await p.click('button:has-text("Add asset")'); await p.waitForSelector('[role=dialog] input[name=name]');
 const dlg=p.locator('[role=dialog]');
 assert(await dlg.locator('input[aria-label="Photo of the model sticker"]').count()===1 && await dlg.locator('button:has-text("Read label")').count()===0,'the form offers a model-sticker photo; the button only appears once a photo is chosen');
 await dlg.locator('input[aria-label="Photo of the model sticker"]').setInputFiles(S+'/r12/label.png'); await dlg.locator('button:has-text("Read label")').click();
 await dlg.getByText(/Read the brand, model and serial number/).waitFor({timeout:30000});
 assert((await dlg.locator('input[name=model]').inputValue())==='FTKM25VAVMV' && (await dlg.locator('input[name=serialNumber]').inputValue())==='G123456','the model and serial are filled in with the label words ("Model:", "S/N") stripped');
 assert(/Daikin/i.test(await dlg.locator('input[name=make], [name=make]').first().inputValue().catch(()=> '')) || /Daikin/.test(await dlg.innerText()),'the brand is filled in');
 assert((await dlg.locator('input[name=name]').inputValue())==='Inverter air conditioner' && /made 2024-05/.test(await dlg.innerText()),'an empty name is filled in, and the manufacture date is mentioned');
 const calls=JSON.parse(fs.readFileSync(S+'/anthropic.json')); assert(calls.some(c=>c.mode==='label'),'the photo was read through the label scanner (not as a receipt)');
 assert(await dlg.locator('input[type=file][name]').evaluateAll(e=>e.every(x=>x.name!=='label')),'the sticker photo is not submitted with the form (it is only read, never saved)');
 await dlg.locator('input[name=model]').fill('KEEP-ME'); await dlg.locator('input[aria-label="Photo of the model sticker"]').setInputFiles(S+'/r12/label.png'); await dlg.locator('button:has-text("Read label")').click(); await p.waitForTimeout(1500);
 assert((await dlg.locator('input[name=model]').inputValue())==='FTKM25VAVMV','a second read replaces model and serial with what the sticker says');
 await dlg.locator('input[name=installDate]').fill('2025-03-09'); await dlg.locator('input[name=warrantyExpiry]').fill('2027-03-09');
 await dlg.locator('button:has-text("Add to passport")').first().click(); await p.waitForTimeout(2500);
 const asset=(await q("select id,name,make,model,serial_number from assets where model='FTKM25VAVMV'"))[0]; assert(!!asset && asset.serial_number==='G123456','the scanned asset was saved');
 // ------------- claim helper
 await p.goto(BASE+'/dashboard/assets/'+asset.id); assert(await p.locator(`a[href="/dashboard/assets/${asset.id}/claim"]`).count()===1,'the asset page has a "Claim warranty" button');
 await p.click(`a[href="/dashboard/assets/${asset.id}/claim"]`); await p.waitForURL(/\/claim$/);
 assert(await p.locator('h1:has-text("Warranty claim")').count()===1 && /Warranty claim: .*FTKM25VAVMV \(serial G123456\)/.test(await p.getByTestId('claim-subject').innerText()),'the claim page writes a subject from the item');
 let body=await p.getByTestId('claim-body').innerText(); assert(/Serial number: G123456/.test(body) && /Warranty valid until: 9 Mar 2027/.test(body) && /Date of purchase \/ installation: 9 Mar 2025/.test(body),'the letter carries the serial, purchase date and warranty date');
 const warn=await p.locator('ul[aria-label="Before you send"]').innerText(); assert(/No receipt is saved/.test(warn) && /Describe the fault/.test(warn),'it warns about the missing receipt and fault description');
 await p.fill('textarea[aria-label="What is wrong?"]','It blows warm air.'); await p.fill('input[aria-label="When did it start"]','2026-11-01'); await p.selectOption('select[aria-label="What would you like"]','replace'); await p.fill('input[aria-label="Send to"]','support@daikin.example');
 body=await p.getByTestId('claim-body').innerText(); assert(/It blows warm air\./.test(body) && /First noticed: 1 Nov 2026/.test(body) && /replaced under warranty/.test(body) && /Dear Daikin Customer Support/.test(body),'the letter updates as you type (fault, date, replacement request)');
 assert(!/Describe the fault/.test(await p.locator('ul[aria-label="Before you send"]').innerText()),'and the fault warning goes away');
 await p.click('button:has-text("Copy letter")'); await p.waitForTimeout(400); assert(/Subject: Warranty claim/.test(await p.evaluate(()=>navigator.clipboard.readText())) && /It blows warm air/.test(await p.evaluate(()=>navigator.clipboard.readText())),'Copy letter puts subject and body on the clipboard');
 const mail=await p.locator('a:has-text("Open in e-mail app")').getAttribute('href'); assert(mail.startsWith('mailto:support%40daikin.example?subject=') && mail.length<2400,'the e-mail link is addressed to the support address and is short enough for mail apps');
 const zipHref=await p.getByTestId('claim-zip').getAttribute('href'); const zr=await p.request.get(BASE+zipHref); const files=unzipSync(new Uint8Array(await zr.body()));
 assert(zr.status()===200 && zr.headers()['content-type']==='application/zip' && Object.keys(files).includes('claim-letter.txt') && Object.keys(files).includes('README.txt'),`the claim pack downloads as a zip (${Object.keys(files).join(', ')})`);
 const txt=Buffer.from(files['claim-letter.txt']).toString(); assert(/It blows warm air/.test(txt) && /replaced under warranty/.test(txt) && /G123456/.test(txt) && /Una/.test(txt),'its letter has the same fault, request, serial and the signed-in user\'s name');
 assert((await q("select count(*)::int n from audit_log where action='claim.pack'"))[0].n>=1,'downloading a claim pack is audit-logged');
 // print view hides everything but the letter
 await p.emulateMedia({media:'print'}); const vis=await p.evaluate(()=>({aside:getComputedStyle(document.querySelector('aside')?.parentElement||document.body).display, letter:getComputedStyle(document.getElementById('claim-letter')).display, form:getComputedStyle(document.querySelector('textarea').closest('div.space-y-4')).display}));
 assert(vis.letter!=='none' && vis.form==='none' && vis.aside==='none','when printing, only the letter shows (menu and form are hidden)'); await p.emulateMedia({media:'screen'});
 // expired warranty tone
 await q("update assets set warranty_expiry='2025-01-01' where id=$1",[asset.id]); await p.reload();
 assert(/warranty ended on 1 Jan 2025/i.test(await p.locator('ul[aria-label="Before you send"]').innerText()) && /I understand the warranty period has ended/.test(await p.getByTestId('claim-body').innerText()),'an expired warranty is flagged and the letter asks politely for help');
 // access control
 const vc=await sess('vic@test.dev'); const vr=await vc.request.get(BASE+zipHref); assert(vr.status()===404,'a user outside the home cannot download its claim pack');
 const anon=await browser.newContext(); assert((await anon.request.get(BASE+zipHref,{maxRedirects:0})).status()===401,'signing in is required');
 assert((await (await vc.newPage()).goto(BASE+`/dashboard/assets/${asset.id}/claim`)).status()===404,'and the claim page is 404 for them');
 // phone
 const pc=await sess('una@test.dev',{width:390,height:844}); const ph=await pc.newPage(); await ph.goto(BASE+`/dashboard/assets/${asset.id}/claim`); assert(await ph.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone: the claim page fits without sideways scrolling'); await ph.screenshot({path:S+'/claim-phone.png',fullPage:true});
 await p.screenshot({path:S+'/claim-desktop.png',fullPage:true});
 assert(errs.length===0,'no page errors '+errs.join('|'));
 await browser.close(); await pool.end();
})().catch(e=>{console.error('FAIL crashed',e);process.exit(1)});
