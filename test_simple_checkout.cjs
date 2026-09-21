const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext();let calls=[],failed=false;
  await context.addInitScript(()=>{localStorage.setItem('pm_token','test');localStorage.setItem('pm_user',JSON.stringify({id:1,role:'buyer',name:'Test Buyer',phone:'01123456789',email:'test@example.com',address:'Office, 50088 Kuala Lumpur, Malaysia'}));localStorage.setItem('pasarmalam-lang','en');localStorage.setItem('pasarmalam-buyer-lang-version','20260903-ms-default');});
  await context.route('**/*',async route=>{
   const req=route.request();if(req.url().startsWith(origin))return route.continue();
   if(req.url().startsWith('https://maps.googleapis.com'))return route.fulfill({contentType:'text/javascript',body:`class Auto extends HTMLElement{};customElements.define('mock-address',Auto);window.google={maps:{importLibrary:async()=>({PlaceAutocompleteElement:Auto}),Geocoder:class{async geocode(){return {results:[{formatted_address:'Office, 50088 Kuala Lumpur, Malaysia',address_components:[{types:['country'],short_name:'MY'}],geometry:{location:{lat:()=>3.15,lng:()=>101.71}}}]};}}}};window.pmMapsLoaded();`});
   const endpoint=new URL(req.url()).pathname;
   if(req.method()!=='GET')calls.push({endpoint,data:req.postDataJSON()});
   if(endpoint==='/api/maps/config')return route.fulfill({json:{browser_key:'test'}});
   if(endpoint==='/api/profile')return route.fulfill({json:{user:{address:'Office, 50088 Kuala Lumpur, Malaysia'}}});
   if(endpoint==='/api/product/branches')return route.fulfill({json:{branches:[{id:'',name:'Main shop',price:20,is_open:true,address:'Seller address'}]}});
   if(endpoint==='/api/delivery/quotation'){
    if(failed)return route.fulfill({status:400,json:{error:'Local delivery is not set up by this seller yet. Choose another delivery option.'}});
    const q={quote_id:'test-quote',fee:6.99,courier_fee:6.59,admin_fee:.4,expires_at:Math.floor(Date.now()/1000)+300,service_name:'SPX Xpress'};
    const method=req.postDataJSON().logistics_method;
    return route.fulfill({json:method==='EasyParcel'?{offers:[q]}:method==='Lalamove Segera'?{offers:[{...q,service_type:'MOTORCYCLE',service_name:'Motorcycle'},{...q,quote_id:'car-quote',service_type:'CAR',service_name:'Car',fee:12.4}]}:q});
   }
   if(endpoint==='/api/payments/billplz/create')return route.fulfill({json:{message:'Test payment intercepted'}});
   return route.fulfill({json:{products:[{id:1,seller_id:2,name:'Cable',category:'Chargers',price:20,stock:5,shop:'Test Shop'}],cart:[],notifications:[],campaigns:[]}});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [360,402,1440]){
   calls=[];await page.setViewportSize({width,height:900});await page.goto(origin+'/buyer/checkout.html?product_id=1');
   await page.locator('#parcelService').waitFor();
   assert.equal(await page.locator('#addressEditor').isVisible(),false);
   for(const id of ['deliveryLat','deliveryLng','deliveryVehicle','deliveryCity','deliveryPackage','deliveryConfirmed','checkoutBranch'])assert.equal(await page.locator('#'+id).isVisible(),false,id);
   await page.locator('#parcelService').selectOption('test-quote');
   assert.equal(await page.evaluate(()=>pmDeliveryFee()),6.99);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.resolve('../outputs/simple-checkout-'+width+'.png'),fullPage:true});
   await page.locator('#pay').click();await page.getByText('Test payment intercepted').waitFor();
   assert.equal(calls.at(-1).data.simple_checkout,true);assert.equal(calls.at(-1).data.quote_id,'test-quote');
   await page.locator('#changeAddress').click();await page.locator('#address').fill('Another office, 50450 Kuala Lumpur, Malaysia');
   const n=calls.length;await page.waitForTimeout(800);assert.equal(calls.length,n);
   assert.equal(await page.evaluate(()=>Number.isNaN(pmDeliveryFee())),true);
   await page.locator('#useAddress').click();await page.locator('#parcelService').waitFor();
   await page.locator('input[name="deliveryChoice"][value="PM Express"]').check();
   await page.locator('#changeAddress').click();await page.locator('#useAddress').click();
   await page.waitForFunction(()=>pmDeliveryFee()===6.99);
   const request=calls.filter(c=>c.endpoint==='/api/delivery/quotation').at(-1).data;
   assert.equal(request.simple_checkout,true);assert.equal(request.location_confirmed,true);assert.equal(request.service_type,'');
   await page.locator('#payment').selectOption('Pay on Arrival');
   await page.locator('input[name="deliveryChoice"][value="EasyParcel"]').check();assert.equal(await page.locator('#payment').inputValue(),'Billplz');
   await page.locator('input[name="deliveryChoice"][value="Lalamove Segera"]').check();
   await page.locator('#parcelService').waitFor();await page.locator('#parcelService').selectOption('car-quote');
   assert.equal(await page.evaluate(()=>pmDeliveryFee()),12.4);
   await page.locator('#pay').click();await page.getByText('Test payment intercepted').waitFor();
   assert.equal(calls.at(-1).data.service_type,'CAR');
   assert.equal(calls.at(-1).data.service_options,true);
   failed=true;await page.evaluate(()=>pmDeliveryInvalidate());await page.getByText('Local delivery is not set up by this seller yet. Choose another delivery option.').waitFor();
   assert.equal(await page.locator('#deliveryVehicle').isVisible(),false);failed=false;
   await page.locator('input[name="deliveryChoice"][value="Ambil Sendiri"]').check();assert.equal(await page.evaluate(()=>pmDeliveryFee()),0);
  }
  assert.deepEqual(errors,[]);console.log('PASS simple checkout: three widths, automatic quotes, compact address, edit invalidation, server-owned vehicle, payment restrictions and errors');
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
   await sellerPage.locator('#confirmed').check();await sellerPage.locator('#savePickup').click();
   await sellerPage.getByText('Lokasi pengambilan disimpan.',{exact:true}).waitFor();
   assert.equal(saved.city,'MY KUL');assert.equal(saved.service_type,'MOTORCYCLE');
  }
  console.log('PASS seller pickup settings: save and preserve configuration during courier outage');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
