const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{const f=path.join(root,new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':f.endsWith('.jpg')?'image/jpeg':'text/html');res.end(fs.readFileSync(f))});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext();const writes=[],errors=[];
  let product={id:1,seller_id:2,name:'Bulk cables',shop:'Test shop',category:'Electronics',price:3,stock:100,weight_kg:.05,condition:'New',price_mode:'Fixed',images:[],variants:[],selling_mode:'bulk',minimum_order:10};
  await context.addInitScript(()=>{localStorage.setItem('pm_token','test');localStorage.setItem('pm_user',JSON.stringify({id:location.pathname.includes('/seller/')?2:1,role:location.pathname.includes('/seller/')?'seller':'buyer',name:'Test',shop_name:'Test shop',shop_category:'Electronics',address:'Test address',phone:'01123456789'}));localStorage.setItem('pasarmalam-lang','en')});
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());if(req.url().startsWith(origin))return route.continue();
   if(url.origin!=='https://pasarmalam-backend.onrender.com')return route.abort();
   if(req.method()!=='GET')writes.push({path:url.pathname,data:req.postDataJSON()});
   if(url.pathname==='/api/products'&&req.method()==='POST'){product={...product,...req.postDataJSON()};return route.fulfill({json:{id:1}})}
   if(url.pathname==='/api/products/1'&&req.method()==='PUT'){product={...product,...req.postDataJSON()};return route.fulfill({json:{ok:true}})}
   if(url.pathname==='/api/seller/category')return route.fulfill({json:{shop_category:'Electronics'}});
   if(url.pathname==='/api/cart')return route.fulfill({json:{cart:[{...product,id:5,product_id:1,quantity:product.minimum_order}]}});
   return route.fulfill({json:{products:[product],reviews:[],branches:[],notifications:[],campaigns:[],is_open:true,eligible:false,ok:true}});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const width of [360,1440]){
   await page.setViewportSize({width,height:900});
   await page.goto(origin+'/seller/add-product.html');
   await page.waitForFunction(()=>document.getElementById('category').value==='Electronics');
   assert(await page.locator('#minimumOrder').isDisabled());
   await page.selectOption('#sellingMode','bulk');await page.fill('#minimumOrder','10');
   await page.fill('#name','Bulk cables');await page.fill('#price','3');await page.fill('#stock','100');await page.fill('#weight','50');
   await page.locator('button[onclick="save()"]').click();await page.waitForURL('**/product-published.html');
   assert.equal(writes.at(-1).data.minimum_order,10);
   await page.goto(origin+'/seller/edit-product.html?id=1');await page.waitForFunction(()=>document.getElementById('minimumOrder').value==='10');
   assert.equal(await page.locator('#sellingMode').inputValue(),'bulk');
   await page.fill('#minimumOrder','12');await page.locator('button[onclick="save()"]').click();
   await page.waitForFunction(()=>document.getElementById('out').textContent.includes('updated'));
   await page.screenshot({path:path.resolve('../tmp/bulk-seller-'+width+'.png'),fullPage:true});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'seller overflow');
   await page.goto(origin+'/seller/products.html');await page.locator('#rows tr').waitFor();
   await page.selectOption('#sellingFilter','bulk');assert.equal(await page.locator('#rows tr').count(),1);
   await page.selectOption('#sellingFilter','retail');assert.equal(await page.locator('#rows tr').count(),0);
   await page.goto(origin+'/buyer/product.html?id=1');await page.locator('#qty').waitFor();
   assert.equal(await page.locator('#qty').inputValue(),'12');
   await page.fill('#qty','1');assert.equal(await page.evaluate(()=>validateQty()),false);
   await page.fill('#qty','12');assert.equal(await page.evaluate(()=>validateQty()),true);
   await page.screenshot({path:path.resolve('../tmp/bulk-buyer-'+width+'.png'),fullPage:true});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'buyer overflow');
   await page.goto(origin+'/buyer/cart.html');await page.locator('.qty').waitFor();
   assert(await page.getByRole('button',{name:'Decrease quantity'}).isDisabled());
  }
  assert.deepEqual(errors,[]);console.log('PASS: bulk create, edit, reload, buyer minimum, cart controls and layouts at 360/1440px');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
