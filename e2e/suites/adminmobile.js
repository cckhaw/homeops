const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt'); const { Pool } = require('pg');
const BASE='http://localhost:3100', S=process.argv[2]; const pool=new Pool({connectionString:'postgresql://postgres@localhost:5544/homeops'});
(async()=>{ const b=await chromium.launch(); const t=await encode({token:{email:'admin@test.dev',sub:'a',sv:0},secret:'localtestsecretlocaltestsecret1234'});
 const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); const p=await c.newPage();
 const una=(await pool.query("select id from profiles where email='una@test.dev'")).rows[0].id;
 for (const [name,path] of [['analytics','/admin'],['users','/admin/users'],['user','/admin/users/'+una],['brands','/admin/brands'],['audit','/admin/audit'],['settings','/admin/settings']]) {
   await p.goto(BASE+path); await p.waitForTimeout(700);
   const over=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth}));
   const small=await p.evaluate(()=>[...document.querySelectorAll('a,button,input,select')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.height<40||r.width<40)&&getComputedStyle(e).visibility!=='hidden'&&e.type!=='hidden'&&e.type!=='checkbox'}).slice(0,6).map(e=>(e.getAttribute('aria-label')||e.textContent||e.name||e.tagName).trim().slice(0,28)+` ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
   console.log(name.padEnd(10),'horizontal overflow:',over.sw>over.iw?`YES (${over.sw}>${over.iw})`:'no','| small targets:',JSON.stringify(small));
   await p.screenshot({path:`${S}/am-${name}.png`}); }
 await b.close(); await pool.end(); })();
