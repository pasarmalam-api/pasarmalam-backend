const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{
 const file=path.join(root,new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
 res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  let category='Street Food',fail=false,failSave=false;
  const writes=[],errors=[];
  let profile={id:2,role:'seller',name:'Test seller',shop_name:'Server shop',phone:'01123456789',address:'Saved address'},profileFail=false;
  const ctx=await browser.newContext();
  await ctx.addInitScript(()=>{
   localStorage.setItem('pm_token','test');
   localStorage.setItem('pm_user',JSON.stringify({id:2,role:'seller',name:'Test seller',shop_name:'Shop',shop_category:'Phones'}));
   localStorage.setItem('pasarmalam-lang','en');
   if(location.pathname.endsWith('/register.html')){
    localStorage.removeItem('pm_token');localStorage.removeItem('pm_user');
   }
  });
  await ctx.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(req.url().startsWith(origin))return route.continue();
   if(url.origin!=='https://pasarmalam-backend.onrender.com')return route.abort();
   if(req.method()==='POST'||req.method()==='PUT')writes.push({path:url.pathname,data:req.postDataJSON()});
   if(url.pathname==='/api/otp/email/verify')return route.fulfill({json:{email_otp_token:'verified'}});
   if(url.pathname==='/api/seller/profile')return route.fulfill({status:profileFail?503:200,json:profileFail?{error:'Profile unavailable'}:{user:profile}});
   if(url.pathname==='/api/profile'){
    profile={...profile,...req.postDataJSON(),shop_category:category};
    return route.fulfill({json:{user:profile,token:'test'}});
   }
   if(url.pathname==='/api/seller/category'){
    assert.equal(req.headers().authorization,'Bearer test');
    if(fail || (failSave&&req.method()==='POST'))return route.fulfill({status:503,json:{error:'Unavailable'}});
    if(req.method()==='POST')category=req.postDataJSON().shop_category;
    return route.fulfill({json:{shop_category:category,product_count:2}});
   }
   if(url.pathname==='/api/products'&&req.method()==='POST')return route.fulfill({json:{id:123}});
   return route.fulfill({json:{ok:true,products:[{id:1,seller_id:2,name:'Sample',category,price:12,stock:5,condition:'New',price_mode:'Fixed',images:[],variants:[]}],
    is_open:true,eligible:true,notifications:[],unread:0,metrics:{}}});
  });
  const page=await ctx.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/seller/settings.html');
  await page.waitForFunction(()=>document.getElementById('shopName').value==='Server shop');
  await page.selectOption('#shopCategory','Groceries');
  await page.locator('#shopName').fill('Updated shop');
  page.once('dialog',d=>d.accept());
  await page.locator('button[onclick="saveProfile()"]').click();
  await page.waitForFunction(()=>document.getElementById('profileStatus').textContent==='Profile saved.');
  assert.equal(category,'Groceries');
  assert.equal(profile.shop_name,'Updated shop');
  await page.reload();
  await page.waitForFunction(()=>document.getElementById('shopName').value==='Updated shop');
  assert.equal(await page.locator('#shopCategory').inputValue(),'Groceries');
  await page.locator('#shopName').fill('Unsaved shop edit');
  for(const [id,value]of Object.entries({sellerName:'Test seller',identityNumber:'TEST',bankName:'Bank',bankAccountName:'Test seller',bankAccountNumber:'123'}))await page.locator('#'+id).fill(value);
  await page.selectOption('#identityType','Passport');
  await page.locator('button[onclick="savePayoutProfile()"]').click();
  await page.waitForFunction(()=>document.getElementById('bankStatus').textContent.includes('saved'));
  assert.equal(await page.locator('#shopName').inputValue(),'Unsaved shop edit');
  profileFail=true;await page.reload();
  await page.getByRole('button',{name:'Retry loading settings'}).waitFor();
  assert.equal(await page.locator('button[onclick="saveProfile()"]').isDisabled(),true);
  profileFail=false;await page.getByRole('button',{name:'Retry loading settings'}).click();
  await page.waitForFunction(()=>!document.getElementById('shopName').disabled);
  for(const width of [402,1440]){
   category='Street Food';await page.setViewportSize({width,height:900});
   await page.goto(origin+'/seller/register.html');
   assert.equal(await page.locator('#shopCategory option').count(),15);
   await page.selectOption('#shopCategory','Groceries');
   assert.equal(await page.locator('#shopCategory').inputValue(),'Groceries');
   await page.selectOption('#shopCategory','Chargers');
   assert.equal(await page.locator('#shopCategory').inputValue(),'Chargers');
   await page.screenshot({path:path.resolve('../outputs/seller-category-signup-'+width+'.png'),fullPage:true});
   for(const [id,value] of Object.entries({sellerName:'Sample Seller',sellerPhone:'01123456789',sellerEmail:'sample@example.test',sellerPassword:'password123',shopName:'Sample Shop',identityNumber:'sample-id',sellerAddress:'Sample address',bankName:'Sample Bank',bankAccountName:'Sample Seller',bankAccountNumber:'12345678',otp:'123456'})){
    await page.locator('#'+id).fill(value);
   }
   await page.selectOption('#identityType','Passport');
   await page.locator('[onclick="verifySellerOtp()"]').click();
   await page.waitForFunction(()=>document.getElementById('otpStatus').textContent.includes('verified'));
   await page.locator('[onclick="applySeller()"]').click();
   await page.waitForURL('**/thank-you.html');
   assert.equal(writes.findLast(w=>w.path==='/api/auth/signup').data.shop_category,'Chargers');
   await page.goto(origin+'/seller/add-product.html');
   await page.waitForFunction(()=>document.getElementById('category').value==='Street Food');
   assert(await page.locator('#category').isDisabled());
   assert.equal(await page.locator('#category option').count(),1);
   await page.locator('#name').fill('Sample item');
   await page.locator('#price').fill('12');await page.locator('#stock').fill('2');
   await page.locator('[onclick="save()"]').click();
   await page.waitForURL('**/product-published.html');
   assert.equal(writes.at(-1).data.category,'Street Food');
   await page.goto(origin+'/seller/settings.html');
   await page.waitForFunction(()=>!document.getElementById('shopCategory').disabled);
   assert.equal(await page.locator('#shopCategory').inputValue(),'Street Food');
   await page.selectOption('#shopCategory','Chargers');
   page.once('dialog',d=>d.dismiss());await page.locator('[data-category-save]').click();
   assert.equal(category,'Street Food');
   await page.selectOption('#shopCategory','Chargers');
   page.once('dialog',d=>d.accept());await page.locator('[data-category-save]').click();
   await page.waitForFunction(()=>document.querySelector('#shopCategoryControls [role=status]').textContent==='Shop category saved.');
   assert.deepEqual(writes.at(-1).data,{shop_category:'Chargers',previous_category:'Street Food',move_products:true});
   await page.reload();await page.waitForFunction(()=>document.getElementById('shopCategory').value==='Chargers');
   await page.screenshot({path:path.resolve('../outputs/seller-category-settings-'+width+'.png'),fullPage:true});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.goto(origin+'/seller/edit-product.html?id=1');
   await page.waitForFunction(()=>document.getElementById('category').value==='Chargers');
   assert(await page.locator('#category').isDisabled());
   await page.locator('[onclick="save()"]').click();
   await page.waitForFunction(()=>document.getElementById('out').textContent==='Product updated.');
   assert.equal(writes.at(-1).data.category,'Chargers');
  }
  category='';await page.goto(origin+'/seller/add-product.html');
  await page.locator('#shopCategoryControls [role=status]').filter({hasText:'Choose your shop category'}).waitFor();
  const count=writes.length;await page.locator('[onclick="save()"]').click();
  assert.equal(writes.length,count);
  await page.locator('#shopCategoryControls a').click();await page.waitForURL('**/settings.html');
  await page.waitForFunction(()=>!document.getElementById('shopCategory').disabled);
  failSave=true;await page.selectOption('#shopCategory','Food');
  page.once('dialog',d=>d.accept());await page.locator('[data-category-save]').click();
  await page.locator('#shopCategoryControls [role=status]').filter({hasText:'Unavailable'}).waitFor();
  assert.equal(category,'');assert.equal(await page.locator('#shopCategory').inputValue(),'');
  failSave=false;fail=true;await page.reload();await page.locator('[data-category-retry]').waitFor({state:'visible'});
  assert(await page.locator('[data-category-save]').isDisabled());
  fail=false;await page.locator('[data-category-retry]').click();
  await page.waitForFunction(()=>!document.getElementById('shopCategory').disabled);
  await page.selectOption('#shopCategory','Phones');
  await page.locator('.seller-lang-toggle').click();
  await page.waitForFunction(()=>document.querySelector('[data-shop-category-text=label]').textContent==='店铺类别');
  assert.equal(await page.locator('#shopCategory').inputValue(),'Phones');
  assert.deepEqual(errors,[]);
  console.log('Shop category UI passed: mobile/desktop signup, fixed listings, settings, bulk confirmation, reload, failure/retry, language, navigation.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
