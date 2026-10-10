const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true}).catch(error=>{server.close();throw error;});
 try{
  const context=await browser.newContext();let calls=[],failed=false,incompleteProfile=false,savedPoint=false,mapCalls=0,quoteDelay=0,poolingEligible=true;
  await context.addInitScript(()=>{localStorage.setItem('pm_token','test');localStorage.setItem('pm_user',JSON.stringify({id:1,role:'buyer',name:'Test Buyer',phone:'01123456789',email:'test@example.com',address:'Office, 50088 Kuala Lumpur, Malaysia'}));localStorage.setItem('pasarmalam-lang','en');localStorage.setItem('pasarmalam-buyer-lang-version','20260903-ms-default');});
  await context.route('**/*',async route=>{
   const req=route.request();if(req.url().startsWith(origin))return route.continue();
   if(req.url().startsWith('https://maps.googleapis.com'))return route.fulfill({contentType:'text/javascript',body:`class Auto extends HTMLElement{};customElements.define('mock-address',Auto);window.google={maps:{importLibrary:async()=>({PlaceAutocompleteElement:Auto}),Geocoder:class{async geocode(){return {results:[{formatted_address:'Office, 50088 Kuala Lumpur, Malaysia',address_components:[{types:['country'],short_name:'MY'}],geometry:{location:{lat:()=>3.15,lng:()=>101.71}}}]};}}}};window.pmMapsLoaded();`});
   const endpoint=new URL(req.url()).pathname;
   if(req.method()!=='GET')calls.push({endpoint,data:req.postDataJSON()});
   if(endpoint==='/api/maps/config'){mapCalls++;return route.fulfill({json:{browser_key:'test'}});}
   if(endpoint==='/api/profile')return route.fulfill({json:{user:{address:incompleteProfile?'present 7 putrajaya':'Office, 50088 Kuala Lumpur, Malaysia',delivery_location:savedPoint?JSON.stringify({address:'Office, 50088 Kuala Lumpur, Malaysia',lat:3.15,lng:101.71,confirmed:true}):''}}});
   if(endpoint==='/api/product/branches')return route.fulfill({json:{branches:[{id:'',name:'Main shop',price:20,is_open:true,address:'Seller address'}]}});
   if(endpoint==='/api/delivery/quotation'){
    if(quoteDelay)await new Promise(resolve=>setTimeout(resolve,quoteDelay));
    if(failed)return route.fulfill({status:400,json:{error:'Local delivery is not set up by this seller yet. Choose another delivery option.'}});
    const q={quote_id:'test-quote',fee:6.99,courier_fee:6.59,admin_fee:.4,expires_at:Math.floor(Date.now()/1000)+300,service_name:'SPX Xpress'};
    const method=req.postDataJSON().logistics_method;
    return route.fulfill({json:method==='EasyParcel'?{offers:[q]}:method==='Lalamove Segera'?{offers:[{...q,service_type:'MOTORCYCLE',service_name:'Motorcycle'},{...q,quote_id:'car-quote',service_type:'CAR',service_name:'Car',fee:12.4}]}:q});
   }
   if(endpoint==='/api/payments/billplz/create')return route.fulfill({json:{message:'Test payment intercepted'}});
   return route.fulfill({json:{products:[{id:1,seller_id:2,name:'Cable',category:'Chargers',pooling_eligible:poolingEligible,price:20,stock:5,shop:'Test Shop'}],cart:[],notifications:[],campaigns:[]}});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [360,402,1440]){
   calls=[];await page.setViewportSize({width,height:900});await page.goto(origin+'/buyer/checkout.html?product_id=1');
   await page.locator('#parcelService').waitFor();
   assert.equal(await page.locator('#addressEditor').isVisible(),false);
   assert.equal(await page.locator('#useDefaultAddress').isVisible(),true);
   assert.equal(await page.locator('#changeAddress').isVisible(),true);
   for(const id of ['addressPostcode','addressCity','addressState'])assert.equal(await page.locator('#'+id).isVisible(),false);
   await page.locator('#changeAddress').click();
   for(const id of ['addressPostcode','addressCity','addressState'])assert.equal(await page.locator('#'+id).isVisible(),true);
   await page.locator('#address').fill('Temporary different address');
   await page.locator('#useDefaultAddress').click();
   assert.equal(await page.locator('#address').inputValue(),'Office, 50088 Kuala Lumpur, Malaysia');
   assert.equal(await page.locator('#addressEditor').isVisible(),false);
   for(const id of ['addressPostcode','addressCity','addressState'])assert.equal(await page.locator('#'+id).isVisible(),false);
   await page.locator('#parcelService').waitFor();
   for(const id of ['deliveryLat','deliveryLng','deliveryVehicle','deliveryCity','deliveryPackage','deliveryConfirmed','checkoutBranch'])assert.equal(await page.locator('#'+id).isVisible(),false,id);
   await page.locator('#parcelService').selectOption('test-quote');
   assert.equal(await page.evaluate(()=>pmDeliveryFee()),6.99);
   assert.match(await page.locator('#summary').innerText(),/26\.99/);
   assert.equal(await page.locator('#pay').isEnabled(),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   fs.mkdirSync('release-zips/checkout-audit',{recursive:true});
   await page.screenshot({path:path.resolve('release-zips/checkout-audit/simple-checkout-'+width+'.png'),fullPage:true});
   await page.locator('#pay').click();await page.getByText('Test payment intercepted').waitFor();
   assert.equal(calls.at(-1).data.simple_checkout,true);assert.equal(calls.at(-1).data.quote_id,'test-quote');
   await page.locator('#changeAddress').click();
   await page.locator('mock-address').waitFor({state:'attached'});
   await page.evaluate(()=>{
     const w=document.querySelector('mock-address');w.value='Domain 1 Cyberjaya';w.dispatchEvent(new Event('input'));
   });
   assert.equal(await page.locator('#address').inputValue(),'Domain 1 Cyberjaya');
   await page.evaluate(()=>{
     const w=document.querySelector('mock-address');
     const event=new Event('gmp-select');event.placePrediction={toPlace:()=>({fetchFields:()=>new Promise(r=>setTimeout(r,100)),formattedAddress:'Domain 1, 63000 Cyberjaya, Selangor, Malaysia',location:{lat:()=>2.92,lng:()=>101.65},addressComponents:[{types:['country'],shortText:'MY'}]})};
     w.dispatchEvent(event);w.dispatchEvent(new Event('input'));
   });
   await page.waitForFunction(()=>document.getElementById('address').value==='Domain 1, 63000 Cyberjaya, Selangor, Malaysia');
   assert.equal(await page.locator('#addressPostcode').inputValue(),'63000');
   assert.equal(await page.locator('#addressCity').inputValue(),'Cyberjaya');
   assert.equal(await page.locator('#addressState').inputValue(),'Selangor');
   assert.equal(await page.locator('#deliveryLat').inputValue(),'2.92');
   for(const lang of ['zh','ms','en']){
     await page.locator('#langToggle,.buyer-lang-toggle').first().click();
     await page.waitForFunction(l=>document.documentElement.lang===l,lang);
   }
   assert.equal(await page.locator('#useAddress').innerText(),'Use this address');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.resolve('release-zips/checkout-audit/address-complete-'+width+'.png'),fullPage:true});
   await page.locator('#addressPostcode').fill('12');
   const beforeIncomplete=calls.length;
   await page.locator('#useAddress').click();
   await page.getByText('Enter a five-digit postcode.',{exact:true}).waitFor();
   await page.locator('#saveDefaultAddress').click();
   assert.equal(calls.length,beforeIncomplete);
   assert.equal(await page.locator('#addressEditor').isVisible(),true);
   assert.equal(await page.locator('#pay').isEnabled(),false);
   await page.locator('#addressPostcode').fill('63000');await page.locator('#addressCity').fill('');await page.locator('#useAddress').click();
   await page.getByText('Enter the city.',{exact:true}).waitFor();
   await page.locator('#addressCity').fill('Cyberjaya');await page.locator('#addressState').selectOption('');await page.locator('#useAddress').click();
   await page.getByText('Select the state.',{exact:true}).waitFor();
   await page.locator('#address').fill('Another office, 50450 Kuala Lumpur, Malaysia');
   const n=calls.length;await page.waitForTimeout(800);assert.equal(calls.length,n);
   assert.equal(await page.evaluate(()=>Number.isNaN(pmDeliveryFee())),true);
   assert.equal(await page.locator('#pay').isEnabled(),false);
   await page.locator('#useAddress').click();await page.locator('#parcelService').waitFor();
   await page.locator('input[name="deliveryChoice"][value="PM Express"]').check();
   await page.waitForFunction(()=>pmDeliveryFee()===6.99);
   assert.equal(await page.locator('#addressEditor').isVisible(),false);
   assert.equal(await page.evaluate(()=>pmDeliveryAdminFee()),0.4);
   assert.match(await page.locator('#summary').innerText(),/26\.99/);
   await page.screenshot({path:path.resolve('release-zips/checkout-audit/pm-express-auto-'+width+'.png'),fullPage:true});
   const request=calls.filter(c=>c.endpoint==='/api/delivery/quotation').at(-1).data;
   assert.equal(request.simple_checkout,true);assert.equal(request.location_confirmed,true);assert.equal(request.service_type,'');
   await page.locator('#payment').selectOption('Pay on Arrival');
   await page.locator('input[name="deliveryChoice"][value="PM Pooling"]').check();
   assert.equal(await page.locator('#payment').inputValue(),'Billplz');
   await page.waitForFunction(()=>pmDeliveryFee()===6.99&&!document.getElementById('pay').disabled);
   assert.equal(calls.filter(c=>c.endpoint==='/api/delivery/quotation').at(-1).data.logistics_method,'PM Pooling');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.resolve('release-zips/checkout-audit/pm-pooling-'+width+'.png'),fullPage:true});
   await page.locator('input[name="deliveryChoice"][value="EasyParcel"]').check();assert.equal(await page.locator('#payment').inputValue(),'Billplz');
   await page.locator('input[name="deliveryChoice"][value="Lalamove Segera"]').check();
   await page.locator('#parcelService').waitFor();await page.locator('#parcelService').selectOption('car-quote');
   assert.equal(await page.evaluate(()=>pmDeliveryFee()),12.4);
   await page.locator('#pay').click();await page.getByText('Test payment intercepted').waitFor();
   assert.equal(calls.at(-1).data.service_type,'CAR');
   assert.equal(calls.at(-1).data.service_options,true);
   failed=true;await page.evaluate(()=>pmDeliveryInvalidate());await page.getByText('Local delivery is not set up by this seller yet. Choose another delivery option.').waitFor();
   assert.equal(await page.locator('#deliveryVehicle').isVisible(),false);
   assert.equal(await page.locator('#pay').isEnabled(),false);failed=false;
   await page.evaluate(()=>{document.getElementById('deliveryConfirmed').checked=false;pmDeliveryInvalidate();});
   await page.waitForFunction(()=>pmDeliveryFee()===6.99&&!document.getElementById('pay').disabled);
   assert.equal(await page.locator('#addressEditor').isVisible(),false);
   assert.equal(await page.evaluate(()=>pmDeliveryAdminFee()),0.4);
   await page.evaluate(()=>{
    window.originalGeocode=google.maps.Geocoder.prototype.geocode;
    google.maps.Geocoder.prototype.geocode=async()=>{throw new Error('Address lookup unavailable.');};
    document.getElementById('deliveryConfirmed').checked=false;pmDeliveryInvalidate();
   });
   await page.getByText('Address lookup unavailable.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Choose delivery address',exact:true}).waitFor();
   assert.equal(await page.locator('#pay').isEnabled(),false);
   assert(!(await page.locator('#summary').innerText()).includes('Get a quote'));
   await page.evaluate(()=>{google.maps.Geocoder.prototype.geocode=window.originalGeocode;});
   await page.locator('#deliveryQuote').click();
   assert.equal(await page.locator('#addressEditor').isVisible(),true);
   await page.locator('#useAddress').click();
   await page.waitForFunction(()=>pmDeliveryFee()===6.99&&!document.getElementById('pay').disabled);
   await page.locator('input[name="deliveryChoice"][value="Ambil Sendiri"]').check();assert.equal(await page.evaluate(()=>pmDeliveryFee()),0);
  }
  poolingEligible=false;
  await page.goto(origin+'/buyer/checkout.html?product_id=1');await page.locator('#parcelService').waitFor();
  assert.equal(await page.locator('input[value="PM Pooling"]').isVisible(),false);
  assert.equal(await page.locator('input[value="PM Pooling"]').isDisabled(),true);
  poolingEligible=true;
  savedPoint=true;const beforeMaps=mapCalls;
  await page.goto(origin+'/buyer/checkout.html?product_id=1');await page.locator('#parcelService').waitFor();
  await page.locator('input[name="deliveryChoice"][value="Lalamove Segera"]').check();await page.locator('#parcelService').waitFor();
  assert.equal(await page.evaluate(()=>pmDeliveryFee()),6.99);assert.equal(mapCalls,beforeMaps);
  await page.locator('input[name="deliveryChoice"][value="PM Express"]').check();await page.waitForFunction(()=>pmDeliveryFee()===6.99);
  assert.equal(mapCalls,beforeMaps);assert.equal(await page.locator('#addressEditor').isVisible(),false);
  quoteDelay=1200;
  for(const method of ['EasyParcel','Lalamove Segera','PM Express','EasyParcel']){
   await page.locator('input[name="deliveryChoice"][value="'+method+'"]').check();
   await page.waitForFunction(()=>document.getElementById('deliveryStatus').textContent==='Getting quotation...');
   assert.match(await page.locator('#summary').innerText(),/Calculating delivery/);
   assert.equal(await page.locator('#pay').isEnabled(),false);
   await page.waitForFunction(()=>pmDeliveryFee()===6.99&&!document.getElementById('pay').disabled);
   assert.equal(await page.evaluate(()=>pmDeliveryAdminFee()),.4);
  }
  // Switching during a slow quotation must discard its result and quote the new provider.
  await page.locator('input[name="deliveryChoice"][value="Lalamove Segera"]').check();
  await page.waitForFunction(()=>document.getElementById('deliveryStatus').textContent==='Getting quotation...');
  await page.locator('input[name="deliveryChoice"][value="PM Express"]').check();
  await page.waitForFunction(()=>pmDeliveryFee()===6.99&&!document.getElementById('pay').disabled);
  assert.equal(calls.filter(c=>c.endpoint==='/api/delivery/quotation').at(-1).data.logistics_method,'PM Express');
  assert.equal(await page.locator('#parcelOffers').isVisible(),false);
  quoteDelay=0;
  savedPoint=false;incompleteProfile=true;calls=[];
  await page.goto(origin+'/buyer/checkout.html?product_id=1');
  await page.locator('#addressNotice').filter({hasText:'Complete your delivery address'}).waitFor();
  assert.equal(await page.locator('#addressEditor').isVisible(),false);
  assert.equal(await page.locator('#pay').isEnabled(),false);
  await page.locator('#changeAddress').click();
  assert.equal(await page.locator('#addressEditor').isVisible(),true);
  assert.equal(calls.filter(c=>c.endpoint==='/api/payments/billplz/create').length,0);
  assert.deepEqual(errors,[]);console.log('PASS simple checkout: three widths, automatic quotes and totals, compact old/new addresses, edit invalidation, server-owned vehicle, payment restrictions and errors');
  const seller=await browser.newContext();let saved,servicesFail=false;
  await seller.addInitScript(()=>{localStorage.setItem('pm_token','test');localStorage.setItem('pm_user',JSON.stringify({id:2,role:'seller',seller_status:'approved'}));});
  await seller.route('**/*',async route=>{
   const req=route.request();if(req.url().startsWith(origin))return route.continue();
   const endpoint=new URL(req.url()).pathname;
   if(endpoint==='/api/delivery/pickup'){
    if(req.method()==='POST'){saved=req.postDataJSON();return route.fulfill({json:{ok:true}});}
    return route.fulfill({json:{pickup:{address:'Test pickup',coordinates:{lat:3.15,lng:101.71},city:'MY KUL',service_type:'MOTORCYCLE'}}});
   }
   if(endpoint==='/api/delivery/services')return route.fulfill(servicesFail?{status:503,json:{error:'Temporarily unavailable'}}:{json:{cities:[{locode:'MY KUL',name:'Kuala Lumpur',services:[{key:'MOTORCYCLE',load:{value:10,unit:'kg'},dimensions:{}}]}]}});
   return route.fulfill({json:{notifications:[],user:{id:2,role:'seller',seller_status:'approved'}}});
  });
  const sellerPage=await seller.newPage();
  for(const unavailable of [false,true]){
   servicesFail=unavailable;saved=null;
   await sellerPage.goto(origin+'/seller/pickup-location.html');
   if(unavailable)await sellerPage.getByText('Temporarily unavailable',{exact:true}).waitFor();
   else await sellerPage.waitForFunction(()=>!document.getElementById('deliveryVehicle').disabled);
   assert.equal(await sellerPage.locator('#lat').isVisible(),false);
   await sellerPage.locator('#savePickup').click();
   await sellerPage.getByText('Lokasi pengambilan disimpan.',{exact:true}).waitFor();
   assert.equal(saved.city,'MY KUL');assert.equal(saved.service_type,'MOTORCYCLE');
  }
  console.log('PASS seller pickup settings: save and preserve configuration during courier outage');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
