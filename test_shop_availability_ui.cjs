const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{
 const file=path.join(root,new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.png')?'image/png':'text/html');
 res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  let opened=true,fail=false,eligible=true;const writes=[],errors=[];
  const ctx=await browser.newContext();
  await ctx.addInitScript(()=>{
   localStorage.setItem('pm_token','test');localStorage.setItem('pm_user',JSON.stringify({id:2,role:'seller',name:'Test seller'}));
   localStorage.setItem('pasarmalam-lang','ms');localStorage.setItem('pasarmalam-buyer-lang-version','20260903-ms-default');
  });
  await ctx.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(req.url().startsWith(origin))return route.continue();
   if(url.origin!=='https://pasarmalam-backend.onrender.com')return route.abort();
   if(url.pathname==='/api/seller/availability'){
    assert.equal(req.headers().authorization,'Bearer test');
    if(req.method()==='POST'){
     writes.push(req.postDataJSON());
     if(fail)return route.fulfill({status:500,json:{error:'Simulated failure'}});
     opened=req.postDataJSON().is_open;
    }
    return route.fulfill({json:{is_open:opened,eligible}});
   }
   return route.fulfill({json:{
    products:[{id:1,seller_id:2,name:'Nasi goreng',shop:'Test Food Stall',category:'Street Food',shop_open:opened,price:12,stock:5,condition:'New',price_mode:'Fixed',images:[],variants:[]},
     {id:2,seller_id:9,name:'Cable',shop:'Other shop',category:'Phones',shop_open:true,price:10,stock:3,condition:'New'}],
    cart:[{product_id:1,quantity:1}],orders:[],reviews:[],notifications:[],campaigns:[],wallet:[],returns:[],messages:[],unread:0,metrics:{},cities:[]
   }});
  });
  const page=await ctx.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
  for(const width of [402,1440]){
   opened=true;fail=false;eligible=true;
   await page.setViewportSize({width,height:900});await page.goto(origin+'/seller/index.html');
   const sw=page.getByRole('switch');
   await sw.waitFor();await page.waitForFunction(()=>!document.querySelector('[role=switch]').disabled);
   assert(await sw.isChecked());
   await sw.click();await page.waitForFunction(()=>document.querySelector('.shop-availability [role=status]').textContent==='Ditutup');
   assert.deepEqual(writes.at(-1),{is_open:false});
   await page.reload();await page.waitForFunction(()=>!document.querySelector('[role=switch]').disabled);
   assert.equal(await sw.isChecked(),false);
   await page.screenshot({path:path.resolve('../outputs/seller-open-close-'+width+'.png'),fullPage:true});
   const bounds=await page.locator('.shop-availability').boundingBox();assert(bounds.width<=width);
   fail=true;await sw.click();await page.locator('.shop-availability [role=alert]').waitFor({state:'visible'});
   assert.equal(await sw.isChecked(),false);
   fail=false;await sw.click();await page.waitForFunction(()=>document.querySelector('.shop-availability [role=status]').textContent==='Dibuka');
   await page.locator('.seller-lang-toggle').click();
   await page.waitForFunction(()=>document.querySelector('.shop-availability [role=status]').textContent==='Open');
   await page.locator('.seller-lang-toggle').click();
   await page.waitForFunction(()=>document.querySelector('.shop-availability [role=status]').textContent==='\u8425\u4e1a\u4e2d');
   await page.evaluate(()=>localStorage.setItem('pasarmalam-lang','ms'));
  }
  eligible=false;await page.reload();await page.waitForFunction(()=>document.querySelector('.shop-availability')?.hidden);
  opened=false;
  await page.evaluate(()=>localStorage.setItem('pm_user',JSON.stringify({id:1,role:'buyer',name:'Buyer',phone:'01123456789',address:'Test address'})));
  // Later navigations use the buyer role rather than the initial seller fixture.
  await ctx.addInitScript(()=>localStorage.setItem('pm_user',JSON.stringify({id:1,role:'buyer',name:'Buyer',phone:'01123456789',address:'Test address'})));
  await page.setViewportSize({width:402,height:900});
  await page.goto(origin+'/buyer/index.html');
  await page.locator('#products .pm-shop-status').waitFor().catch(async e=>{console.log('Homepage diagnostics',errors,await page.locator('#products').textContent(),await page.evaluate(()=>({condition:document.getElementById('conditionFilter').value,shipping:document.getElementById('shippingFilter').value,rate:document.getElementById('ratingFilter').value})));throw e});
  assert(await page.locator('#products .buy').first().isDisabled());
  await page.goto(origin+'/buyer/category.html?category=Street%20Food');
  await page.locator('.pm-shop-status').waitFor();assert.match(await page.locator('#list').textContent(),/Kedai ditutup/);
  await page.goto(origin+'/buyer/product.html?id=1');
  await page.locator('button[onclick="buyNow()"]').waitFor();
  assert(await page.locator('button[onclick="buyNow()"]').isDisabled());
  assert(await page.locator('button[onclick="addCart()"]').isDisabled());
  assert.match(await page.locator('a[href*="seller_id"]').getAttribute('href'),/seller_id=2/);
  await page.locator('a[href*="seller_id"]').click();
  await page.waitForFunction(()=>document.getElementById('shopName').textContent==='Test Food Stall');
  assert(! (await page.locator('#items').textContent()).includes('Cable'));
  await page.screenshot({path:path.resolve('../outputs/buyer-closed-shop.png'),fullPage:true});
  await page.goto(origin+'/buyer/checkout.html?product_id=1');
  await page.waitForFunction(()=>document.getElementById('summary').textContent.includes('Kedai ditutup'));
  await page.selectOption('#shipping','Ambil Sendiri');await page.selectOption('#payment','Cash Pickup');
  await page.click('#pay');await page.waitForFunction(()=>document.getElementById('result').textContent.includes('Kedai ditutup'));
  assert.deepEqual(errors,[]);
  console.log('PASS seller toggle persistence, save failure, reopen, permissions UI, languages, mobile/desktop, closed buyer catalogue/store/product/checkout');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
