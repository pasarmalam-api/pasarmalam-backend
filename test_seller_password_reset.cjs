const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  let payload,fail=false;
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/')){
    payload=route.request().postDataJSON();
    return route.fulfill({status:fail?503:200,json:fail?{error:'Email unavailable'}:{ok:true,message:'Request received'}});
   }
   const file='landing-site-v2/buyer/'+url.pathname.split('/').pop();
   return route.fulfill({body:fs.existsSync(file)?fs.readFileSync(file):'',contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});
  });
  for(const file of ['landing-site-v2/seller/login.html','seller-app/login.html'])
   assert.match(fs.readFileSync(file,'utf8'),/password-reset.html\?mode=seller">Forgot password\?/);
  await page.goto('https://buyer.test/password-reset.html?mode=seller');
  await page.locator('#email').fill('seller@example.test');
  await page.locator('#requestForm button').click();
  await page.waitForFunction(()=>document.querySelector('#resetStatus').textContent==='Request received');
  assert.equal(payload.mode,'seller');
  assert.equal(await page.locator('#signInLink').getAttribute('href'),'https://www.pasarmalamapp.com/seller/login.html');
  fail=true;
  await page.locator('#requestForm button').click();
  await page.waitForFunction(()=>document.querySelector('#resetStatus').textContent==='Email unavailable');
  fail=false;
  await page.goto('https://buyer.test/password-reset.html#email=seller%40example.test&token=test-token&mode=seller');
  assert.equal(await page.locator('#confirmForm').isVisible(),true);
  assert.equal(new URL(page.url()).hash,'');
  await page.locator('#newPassword').fill('new-password');
  await page.locator('#confirmPassword').fill('new-password');
  await page.locator('#confirmForm button').click();
  await page.locator('#signInLink').waitFor({state:'visible'});
  assert.equal(payload.token,'test-token');
  assert.equal(await page.locator('#newLink').getAttribute('href'),'password-reset.html?mode=seller');
  console.log('Seller reset: link, request, failure, confirmation and seller return passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
