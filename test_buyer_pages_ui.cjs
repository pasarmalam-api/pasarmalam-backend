const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve('landing-site-v2/buyer');
const products=[{id:1,seller_id:2,name:'USB C Cable',shop:'Accessory Shop',category:'Chargers',price:10,stock:5,condition:'New',price_mode:'Fixed',shop_open:true,image_url:'http://buyer.test/pasarmalam-logo.png',images:['http://buyer.test/pasarmalam-logo.png'],variants:[]}];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const failures=[],requests=[];
 try{
  const ctx=await browser.newContext();
  await ctx.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='buyer.test'){
    const file=path.join(root,url.pathname);
    if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
    return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.jpg')?'image/jpeg':'text/html'});
   }
   if(url.hostname==='pasarmalam-backend.onrender.com'){
    if(route.request().method()!=='GET')requests.push({path:url.pathname,body:route.request().postDataJSON()});
    if(url.pathname==='/api/otp/email/send')return route.fulfill({json:{ok:true,message:'OTP sent to email.'}});
    if(url.pathname==='/api/otp/email/verify')return route.fulfill({json:{ok:true,email_otp_token:'mock-verification'}});
    if(url.pathname==='/api/auth/signup')return route.fulfill({json:{token:'mock-token',user:{id:99,role:'buyer',name:'Buyer'}}});
    return route.fulfill({json:{products,product:products[0],cart:[],orders:[],notifications:[],unread:0,reviews:[],rates:[],messages:[],returns:[],wishlist:[],items:[],vouchers:[],payments:[]}});
   }
   return route.abort();
  });
  const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
  for(const width of [1440,375]){
   const page=await ctx.newPage();page.setDefaultTimeout(8000);await page.setViewportSize({width,height:1000});
   for(const file of pages){
    const errors=[];const listener=e=>errors.push(e.message);page.on('pageerror',listener);
    await page.goto('http://buyer.test/'+file+'?id=1&product_id=1&seller_id=2&order_id=1');
    await page.locator('header .logo img').waitFor();
    await page.waitForFunction(()=>document.querySelector('header .logo img').naturalWidth>0);
    const audit=await page.evaluate(()=>({
     body:getComputedStyle(document.body).fontSize,
     font:getComputedStyle(document.body).fontFamily,
     heading:getComputedStyle(document.querySelector('header .brand h1,header .brand h2')).fontSize,
     overflow:document.documentElement.scrollWidth>innerWidth+1,
     badButtons:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height>0&&getComputedStyle(e).fontSize!=='13px').map(e=>e.textContent),
     logo:document.querySelector('header .logo img').getAttribute('src'),
     visual:!!document.querySelector('.buyer-auth .visual'),
     badLinks:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h.endsWith('.html'))
    }));
    if(audit.body!=='14px'||audit.heading!=='22px'||audit.overflow||audit.badButtons.length||audit.visual||errors.length)failures.push({file,width,...audit,errors});
    for(const href of audit.badLinks)if(!href.includes('://')&&!fs.existsSync(path.join(root,href)))failures.push({file,missing:href});
    if(['signup.html','login.html','orders.html','seller-store.html'].includes(file))await page.screenshot({path:path.resolve('../outputs/buyer-'+file.replace('.html','')+'-'+width+'.png'),fullPage:true});
    page.off('pageerror',listener);
   }
   await page.close();
  }
  assert.equal(requests.length,0,'Viewing pages must not create records');
  const page=await ctx.newPage();await page.goto('http://buyer.test/signup.html');
  await page.locator('#name').fill('Buyer');await page.locator('#phone').fill('+60123456789');await page.locator('#email').fill('buyer@example.com');
  await page.locator('button[onclick="sendEmailOtp()"]').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('OTP'));
  await page.locator('#otp').fill('123456');await page.locator('button[onclick="verifyEmailOtp()"]').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('verified'));
  await page.locator('#password').fill('Password123!');await page.locator('#viewBtn').click();assert.equal(await page.locator('#password').getAttribute('type'),'text');
  await page.locator('#address').fill('Test address');await page.locator('#agree').check();await page.locator('button[onclick="signup()"]').click();
  await page.waitForURL('**/index.html');assert.equal(requests.at(-1).body.email_otp_token,'mock-verification');assert.equal(requests.at(-1).body.role,'buyer');
  console.log(JSON.stringify({pages:pages.length,widths:[1440,375],failures,mockedSignup:requests.map(r=>r.path)},null,2));
  assert.deepEqual(failures,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
