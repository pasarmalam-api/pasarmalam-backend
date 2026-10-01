const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();let saved,writes=0;
  await page.addInitScript(()=>{localStorage.setItem('pm_token','test');localStorage.setItem('pm_user',JSON.stringify({id:2,role:'seller',seller_status:'approved'}));localStorage.setItem('pasarmalam-lang','en');});
  await page.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.hostname==='pickup.test'){
    const file=path.join(path.resolve('landing-site-v2'),url.pathname);
    return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':'text/html'}):route.fulfill({status:404,body:''});
   }
   if(url.hostname==='maps.googleapis.com')return route.fulfill({contentType:'text/javascript',body:`class Places extends HTMLElement{constructor(){super();this.value='';}connectedCallback(){this.innerHTML='<input placeholder="Search Malaysian addresses">';}}customElements.define('gmp-place-autocomplete',Places);window.google={maps:{importLibrary:async()=>({PlaceAutocompleteElement:Places}),Geocoder:class{async geocode(){return {results:[]};}}}};pmPickupMapsReady();`});
   if(url.pathname==='/api/maps/config')return route.fulfill({json:{browser_key:'mock'}});
   if(url.pathname==='/api/delivery/pickup'){
    if(req.method()==='POST'){writes++;saved=req.postDataJSON();return route.fulfill({json:{pickup:saved}});}
    return route.fulfill({json:{pickup:null}});
   }
   if(url.pathname==='/api/delivery/services')return route.fulfill({status:503,json:{error:'Temporarily unavailable'}});
   return route.fulfill({json:{user:{id:2,role:'seller',seller_status:'approved'},notifications:[]}});
  });
  for(const width of [360,402,1440]){
   await page.setViewportSize({width,height:900});await page.goto('http://pickup.test/seller/pickup-location.html');
   await page.locator('gmp-place-autocomplete').waitFor();
   assert.equal(await page.locator('#lat').isVisible(),false);assert.equal(await page.locator('#lng').isVisible(),false);
   assert.equal(await page.locator('#deliveryCity').isVisible(),false);
   await page.evaluate(()=>{const w=document.querySelector('gmp-place-autocomplete');const event=new Event('gmp-select');event.placePrediction={toPlace:()=>({formattedAddress:'CBD Perdana 3, 63000 Cyberjaya, Selangor, Malaysia',location:{lat:()=>2.92,lng:()=>101.65},addressComponents:[{types:['country'],shortText:'MY'}],fetchFields:async()=>{}})};w.dispatchEvent(event);});
   await page.waitForFunction(()=>document.getElementById('lat').value==='2.92');
   await page.locator('#pickupUnit').fill('F-LG-R5');
   await page.locator('#savePickup').click();await page.getByText('Pickup location saved.',{exact:true}).waitFor();
   assert.equal(saved.address,'F-LG-R5, CBD Perdana 3, 63000 Cyberjaya, Selangor, Malaysia');assert.equal(saved.confirmed,true);assert.equal(saved.coordinates.lat,'2.92');
   const before=writes;await page.locator('#pickupAddress').fill('ambiguous address');await page.locator('#savePickup').click();
   await page.getByText('Select a matching Malaysian address from the suggestions.',{exact:true}).waitFor();assert.equal(writes,before);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.resolve('../outputs/pickup-simple-'+width+'.png')});
  }
  console.log('PASS simplified pickup: three widths, Google selection, unit, saved coordinates, invalid-address guard and courier outage');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
