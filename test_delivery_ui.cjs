const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file))});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const ctx=await browser.newContext();
  await ctx.addInitScript(()=>{localStorage.setItem('pm_token','test');localStorage.setItem('pm_user',JSON.stringify({id:1,role:'buyer',name:'Buyer',phone:'01123456789',email:'buyer@example.test',address:'Test delivery'}));localStorage.setItem('pasarmalam-lang','ms');localStorage.setItem('pasarmalam-buyer-lang-version','20260903-ms-default');});
  const writes=[];let quoteFailure=false,delayQuote=false,pendingQuote;
  await ctx.route('**/*',async route=>{
   const req=route.request(),url=req.url();
   if(url.startsWith(origin))return route.continue();
   if(!url.startsWith('https://pasarmalam-backend.onrender.com'))return route.abort();
   const endpoint=new URL(url).pathname;
   if(req.method()!=='GET')writes.push({endpoint,body:req.postDataJSON()});
   if(endpoint==='/api/delivery/services')return route.fulfill({json:{cities:[{name:'Kuala Lumpur',locode:'MY KUL',services:[{key:'MOTORCYCLE',load:{value:'10',unit:'kg'},dimensions:{length:{value:'0.4',unit:'m'}}}]}]}});
   if(endpoint==='/api/delivery/quotation'){
    if(delayQuote)await new Promise(r=>{pendingQuote=r;});
    return route.fulfill({status:quoteFailure?400:200,json:quoteFailure?{error:'Seller pickup missing'}:{quote_id:'server-quote',fee:9,currency:'MYR',expires_at:Math.floor(Date.now()/1000)+300}});
   }
   if(endpoint==='/api/payments/billplz/create')return route.fulfill({json:{message:'Payment mocked; no charge.'}});
   if(endpoint==='/api/checkout')return route.fulfill({json:{id:123,total:20,payment_status:'unpaid'}});
   if(endpoint==='/api/delivery/pickup')return route.fulfill({json:{pickup:null}});
   return route.fulfill({json:{products:[{id:1,name:'USB cable',shop:'Test Shop',price:20,stock:5,weight_kg:0.5}],cart:[{product_id:1,quantity:1}],notifications:[],unread:0,campaigns:[]}});
  });
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(5000);
  for(const width of [402,1440]){
   await page.setViewportSize({width,height:900});await page.goto(origin+'/buyer/checkout.html?product_id=1');
   await page.locator('#deliveryVehicle option').waitFor({state:'attached'});
   await page.locator('#payment').selectOption('Billplz');
   await page.locator('#pay').click();assert.equal(writes.filter(x=>x.endpoint.includes('/payments/')).length,0);
   await page.locator('#deliveryLat').fill('3.14');await page.locator('#deliveryLng').fill('101.69');
   await page.locator('#deliveryConfirmed').check();await page.locator('#deliveryPackage').check();
   await page.locator('#deliveryQuote').click();await page.waitForFunction(()=>document.getElementById('deliveryStatus').textContent.includes('RM9.00'));
   assert.match(await page.locator('#summary').textContent(),/RM29.00/);
   await page.screenshot({path:path.resolve('../outputs/delivery-checkout-'+width+'.png'),fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('#pay').click();await page.waitForFunction(()=>document.getElementById('result').textContent.includes('mocked'));
   const sent=writes.findLast(x=>x.endpoint.includes('/payments/')).body;
   assert.equal(sent.quote_id,'server-quote');assert.equal(sent.logistics_fee,undefined);
   await page.locator('#address').fill('Changed address');assert.equal(await page.locator('#deliveryConfirmed').isChecked(),false);
   const n=writes.length;await page.locator('#pay').click();assert.equal(writes.length,n);
   await page.locator('#shipping').selectOption('Lalamove Biasa');assert.equal(await page.locator('#deliverySchedule').isVisible(),true);
   await page.locator('#shipping').selectOption('Ambil Sendiri');assert.equal(await page.locator('#deliveryControls').isVisible(),false);
   assert.match(await page.locator('#summary').textContent(),/RM0.00/);
   await page.locator('#payment').selectOption('Cash Pickup');await page.locator('#pay').click();
   await page.waitForFunction(()=>document.getElementById('result').textContent.includes('PM-123'));
   assert.equal(writes.at(-1).body.logistics_method,'Ambil Sendiri');writes.length=0;
  }
  await page.goto(origin+'/buyer/checkout.html?product_id=1');await page.locator('#deliveryVehicle option').waitFor({state:'attached'});
  await page.locator('#deliveryLat').fill('3.14');await page.locator('#deliveryLng').fill('101.69');await page.locator('#deliveryConfirmed').check();await page.locator('#deliveryPackage').check();
  quoteFailure=true;await page.locator('#deliveryQuote').click();await page.waitForTimeout(250);console.log('Failure status:',await page.locator('#deliveryStatus').textContent());await page.waitForFunction(()=>document.getElementById('deliveryStatus').textContent.includes('pickup missing'));
  quoteFailure=false;delayQuote=true;await page.locator('#deliveryQuote').click();await page.waitForTimeout(100);await page.locator('#address').fill('Changed during quote');pendingQuote();
  await page.waitForTimeout(200);assert.doesNotMatch(await page.locator('#deliveryStatus').textContent(),/RM9/);
  await ctx.addInitScript(()=>localStorage.setItem('pm_user',JSON.stringify({id:2,role:'seller',name:'Seller',shop_name:'Shop',address:'Test pickup'})));
  await page.goto(origin+'/seller/pickup-location.html');await page.locator('#savePickup').waitFor();await page.waitForTimeout(200);
  await page.locator('#lat').fill('3.15');await page.locator('#lng').fill('101.71');await page.locator('#confirmed').check();await page.locator('#savePickup').click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('disimpan'));
  assert.equal(writes.at(-1).endpoint,'/api/delivery/pickup');assert.equal(writes.at(-1).body.confirmed,true);
  assert.deepEqual(errors,[]);console.log('PASS delivery mobile/desktop, price, quote invalidation, failed/stale quotes, pickup and seller location');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
