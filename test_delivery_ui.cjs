const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file))});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const ctx=await browser.newContext({geolocation:{latitude:3.14,longitude:101.69},permissions:['geolocation']});
  await ctx.addInitScript(()=>{localStorage.setItem('pm_token','test');localStorage.setItem('pm_user',JSON.stringify({id:1,role:'buyer',name:'Buyer',phone:'01123456789',email:'buyer@example.test',address:'Test delivery'}));localStorage.setItem('pasarmalam-lang','ms');localStorage.setItem('pasarmalam-buyer-lang-version','20260903-ms-default');});
  const writes=[];let quoteFailure=false,delayQuote=false,pendingQuote;
  await ctx.route('**/*',async route=>{
   const req=route.request(),url=req.url();
   if(url.startsWith(origin))return route.continue();
   if(url.startsWith('https://maps.googleapis.com/maps/api/js'))return route.fulfill({contentType:'text/javascript',body:`
     class FakeAutocomplete extends HTMLElement{constructor(options){super();Object.assign(this,options);}};customElements.define('test-autocomplete',FakeAutocomplete);
     class FakeGeocoder {async geocode(){return {results:[{formatted_address:'Test delivery, Malaysia',address_components:[{types:['country'],short_name:'MY'}],geometry:{location:{lat:()=>3.14,lng:()=>101.69}}}]};}}
     window.google={maps:{importLibrary:async()=>({PlaceAutocompleteElement:FakeAutocomplete}),Geocoder:FakeGeocoder}};window.pmMapsLoaded();`});
   if(!url.startsWith('https://pasarmalam-backend.onrender.com'))return route.abort();
   const endpoint=new URL(url).pathname;
   if(endpoint==='/api/maps/config')return route.fulfill({json:{browser_key:'fake-test-key'}});
   if(endpoint==='/api/product/branches')return route.fulfill({json:{branches:[{id:'',name:'Main store',address:'Test pickup',price:20,is_open:true,delivery_available:true}]}});
   if(req.method()!=='GET')writes.push({endpoint,body:req.postDataJSON()});
   if(endpoint==='/api/profile')return route.fulfill({json:{user:{address:'Test delivery'}}});
   if(endpoint==='/api/delivery/services')return route.fulfill({json:{cities:[{name:'Kuala Lumpur',locode:'MY KUL',services:[{key:'MOTORCYCLE',load:{value:'10',unit:'kg'},dimensions:{length:{value:'0.4',unit:'m'}}}]}]}});
   if(endpoint==='/api/delivery/quotation'){
    if(delayQuote)await new Promise(r=>{pendingQuote=r;});
    return route.fulfill({status:quoteFailure?400:200,json:quoteFailure?{error:'Seller pickup missing'}:{quote_id:'server-quote',fee:9.4,courier_fee:9,admin_fee:0.4,fee_version:1,currency:'MYR',expires_at:Math.floor(Date.now()/1000)+300}});
   }
   if(endpoint==='/api/payments/billplz/create')return route.fulfill({json:{message:'Payment mocked; no charge.'}});
   if(endpoint==='/api/checkout')return route.fulfill({json:{id:123,total:20,payment_status:'unpaid'}});
   if(endpoint==='/api/delivery/pickup')return route.fulfill({json:{pickup:null}});
   if(endpoint==='/api/orders'){
    assert.equal(req.headers().authorization,'Bearer test');
    return route.fulfill({json:{orders:[{id:123,total:29.4,logistics_fee:9.4,logistics_admin_fee:.4,product_id:1,quantity:1,payment_status:'paid'}]}});
   }
   return route.fulfill({json:{products:[{id:1,name:'USB cable',shop:'Test Shop',price:20,stock:5,weight_kg:0.5}],cart:[{product_id:1,quantity:1}],notifications:[],unread:0,campaigns:[]}});
  });
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(5000);
  for(const width of [402,1440]){
   await page.setViewportSize({width,height:900});await page.goto(origin+'/buyer/checkout.html?product_id=1');
   await page.locator('#deliveryVehicle option').waitFor({state:'attached'});
   assert.equal(await page.locator('#address').inputValue(),'Test delivery');
   assert.equal(await page.locator('#address').getAttribute('readonly'),'');
   await page.waitForFunction(()=>Number(document.getElementById('deliveryLat').value)===3.14);
   assert.equal(await page.locator('#deliveryConfirmed').isChecked(),false);
   await page.locator('#changeAddress').click();
   await page.locator('test-autocomplete').waitFor({state:'attached'}).catch(async e=>{console.log(await page.locator('#addressSearchStatus').textContent(), errors);throw e;});
   assert.equal(await page.locator('test-autocomplete').evaluate(e=>e.includedRegionCodes[0]),'my');
   await page.locator('test-autocomplete').evaluate(widget=>{
    const event=new Event('gmp-select');event.placePrediction={toPlace:()=>({fetchFields:async()=>{},formattedAddress:'Selected Kuala Lumpur, Malaysia',location:{lat:()=>3.15,lng:()=>101.7},addressComponents:[{types:['country'],shortText:'MY'}]})};widget.dispatchEvent(event);
   });
   await page.waitForFunction(()=>document.getElementById('address').value==='Selected Kuala Lumpur, Malaysia');
   assert.equal(await page.locator('#deliveryConfirmed').isChecked(),false);
   assert.equal(writes.some(x=>x.endpoint==='/api/profile'),false);
   await page.locator('#saveDefaultAddress').click();
   await page.waitForFunction(()=>document.getElementById('addressSearchStatus').textContent.includes('disimpan'));
   assert.equal(writes.at(-1).body.address,'Selected Kuala Lumpur, Malaysia');
   await page.locator('test-autocomplete').evaluate(widget=>{
    const event=new Event('gmp-select');event.placePrediction={toPlace:()=>({fetchFields:()=>new Promise(resolve=>{window.finishOldPlace=resolve;}),formattedAddress:'Old result, Malaysia',location:{lat:()=>3.1,lng:()=>101.6},addressComponents:[{types:['country'],shortText:'MY'}]})};widget.dispatchEvent(event);
   });
   await page.locator('#addressUnit').fill('Unit 8');
   await page.evaluate(async()=>{window.finishOldPlace();await new Promise(resolve=>setTimeout(resolve,0));});
   assert.equal(await page.locator('#addressUnit').inputValue(),'Unit 8');
   assert.equal(await page.locator('#address').inputValue(),'Unit 8, Selected Kuala Lumpur, Malaysia');
   await page.locator('#addressUnit').fill('');
   await page.evaluate(()=>localStorage.setItem('pm_user',JSON.stringify({...JSON.parse(localStorage.getItem('pm_user')),address:'Test delivery'})));
   assert.equal(await page.locator('#payment').inputValue(),'Billplz');
   assert.deepEqual(await page.locator('#payment option').evaluateAll(options=>options.map(o=>o.value)),['Billplz','Cash Pickup','Pay on Arrival']);
   assert.equal(await page.locator('#payment option[value="Pay on Arrival"]').evaluate(o=>o.disabled && o.hidden),true);
   assert.equal(await page.locator('#payment option[value="Cash Pickup"]').evaluate(o=>o.disabled && o.hidden),true);
   assert.equal(await page.locator('#deliveryLat').isVisible(),false);
   assert.equal(await page.locator('#deliveryOptions').getAttribute('open'),null);
   await page.locator('#payment').selectOption('Billplz');
   await page.locator('#pay').click();assert.equal(writes.filter(x=>x.endpoint.includes('/payments/')).length,0);
   await page.locator('#deliveryLocate').click();
   await page.waitForFunction(()=>Number(document.getElementById('deliveryLat').value)===3.14);
   assert.equal(await page.locator('#address').inputValue(),'Test delivery, Malaysia');
   assert.equal(await page.locator('#deliveryConfirmed').isChecked(),false);
   assert.equal(await page.locator('#deliveryLat').isVisible(),false);
   await page.locator('#deliveryConfirmed').check();await page.locator('#deliveryPackage').check();
   await page.locator('#deliveryQuote').click();await page.waitForFunction(()=>document.getElementById('deliveryStatus').textContent.includes('RM9.40'));
   assert.match(await page.locator('#summary').textContent(),/RM29.40/);assert.match(await page.locator('#summary').textContent(),/RM0.40/);assert.match(await page.locator('#summary').textContent(),/RM9.00/);
   await page.screenshot({path:path.resolve('../outputs/delivery-checkout-'+width+'.png'),fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('#pay').click();await page.waitForFunction(()=>document.getElementById('result').textContent.includes('mocked'));
   const sent=writes.findLast(x=>x.endpoint.includes('/payments/')).body;
   assert.equal(sent.quote_id,'server-quote');assert.equal(sent.fee_version,1);assert.equal(sent.logistics_fee,undefined);
   await page.locator('#buyerPhone').fill('01123456780');
   assert.equal(await page.evaluate(()=>Number.isNaN(window.pmDeliveryFee())),true);
   await page.locator('#deliveryQuote').click();await page.waitForFunction(()=>document.getElementById('deliveryStatus').textContent.includes('RM9.40'));
   await page.locator('#address').fill('Changed address');assert.equal(await page.locator('#deliveryConfirmed').isChecked(),false);
   const n=writes.length;await page.locator('#pay').click();assert.equal(writes.length,n);
   await page.locator('input[name="deliveryChoice"][value="Lalamove Biasa"]').check();assert.equal(await page.locator('#deliverySchedule').isVisible(),true);
   await page.locator('input[name="deliveryChoice"][value="Ambil Sendiri"]').check();assert.equal(await page.locator('#deliveryControls').isVisible(),false);
   assert.match(await page.locator('#summary').textContent(),/RM0.00/);
   await page.locator('#payment').selectOption('Cash Pickup');await page.locator('#pay').click();
   await page.waitForFunction(()=>document.getElementById('result').textContent.includes('PM-123'));
   assert.equal(writes.at(-1).body.logistics_method,'Ambil Sendiri');writes.length=0;
   await page.locator('input[name="deliveryChoice"][value="PM Express"]').check();
   await page.locator('#payment').selectOption('Pay on Arrival');
   await page.locator('#deliveryConfirmed').check();
   await page.locator('#deliveryQuote').click();
   await page.waitForFunction(()=>document.getElementById('deliveryStatus').textContent.includes('RM9.40'));
   await page.locator('#pay').click();
   await page.waitForFunction(()=>document.getElementById('result').textContent.includes('Pay on Arrival'));
   assert.equal(writes.at(-1).endpoint,'/api/checkout');
   assert.equal(writes.at(-1).body.payment_method,'Pay on Arrival');
   assert.equal(writes.at(-1).body.logistics_method,'PM Express');
   assert.equal(writes.at(-1).body.quote_id,'server-quote');
   writes.length=0;
   await page.locator('input[name="deliveryChoice"][value="Lalamove Segera"]').check();
   assert.equal(await page.locator('#payment').inputValue(),'Billplz');
   assert.equal(await page.locator('#payment option[value="Cash Pickup"]').evaluate(o=>o.disabled && o.hidden),true);
  }
  await page.goto(origin+'/buyer/checkout.html?product_id=1');await page.locator('#deliveryVehicle option').waitFor({state:'attached'});
  await page.locator('#changeAddress').click();
  await ctx.clearPermissions();
  await page.locator('#deliveryLocate').click();
  await page.locator('#deliveryLat').waitFor({state:'visible'});
  await page.locator('#deliveryLat').fill('3.14');await page.locator('#deliveryLng').fill('101.69');await page.locator('#deliveryConfirmed').check();await page.locator('#deliveryPackage').check();
  quoteFailure=true;await page.locator('#deliveryQuote').click();await page.waitForTimeout(250);console.log('Failure status:',await page.locator('#deliveryStatus').textContent());await page.waitForFunction(()=>document.getElementById('deliveryStatus').textContent.includes('pickup missing'));
  quoteFailure=false;delayQuote=true;await page.locator('#deliveryQuote').click();await page.waitForTimeout(100);await page.locator('#address').fill('Changed during quote');pendingQuote();
  await page.waitForTimeout(200);assert.doesNotMatch(await page.locator('#deliveryStatus').textContent(),/RM9/);
  for(const file of ['receipt.html','order-confirmation.html']){
   await page.goto(origin+'/buyer/'+file+'?id=123');
   await page.waitForFunction(()=>document.body.textContent.includes('RM0.40'));
   assert.match(await page.locator('main').textContent(),/RM9.00/);
   assert.match(await page.locator('main').textContent(),/RM29.40/);
  }
  await ctx.addInitScript(()=>localStorage.setItem('pm_user',JSON.stringify({id:2,role:'seller',name:'Seller',shop_name:'Shop',address:'Test pickup'})));
  await page.goto(origin+'/seller/pickup-location.html');await page.locator('#savePickup').waitFor();await page.waitForTimeout(200);
  await page.locator('#lat').fill('3.15');await page.locator('#lng').fill('101.71');await page.locator('#confirmed').check();await page.locator('#savePickup').click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('disimpan'));
  assert.equal(writes.at(-1).endpoint,'/api/delivery/pickup');assert.equal(writes.at(-1).body.confirmed,true);
  assert.deepEqual(errors,[]);console.log('PASS delivery mobile/desktop, price, quote invalidation, failed/stale quotes, pickup and seller location');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
