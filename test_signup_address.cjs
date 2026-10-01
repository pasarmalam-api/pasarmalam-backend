const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext();let signupData;
  await context.addInitScript(()=>{localStorage.setItem('pasarmalam-lang','en');localStorage.setItem('pasarmalam-buyer-lang-version','20260903-ms-default');});
  await context.route('**/*',route=>{
   const req=route.request();if(req.url().startsWith(origin))return route.continue();
   if(new URL(req.url()).pathname==='/api/auth/signup'){signupData=req.postDataJSON();return route.fulfill({json:{error:'Test intercepted'}});}
   return route.fulfill({json:{email_otp_token:'test',notifications:[]}});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [360,402,1440]){
   signupData=null;await page.setViewportSize({width,height:900});await page.goto(origin+'/buyer/signup.html');
   await page.locator('#name').fill('Test Buyer');await page.locator('#phone').fill('01123456789');
   await page.locator('#email').fill('test@example.com');await page.locator('#otp').fill('123456');
   await page.evaluate(()=>verifyEmailOtp());await page.locator('#password').fill('test-password');await page.locator('#agree').check();
   await page.evaluate(()=>signup());assert.equal(signupData,null);
   await page.locator('#address').fill('Jalan Perdana, CBD Perdana 3, Cyber 12');await page.locator('#addressUnit').fill('F-LG-R5');
   await page.locator('#addressPostcode').fill('prin');assert.equal(await page.locator('#addressPostcode').inputValue(),'');
   await page.evaluate(()=>signup());assert.equal(signupData,null);
   await page.locator('#addressPostcode').fill('63000');await page.evaluate(()=>signup());assert.equal(signupData,null);
   await page.locator('#addressCity').fill('Cyberjaya');await page.evaluate(()=>signup());assert.equal(signupData,null);
   await page.locator('#addressState').selectOption('Selangor');await page.evaluate(()=>signup());
   assert.equal(signupData.address,'F-LG-R5, Jalan Perdana, CBD Perdana 3, Cyber 12, 63000 Cyberjaya, Selangor, Malaysia');
   assert.equal(signupData.address_fields.postcode,'63000');
   for(const [lang,label] of [['zh','邮政编码'],['ms','Poskod'],['en','Postcode']]){
    await page.locator('#langToggle,.buyer-lang-toggle').first().click();
    await page.waitForFunction(l=>document.documentElement.lang===l,lang);
    assert.equal(await page.locator('label[for="addressPostcode"]').innerText(),label);
    assert.equal(await page.locator('#addressState').inputValue(),'Selangor');
    assert.equal(await page.locator('#addressPostcode').inputValue(),'63000');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   fs.mkdirSync('release-zips/checkout-audit',{recursive:true});await page.screenshot({path:path.resolve('release-zips/checkout-audit/signup-address-'+width+'.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log('PASS registration required address, numeric postcode, canonical payload and three viewport widths');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
