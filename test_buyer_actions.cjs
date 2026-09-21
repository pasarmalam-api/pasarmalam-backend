const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:360,height:800}});
 let fail='',offline=false,reads=false,cart=[{id:7,product_id:2,name:'Cable',shop:'Shop',price:10,quantity:1,stock:3}],saved=[{product_id:2}];
 const user={id:88,role:'buyer',name:'Real Buyer',email:'buyer@example.test',phone:'0123456789',address:'KL'};
 const product={id:2,seller_id:5,name:'Cable',shop:'Shop',price:10,stock:3,category:'Chargers',variants:[],images:[]};
 const requests=[],errors=[];
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.hostname==='buyer.test'){
   const file=path.join(path.resolve('landing-site-v2/buyer'),url.pathname);
   return route.fulfill({status:fs.existsSync(file)?200:404,body:fs.existsSync(file)?fs.readFileSync(file):'',contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html'});
  }
  if(url.hostname!=='pasarmalam-backend.onrender.com')return route.abort();
  if(req.method()!=='GET')requests.push({path:url.pathname,data:req.postDataJSON(),auth:req.headers().authorization});
  if(offline)return route.abort();
  if(fail===url.pathname)return route.fulfill({status:503,json:{error:'Service unavailable'}});
  if(url.pathname==='/api/auth/password-reset')return route.fulfill({json:{ok:true,message:'If an active buyer account matches this email, a reset link will arrive shortly.'}});
  if(url.pathname==='/api/auth/password-reset/confirm')return route.fulfill({json:{ok:true,message:'Password updated. Sign in with your new password.'}});
  if(url.pathname==='/api/auth/login')return route.fulfill({json:{token:'buyer-token',user}});
  if(url.pathname==='/api/profile'){if(req.method()==='POST')Object.assign(user,req.postDataJSON());return route.fulfill({json:{ok:true,user,token:'buyer-token'}})}
  if(url.pathname==='/api/notifications/read')reads=true;
  if(url.pathname==='/api/wishlist'&&req.method()==='DELETE')saved=[];
  if(url.pathname==='/api/cart'&&req.method()==='DELETE')cart=[];
  if(url.pathname==='/api/cart'&&req.method()==='PUT')cart[0].quantity=req.postDataJSON().quantity;
  return route.fulfill({json:{ok:true,id:99,products:[product],cart,wishlist:saved,orders:[{id:1,product_id:2,product_name:'Cable',order_status:'delivered',payment_status:'paid'}],returns:[],reviews:[],messages:[],tickets:[],rates:[],payments:[],notifications:reads?[]:[{id:1,title:'Order 123456',body:'Ready',target_url:'orders.html',created_at:1}],unread:reads?0:1}});
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 const go=file=>{console.log('Check '+file);return page.goto('http://buyer.test/'+file)};
 const text=async(selector,part)=>{try{await page.waitForFunction(([s,p])=>document.querySelector(s)?.textContent.includes(p),[selector,part])}catch(e){console.error('Expected',part,'received',await page.locator(selector).textContent());throw e}};
 await go('login.html');await page.locator('a[href="password-reset.html"]').click();assert.ok(page.url().includes('password-reset.html'));
 await page.locator('#email').fill('buyer@example.test');await page.locator('#requestForm button').click();await text('#resetStatus','reset link');
 fail='/api/auth/password-reset';await page.locator('#requestForm button').click();await text('#resetStatus','Service unavailable');fail='';
 offline=true;await page.locator('#requestForm button').click();await text('#resetStatus','Connection failed');offline=false;
 await go('index.html');await go('password-reset.html#email=buyer%40example.test&token=secret');
 assert.equal(await page.locator('#confirmForm').isVisible(),true);assert.equal(new URL(page.url()).hash,'');
 await page.locator('#newPassword').fill('new-password');await page.locator('#confirmPassword').fill('different-password');await page.locator('#confirmForm button').click();await text('#resetStatus','do not match');
 await page.locator('#confirmPassword').fill('new-password');await page.locator('#confirmForm button').click();await text('#resetStatus','Password updated');await page.locator('#signInLink').click();
 await page.locator('#email').fill('buyer@example.test');await page.locator('#password').fill('new-password');offline=true;await page.locator('button[onclick="login()"]').click();await text('#status','Connection failed');offline=false;
 await go('login.html?next=profile.html');await page.locator('#email').fill('buyer@example.test');await page.locator('#password').fill('new-password');await page.locator('button[onclick="login()"]').click();await page.waitForURL('**/profile.html');
 await page.locator('#name').waitFor({state:'visible'});assert.equal(await page.locator('#name').inputValue(),'Real Buyer');await page.locator('#name').fill('Updated Buyer');await page.locator('#profileForm button').click();await text('#profileStatus','saved');assert.equal(user.name,'Updated Buyer');
 await go('product.html?id=2');await page.locator('#qty').fill('5');await text('#productStatus','3');await page.locator('#qty').fill('1');await page.locator('button[onclick="buyNow()"]').click();await page.waitForURL('**/checkout.html?product_id=2&quantity=1&variant=*');
 await go('product.html?id=2');await page.locator('button').filter({hasText:'Chat'}).click();await page.waitForURL('**/chat.html?product_id=2');await page.locator('#chatText').fill('Hello');await page.locator('#chatSend').click();await page.waitForFunction(()=>document.querySelector('#chatText').value==='');assert.equal(requests.at(-1).data.product_id,2);
 await go('cart.html');await page.locator('button').filter({hasText:'+'}).click();await text('#status','dikemas kini');assert.equal(cart[0].quantity,2);
 await page.locator('button[onclick="removeItem(7)"]').click();await text('#status','dibuang');assert.equal(cart.length,0);
 await go('support.html');await page.locator('#subject').fill('Delivery help');await page.locator('#message').fill('Please help');await page.locator('button[onclick="createTicket()"]').click();await text('#status','99');
 await go('notifications.html');await text('#list','123456');await page.locator('button[onclick="markRead()"]').click();await text('#count','0');
 await go('wishlist.html');await page.locator('button[onclick="removeSaved(2)"]').click();await text('#list','No wishlist');
 await go('orders.html');await text('#orders','PM-1');await page.locator('button[onclick="location.href=\'order-detail.html?id=1\'"]').click();await page.waitForURL('**/order-detail.html?id=1');await page.locator('.buyer-back').click();await page.waitForURL('**/orders.html');
 for(const file of fs.readdirSync('landing-site-v2/buyer').filter(x=>x.endsWith('.html'))){await go(file+'?id=2&product_id=2&order_id=1');await page.locator('header .logo').click();await page.waitForURL('**/index.html')}
 await go('profile.html');await page.locator('#logout').click();await page.waitForURL('**/login.html');await go('profile.html');await page.locator('#loginLink').waitFor({state:'visible'});assert.equal(await page.locator('#profileForm').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS: reset request/confirm/failures, login return, profile save/logout, product/cart/chat/support/wishlist/notifications/orders, home navigation on all 26 pages');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
