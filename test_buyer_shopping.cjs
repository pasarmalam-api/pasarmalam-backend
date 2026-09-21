const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [360,1440]){
   const ctx=await browser.newContext({viewport:{width,height:900}});
   await ctx.addInitScript(()=>{localStorage.setItem('pm_token','fixture');localStorage.setItem('pm_user',JSON.stringify({id:1,role:'buyer',email:'test@example.test'}));localStorage.setItem('pasarmalam-lang','en');localStorage.setItem('pasarmalam-buyer-lang-version','20260903-ms-default')});
   const products=[{id:2,seller_id:5,name:'Cable',shop:'Alpha',category:'Chargers',price:10,stock:3,variants:[],images:['http://buyer.test/pasarmalam-logo.png','http://buyer.test/google-play-badge.png']},{id:3,seller_id:6,name:'Bread',shop:'Beta',category:'Groceries',price:5,stock:4}];
   let fail=false;const errors=[];
   await ctx.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='buyer.test'){const file=path.join(path.resolve('landing-site-v2/buyer'),url.pathname);return route.fulfill({status:fs.existsSync(file)?200:404,body:fs.existsSync(file)?fs.readFileSync(file):'',contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html'})}
    if(url.hostname!=='pasarmalam-backend.onrender.com')return route.abort();
    if(fail&&url.pathname==='/api/products')return route.fulfill({status:503,json:{error:'Unavailable'}});
    return route.fulfill({json:{products,cart:products.map((p,i)=>({...p,id:7+i,product_id:p.id,quantity:1})),campaigns:[{id:1,seller_id:5,name:'SAVE2',value:'2',type:'voucher',status:'active'}],orders:[{id:51,product_name:'Cable',total:10,order_status:'pending_payment',payment_status:'unpaid'},{id:52,product_name:'Bread',total:5,order_status:'shipped',payment_status:'paid'},{id:53,order_status:'completed',payment_status:'paid',total:5}],reviews:[],notifications:[],messages:[],branches:[]}});
   });
   const page=await ctx.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://buyer.test/category.html');await page.waitForFunction(()=>document.querySelectorAll('#list .card').length===2);
   await page.locator('[name=sort]').selectOption('low');assert.match(await page.locator('#list .card').first().innerText(),/Bread/);
   await page.locator('[name=category]').selectOption('Phone Accessories');assert.equal(await page.locator('#list .card').count(),1);assert.match(await page.locator('#list').innerText(),/Cable/);
   await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#list .card').length===1);assert.equal(await page.locator('[name=category]').inputValue(),'Phone Accessories');
   await page.locator('button[type=reset]').click();await page.waitForFunction(()=>document.querySelectorAll('#list .card').length===2);
   await page.locator('[name=q]').fill('missing');await page.locator('button[type=submit]').click();assert.match(await page.locator('#list').innerText(),/No matching/);
   await page.goto('http://buyer.test/cart.html');await page.locator('input[value="8"]').check();await page.locator('#checkoutBtn').click();await page.waitForURL('**/checkout.html?product_id=3&quantity=1&variant=');
   await page.goto('http://buyer.test/checkout.html');await page.waitForFunction(()=>document.querySelector('#pay').disabled);assert.match(await page.locator('#summary').innerText(),/select an item/i);
   console.log('Check voucher preview at '+width);await page.goto('http://buyer.test/checkout.html?product_id=2&quantity=1');await page.waitForFunction(()=>typeof checkoutProduct!=='undefined'&&checkoutProduct);
   await page.evaluate(async()=>{voucher.value='SAVE2';await applyVoucher()});assert.equal(await page.evaluate(()=>activeDiscount),2);
   await page.goto('http://buyer.test/checkout.html?product_id=3&quantity=1');await page.waitForFunction(()=>typeof checkoutProduct!=='undefined'&&checkoutProduct);
   await page.evaluate(async()=>{voucher.value='SAVE2';await applyVoucher()});assert.equal(await page.evaluate(()=>activeDiscount),0);
   await page.goto('http://buyer.test/orders.html');await page.locator('[data-state=receive]').click();assert.match(await page.locator('#orders').innerText(),/PM-52/);assert.doesNotMatch(await page.locator('#orders').innerText(),/PM-51/);
   await page.locator('[data-state=closed]').click();assert.match(await page.locator('#orders').innerText(),/No orders/);
   await page.goto('http://buyer.test/vouchers.html');await page.getByText('SAVE2',{exact:true}).waitFor();assert.equal(await page.getByText('Claim',{exact:true}).count(),0);
   await page.goto('http://buyer.test/product.html?id=2');await page.locator('.product-thumbnails button').nth(1).click();assert.match(await page.locator('#photo img').getAttribute('src'),/google-play/);assert.doesNotMatch(await page.locator('#detail').innerText(),/4\.8|RM5|Penjual Pilihan/);
   for(const file of fs.readdirSync('landing-site-v2/buyer').filter(f=>f.endsWith('.html'))){await page.goto('http://buyer.test/'+file);assert.equal(await page.locator('.buyer-navigation a').count(),5);for(const href of await page.locator('.buyer-navigation a').evaluateAll(links=>links.map(a=>a.getAttribute('href'))))assert(fs.existsSync(path.join('landing-site-v2/buyer',href)));}
   fail=true;await page.goto('http://buyer.test/category.html');await page.getByText('Unable to load products. Please refresh to try again.').waitFor();
   assert.deepEqual(errors,[]);await ctx.close();console.log('PASS shopping flows and shared navigation at '+width+'px');
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
