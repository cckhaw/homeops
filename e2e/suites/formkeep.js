const { chromium } = require('playwright'); const { encode } = require('next-auth/jwt');
const BASE='http://localhost:3100'; const assert=(c,m)=>{ if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
(async()=>{ const b=await chromium.launch(); const t=await encode({token:{email:'una@test.dev',sub:'u',sv:0},secret:'localtestsecretlocaltestsecret1234'});
 const c=await b.newContext({viewport:{width:1100,height:900}}); await c.addCookies([{name:'next-auth.session-token',value:t,url:BASE}]); const p=await c.newPage();
 await p.goto(BASE+'/dashboard/assets'); await p.click('text=Add asset'); await p.fill('input[name=name]','Dryer'); await p.click('button:has-text("Add to passport")'); await p.waitForURL(/assets\/[0-9a-f-]{36}/);
 // service form: error keeps typed values, success clears them
 await p.evaluate(()=>{document.querySelectorAll('form').forEach(f=>f.noValidate=true)}); await p.fill('input[name=provider]','Acme Repairs'); await p.fill('input[name=cost]','42'); await p.click('button:has-text("Add service record")'); await p.waitForSelector('text=Describe the service'); await p.waitForTimeout(700);
 assert((await p.inputValue('input[name=provider]'))==='Acme Repairs' && (await p.inputValue('input[name=cost]'))==='42','service form keeps what you typed when the server reports an error');
 await p.fill('input[name=description]','Replaced belt'); await p.click('button:has-text("Add service record")'); await p.waitForSelector('li:has-text("Replaced belt")'); await p.waitForTimeout(700);
 assert((await p.inputValue('input[name=description]'))==='' && (await p.inputValue('input[name=provider]'))==='' && (await p.inputValue('input[name=cost]'))==='','…and empties after a successful save, ready for the next one');
 // task form
 await p.goto(BASE+'/dashboard/schedule'); await p.fill('form:has(input[name=dueDate]) input[name=title]','Check hoses'); await p.click('button:has-text("Add task")'); await p.waitForSelector('text=Task added'); await p.waitForTimeout(700);
 assert((await p.inputValue('form:has(button:has-text("Add task")) input[name=title]'))==='','task form empties after adding a task');
 // profile + locale keep their values after saving
 await p.goto(BASE+'/dashboard/settings'); await p.fill('input[name=fullName]','Una Updated'); await p.click('button:has-text("Save profile")'); await p.waitForSelector('text=Profile updated'); await p.waitForTimeout(700);
 assert((await p.inputValue('input[name=fullName]'))==='Una Updated','profile name stays as typed after saving');
 await p.selectOption('select[name=locale]','en-GB'); await p.click('form:has(select[name=locale]) button:has-text("Save")'); await p.waitForSelector('text=Saved.'); await p.waitForTimeout(700);
 assert((await p.inputValue('select[name=locale]'))==='en-GB','language & region keeps the chosen format after saving');
 await p.locator('input[name=notify]').check(); await p.selectOption('select[name=warranty]','60'); await p.click('form:has(input[name=notify]) button:has-text("Save")'); await p.waitForSelector('text=Reminders are on'); await p.waitForTimeout(700);
 assert((await p.inputValue('select[name=warranty]'))==='60' && await p.locator('input[name=notify]').isChecked(),'reminder settings keep their values after saving');
 await b.close(); })();
