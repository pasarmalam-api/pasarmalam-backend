const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.jpg')?'image/jpeg':'text/html');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext();
    let sellerStatus='not_applicable',submissions=0,failure=false;
    const profile={name:'Existing Buyer',email:'buyer@example.com',phone:'+60123456789',address:'Existing address'};
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin===origin)return route.continue();
      if(url.origin!=='https://pasarmalam-backend.onrender.com')return route.abort();
      let data={products:[],orders:[],notifications:[],messages:[],rates:[],wallet:[],reviews:[],returns:[]};
      if(url.pathname==='/api/seller/onboarding'){
        if(failure)return route.fulfill({status:503,json:{error:'Please retry later'}});
        if(route.request().method()==='POST'){
          submissions++;
          const body=route.request().postDataJSON();assert.equal(body.email,profile.email);assert.equal(body.name,profile.name);assert.equal(body.shop_category,'Chargers');
          sellerStatus='pending';Object.assign(profile,body);
        }
        data={profile,categories:['Food','Chargers','Electronics'],seller_status:sellerStatus};
      }
      if(url.pathname==='/api/auth/switch-role'){
        const role=route.request().postDataJSON().role;
        data={token:'token-'+role,user:{id:1,role,name:'Existing Buyer',seller_status:sellerStatus}};
      }
      return route.fulfill({json:data});
    });
    const page=await context.newPage();
    await page.goto(origin+'/buyer/become-seller.html');
    await page.locator('#signIn').waitFor({state:'visible'});
    assert.equal(await page.locator('#sellerProfile').isVisible(),false);
    await page.evaluate(()=>{localStorage.setItem('pm_token','token-buyer');localStorage.setItem('pm_user',JSON.stringify({id:1,role:'buyer'}));localStorage.setItem('pasarmalam-lang','en')});
    await page.reload();await page.locator('#sellerProfile').waitFor({state:'visible'});
    assert.equal(await page.locator('[name=email]').inputValue(),profile.email);
    assert.equal(await page.locator('[name=name]').inputValue(),profile.name);
    assert.equal(await page.locator('[name=phone]').inputValue(),profile.phone);
    assert.equal(await page.locator('[name=email]').getAttribute('readonly'),'');
    assert.equal(await page.locator('input[type=password]').count(),0);
    fs.mkdirSync('../outputs/account-switch',{recursive:true});
    for(const width of [390,1440]){
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:'../outputs/account-switch/profile-'+width+'.png',fullPage:true});
    }
    for(const [key,value] of Object.entries({shop_name:'New Shop',identity_number:'P123',bank_name:'Bank',bank_account_name:'Existing Buyer',bank_account_number:'12345678'}))await page.locator('[name='+key+']').fill(value);
    await page.locator('[name=shop_category]').selectOption({label:'Phone Accessories'});
    await page.locator('[name=identity_type]').selectOption('Passport');
    await page.locator('#submit').click();await page.locator('#sellerProfile').waitFor({state:'hidden'});
    assert.match(await page.locator('#status').textContent(),/complete and pending approval/);
    await page.reload();await page.locator('#status').filter({hasText:'pending approval'}).waitFor();assert.equal(submissions,1);
    sellerStatus='rejected';await page.reload();await page.locator('#support').waitFor({state:'visible'});
    sellerStatus='approved';await page.reload();await page.waitForURL('**/seller/index.html');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.pm_user).role),'seller');
    for(const width of [390,1440]){
      await page.setViewportSize({width,height:900});
      assert.equal(await page.locator('#switchToBuyer').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(8, 127, 114)');
      await page.screenshot({path:'../outputs/account-switch/seller-button-'+width+'.png'});
    }
    await page.locator('#switchToBuyer').click();await page.waitForURL('**/buyer/index.html');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.pm_user).role),'buyer');
    for(const width of [390,1440]){
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:'../outputs/account-switch/buyer-button-'+width+'.png'});
    }
    await page.locator('.seller-entry').click();await page.waitForURL('**/seller/index.html');
    sellerStatus='not_applicable';failure=true;
    await page.evaluate(()=>{localStorage.setItem('pm_token','token-buyer');localStorage.setItem('pm_user',JSON.stringify({id:1,role:'buyer'}))});
    await page.goto(origin+'/buyer/become-seller.html');await page.locator('#retry').waitFor({state:'visible'});
    failure=false;await page.locator('#retry').click();await page.locator('#sellerProfile').waitFor({state:'visible'});
    console.log('PASS prefill, required fields, acknowledgement, pending/rejected states, approved seller/buyer round trip, retry, 390/1440 layouts');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
