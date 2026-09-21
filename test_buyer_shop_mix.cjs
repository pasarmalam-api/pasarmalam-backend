const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {mixShops}=require('./landing-site-v2/buyer/catalogue-products.js');
const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const products=[...Array.from({length:20},(_,i)=>({id:i+1,seller_id:1,shop:'Food Shop',category:'Street Food',name:'Meal '+i})),{id:21,seller_id:2,shop:'Phone Shop',category:'Phones',name:'Phone'},{id:22,seller_id:3,shop:'Accessories Shop',category:'Chargers',name:'Cable'},{id:23,seller_id:2,shop:'Phone Shop',category:'Phones',name:'Second Phone'}].map(p=>({...p,stock:5,price:10,condition:'New',shop_open:true,images:['http://buyer.test/buyer/pasarmalam-buyer-banner.png']}));
assert.deepEqual(mixShops(products).slice(0,5).map(p=>p.id),[1,21,22,2,23]);
assert.equal(new Set(mixShops(products).map(p=>p.id)).size,products.length);
assert.deepEqual(mixShops([]),[]);
assert.deepEqual(mixShops(products.filter(p=>p.seller_id===1)),products.filter(p=>p.seller_id===1));
assert.deepEqual(mixShops([{id:1,shop:'A'},{id:2,shop:'A'},{id:3,shop:'B'}]).map(p=>p.id),[1,3,2]);
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='buyer.test'){
    const file=path.join(path.resolve('landing-site-v2'),url.pathname);
    return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html'}):route.fulfill({status:404,body:''});
   }
   if(url.hostname==='www.pasarmalamapp.com')return route.fulfill({body:'Seller destination'});
   if(url.hostname==='pasarmalam-backend.onrender.com')return route.fulfill({json:{products,cart:[],orders:[],notifications:[],rates:[],reviews:[]}});
   return route.abort();
  });
  for(const width of [1440,1024,768,402,375]){
   await page.setViewportSize({width,height:1000});
   await page.goto('http://buyer.test/buyer/index.html');
   await page.locator('#products .card').first().waitFor();
   assert.equal(await page.locator('#products .card').count(),23,'All must not omit smaller shops');
   assert.deepEqual(await page.locator('#products .photo').evaluateAll(els=>els.slice(0,3).map(e=>e.getAttribute('href'))),['product.html?id=1','product.html?id=21','product.html?id=22']);
   const banner=page.locator('.market-banner');await banner.waitFor();
   assert(await banner.evaluate(i=>i.complete&&i.naturalWidth>0&&i.getBoundingClientRect().height>100));
   assert.equal(await banner.evaluate(i=>getComputedStyle(i).objectFit),'contain');
   assert(await banner.evaluate(i=>Math.abs(i.clientWidth/i.clientHeight-i.naturalWidth/i.naturalHeight)<0.01),'Banner must fill its width at the original aspect ratio');
   const seller=page.locator('.buyer-seller-link');assert(await seller.isVisible());
   assert(await seller.evaluate(e=>e.getBoundingClientRect().bottom<innerHeight&&e.scrollWidth<=e.clientWidth));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.resolve('../outputs/buyer-restored-'+width+'.png')});
   await page.locator('#cats [data-category="Phones"]').click();
   await page.waitForFunction(()=>document.querySelectorAll('#products .card').length===2);
   assert.equal(new URL(page.url()).pathname,'/buyer/index.html');
   assert(await banner.isVisible());
   await page.locator('#search').fill('Phone');
   await page.locator('#cats [data-category="All"]').click();
   await page.waitForFunction(()=>document.querySelectorAll('#products .card').length===23);
   assert.equal(await page.locator('#search').inputValue(),'');
   assert.deepEqual(await page.locator('#products .shop-name').evaluateAll(els=>els.slice(0,3).map(e=>e.getAttribute('href'))),[1,2,3].map(id=>'seller-store.html?seller_id='+id));
   await seller.click();await page.waitForURL('**/become-seller.html');
  }
  await page.goto('http://buyer.test/buyer/category.html?category=All');
  await page.locator('#list .card').first().waitFor();
  assert.equal(await page.locator('#list .card').count(),23);
  assert.deepEqual(await page.locator('#list .result-link').evaluateAll(els=>els.slice(0,3).map(e=>e.getAttribute('href'))),[1,21,22].map(id=>'product.html?id='+id));
  await page.goto('http://buyer.test/buyer/category.html?category=Phones');
  await page.locator('#list .card').first().waitFor();
  assert.equal(await page.locator('#list .card').count(),2);
  assert.deepEqual(errors,[]);
  console.log('PASS: banner, seller navigation, mixed shops without cutoff, category filtering and five viewport widths');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
