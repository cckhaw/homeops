// Form-control alignment on desktop, tablet and phone: every control fits its cell, controls in a row share a height, no sideways scrolling.
const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]||'.'; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=async(sql,a=[])=>(await pool.query(sql,a)).rows;
const VIEWS=[['desktop',{width:1280,height:900}],['tablet',{width:820,height:1180}],['phone',{width:390,height:844}]];
(async()=>{
 const browser=await chromium.launch();
 const sv=(await q("select session_version v from profiles where email='una@test.dev'"))[0].v; const token=await encode({token:{email:'una@test.dev',sub:'una',sv},secret:'localtestsecretlocaltestsecret1234'});
 // one asset so the detail page (service form, edit form) exists
 const boot=await browser.newContext(); await boot.addCookies([{name:'next-auth.session-token',value:token,url:BASE}]); const bp=await boot.newPage(); await bp.goto(BASE+'/dashboard/assets'); await bp.click('text=Add asset'); await bp.fill('input[name=name]','Fridge'); await bp.click('button:has-text("Add to passport")'); await bp.waitForURL(/assets\/[0-9a-f-]{36}/); const assetUrl=bp.url().replace(BASE,''); await boot.close();
 const pages=[['documents','/dashboard/documents'],['bills','/dashboard/bills'],['contractors','/dashboard/contractors'],['asset page',assetUrl],['schedule','/dashboard/schedule'],['settings','/dashboard/settings'],['homes','/dashboard/homes']];
 for(const [vname,vp] of VIEWS){
  const ctx=await browser.newContext({viewport:vp}); await ctx.addCookies([{name:'next-auth.session-token',value:token,url:BASE}]); const p=await ctx.newPage();
  for(const [name,url] of pages){
   await p.goto(BASE+url); await p.waitForTimeout(600);
   if(name==='asset page'){ const det=p.locator('summary:has-text("Edit")').first(); if(await det.count()) await det.click().catch(()=>{}); }
   const res=await p.evaluate(()=>{
    const out={bad:[],rows:[],controls:0,scroll:document.documentElement.scrollWidth>window.innerWidth};
    const els=[...document.querySelectorAll('.input,.file-input')].filter(e=>e.offsetParent!==null&&e.tagName!=='TEXTAREA');
    out.controls=els.length;
    for(const e of els){ const r=e.getBoundingClientRect(); const cell=(e.closest('label')||e.parentElement).getBoundingClientRect(); const lbl=e.name||e.type;
      if(r.right>cell.right+1||r.left<cell.left-1) out.bad.push(`${lbl} overflows its cell (${Math.round(r.left)}-${Math.round(r.right)} vs ${Math.round(cell.left)}-${Math.round(cell.right)})`);
      if(r.right>window.innerWidth+1) out.bad.push(`${lbl} runs off the screen`);
      if(/date|month/.test(e.type)){ const cs=getComputedStyle(e); if(cs.textAlign!=='left'&&cs.textAlign!=='start') out.bad.push(`${lbl} text is ${cs.textAlign}`); }
    }
    // controls on the same visual row must be the same height
    const byRow=new Map(); for(const e of els){ const r=e.getBoundingClientRect(); const k=Math.round(r.top/6); (byRow.get(k)||byRow.set(k,[]).get(k)).push([e,r]); }
    for(const [,list] of byRow){ if(list.length>1){ const hs=list.map(([,r])=>Math.round(r.height)); if(Math.max(...hs)-Math.min(...hs)>1) out.bad.push(`row heights differ: ${list.map(([e,r])=>(e.name||e.type)+':'+Math.round(r.height)).join(', ')}`); } }
    return out;
   });
   assert(res.bad.length===0&&!res.scroll,`${vname} · ${name}: ${res.controls} controls aligned${res.bad.length?' — '+res.bad.slice(0,3).join('; '):''}${res.scroll?' — page scrolls sideways':''}`);
   if(['documents','bills'].includes(name)) await p.screenshot({path:`${S}/layout-${name}-${vname}.png`,fullPage:false});
  }
  await ctx.close();
 }
 await browser.close(); await pool.end();
})();
