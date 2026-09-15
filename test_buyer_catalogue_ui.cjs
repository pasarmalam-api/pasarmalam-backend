const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{
 const file=path.join(root,new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');
 res.end(fs.readFileSync(file));
});
(async()=>{
 const source=await (await fetch('https://pasarmalam-backend.onrender.com/api/products',{signal:AbortSignal.timeout(20000)})).json();
 const products=source.products.filter(p=>p.stock>0).sort((a,b)=>(b.category==='Phones')-(a.category==='Phones'));
 assert(products.length>0);
 const imageCache=new Map();
 const urls=[...new Set(products.map(p=>p.images?.[0]||p.image_url).filter(Boolean))];
 await Promise.all(urls.map(async url=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
  assert(response.ok,'Product image unavailable: '+url);
  imageCache.set(url,Buffer.from(await response.arrayBuffer()));
 }));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const ctx=await browser.newContext(),errors=[],writes=[];
  await ctx.route('**/*',route=>{
   const url=route.request().url();
   if(imageCache.has(url))return route.fulfill({body:imageCache.get(url),contentType:'image/jpeg'});
   return url.startsWith(origin) ? route.continue() : route.abort();
  });
  await ctx.route('https://pasarmalam-backend.onrender.com/**',route=>{
   if(route.request().method()!=='GET')writes.push(route.request().url());
   return route.fulfill({json:{products,reviews:[],rates:[],cart:[],orders:[],notifications:[],unread:0}});
  });
  const page=await ctx.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,1024,768,402,375]){
   await page.setViewportSize({width,height:1000});await page.goto(origin+'/buyer/index.html',{waitUntil:'domcontentloaded'});
   await page.locator('#products .photo img').first().waitFor();
   await page.waitForFunction(()=>[...document.querySelectorAll('#products .photo img')].filter(i=>i.getBoundingClientRect().top<innerHeight).every(i=>i.complete&&i.naturalWidth>0),null,{timeout:45000});
   assert(await page.locator('.market-banner').evaluate(i=>i.complete&&i.naturalWidth>0));
   assert(await page.locator('.seller-entry').isVisible());
   const metrics=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth,
    buttons:[...document.querySelectorAll('#cats button')].map(b=>({font:parseFloat(getComputedStyle(b).fontSize),overflow:b.scrollWidth>b.clientWidth})),
    photos:[...document.querySelectorAll('#products .photo')].map(p=>({w:p.clientWidth,h:p.clientHeight,fit:getComputedStyle(p.querySelector('img')).objectFit})),
    nav:getComputedStyle(document.querySelector('.bottom-nav')).position,
    first:document.querySelector('#products .photo').getBoundingClientRect().top
   }));
   assert(!metrics.overflow,JSON.stringify(metrics));assert(metrics.buttons.every(b=>b.font<=13&&!b.overflow));
   assert(metrics.photos.every(p=>Math.abs(p.w-p.h)<2&&p.fit==='contain'));
   assert.equal(metrics.nav,'static');assert(metrics.first<1000);
   await page.screenshot({path:path.resolve('../outputs/buyer-catalogue-'+width+'.png'),fullPage:true});
   if(width===1440)await page.screenshot({path:path.resolve('../outputs/buyer-desktop-preview.png')});
   await page.locator('#products .photo').first().click();await page.waitForURL('**/product.html?id=*',{waitUntil:'domcontentloaded'});
   await page.locator('.photo img').first().waitFor();
   assert.equal(await page.locator('.photo img').first().evaluate(i=>getComputedStyle(i).objectFit),'contain');
  }
  await page.goto(origin+'/buyer/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#cats .cat').nth(1).click();await page.waitForURL('**/category.html?category=Phones',{waitUntil:'domcontentloaded'});
  await page.locator('#list .card').first().waitFor();
  assert.equal(await page.locator('#list .photo img').first().evaluate(i=>getComputedStyle(i).objectFit),'contain');
  const keyword=products[0].name.trim().split(/\s+/)[0];
  const expected=products.filter(p=>[p.name,p.shop,p.category,p.description].join(' ').toLowerCase().includes(keyword.toLowerCase()));
  await page.goto(origin+'/buyer/index.html',{waitUntil:'domcontentloaded'});await page.locator('#search').fill(keyword);await page.locator('#searchButton').click();
  await page.locator('#products .photo[href="product.html?id='+products[0].id+'"]').waitFor();
  await page.goto(origin+'/buyer/category.html?q='+encodeURIComponent(keyword),{waitUntil:'domcontentloaded'});
  await page.locator('#list .card').first().waitFor();
  assert.equal(await page.locator('#list .card').count(),expected.length);
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  console.log('PASS: 5 viewport sizes, real product images loaded, uncropped square photos, compact fonts, navigation, search and detail/category photo fitting. No production writes.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
