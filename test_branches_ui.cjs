const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext();
  await context.addInitScript(()=>{localStorage.setItem('pm_token','test');localStorage.setItem('pm_user',JSON.stringify({id:2,role:'seller',seller_status:'approved',status:'active',name:'Seller',shop_name:'Shop',shop_category:'Phones'}));localStorage.setItem('pasarmalam-lang','en');});
  let branches=[],writes=[],fail=false;
  await context.route('**/*',async route=>{
   const req=route.request(),url=req.url();if(url.startsWith(origin))return route.continue();
   if(!url.startsWith('https://pasarmalam-backend.onrender.com'))return route.abort();
   const endpoint=new URL(url).pathname;
   if(endpoint==='/api/seller/branches'){
    if(req.method()==='POST'){
     const form=req.postDataJSON();writes.push(form);
     if(fail)return route.fulfill({status:400,json:{error:'Branch changed elsewhere. Reload before saving.'}});
     branches=[{...form,id:'branch1',revision:(form.revision||0)+1,pickup:{address:form.address,coordinates:form.coordinates}}];
    }
    return route.fulfill({json:{branches,saved_id:'branch1'}});
   }
   if(endpoint==='/api/products')return route.fulfill({json:{products:[{id:1,seller_id:2,name:'USB Cable',price:20,stock:5,weight_kg:.5,shop:'Shop'}]}});
   if(endpoint==='/api/product/branches')return route.fulfill({json:{branches:[{id:'',name:'Main store',address:'Main pickup',price:20,is_open:true},{id:'branch1',name:'KL Branch',address:'KLCC, Malaysia',price:25.5,is_open:true},{id:'closed',name:'Closed branch',price:30,is_open:false}]}});
   if(endpoint==='/api/delivery/services')return route.fulfill({json:{cities:[]}});
   if(endpoint==='/api/seller/availability')return route.fulfill({json:{is_open:true,eligible:false}});
   if(endpoint==='/api/maps/config')return route.fulfill({json:{browser_key:''}});
   if(endpoint==='/api/checkout'){writes.push(req.postDataJSON());return route.fulfill({json:{id:123,total:25.5,payment_status:'unpaid'}});}
   return route.fulfill({json:{orders:[],cart:[],notifications:[],unread:0,campaigns:[]}});
  });
  const page=await context.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const width of [402,1440]){
   await page.setViewportSize({width,height:900});await page.goto(origin+'/seller/branches.html');
   await page.waitForFunction(()=>!document.getElementById('branchFields').disabled);
   await page.locator('#branchName').fill('KL Branch');await page.locator('#branchPhone').fill('01123456789');
   await page.locator('#branchSearch').click();await page.getByRole('status').filter({hasText:'unavailable'}).waitFor();
   await page.locator('#branchPickupAddress').fill('KLCC, Malaysia');await page.locator('#branchLat').fill('3.158');await page.locator('#branchLng').fill('101.712');
   await page.locator('#branchConfirmed').check();await page.getByRole('spinbutton',{name:'USB Cable branch price'}).fill('25.50');
   await page.locator('#branchSave').click();await page.waitForFunction(()=>document.getElementById('branchFeedback').textContent==='Branch saved.');
   assert.equal(writes.at(-1).prices['1'],'25.50');assert.equal(writes.at(-1).confirmed,true);
   assert.equal(await page.locator('#branchSelect').inputValue(),'branch1');
   assert.match(await page.locator('#branchProducts').textContent(),/5/);
   await page.screenshot({path:path.resolve('../outputs/seller-branches-'+width+'.png'),fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.getByRole('spinbutton',{name:'USB Cable branch price'}).fill('');await page.locator('#branchOpen').uncheck();
   await page.locator('#branchSave').click();await page.waitForFunction(()=>document.getElementById('branchFeedback').textContent==='Branch saved.'&&!document.getElementById('branchFields').disabled);
   assert.equal(writes.at(-1).prices['1'],'');assert.equal(writes.at(-1).is_open,false);
   fail=true;await page.locator('#branchSave').click();await page.getByRole('status').filter({hasText:'changed elsewhere'}).waitFor();
   assert.equal(await page.locator('#branchSave').isEnabled(),true);fail=false;
  }
  await page.goto(origin+'/seller/settings.html');await page.getByRole('link',{name:'Branches',exact:true}).click();await page.locator('#branchName').waitFor();
  await context.addInitScript(()=>{localStorage.setItem('pm_user',JSON.stringify({id:1,role:'buyer',name:'Buyer',phone:'01123456789',address:'Test delivery'}));});
  for(const width of [402,1440]){
   await page.setViewportSize({width,height:900});await page.goto(origin+'/buyer/checkout.html?product_id=1');
   await page.waitForFunction(()=>document.getElementById('checkoutBranch')&&!document.getElementById('checkoutBranch').disabled);
   await page.locator('input[name="deliveryChoice"][value="Ambil Sendiri"]').check();
   assert.match(await page.locator('#summary').textContent(),/RM20.00/);
   await page.locator('#checkoutBranch').selectOption('branch1');assert.match(await page.locator('#summary').textContent(),/RM25.50/);
   assert.equal(await page.locator('#branchAddress').textContent(),'KLCC, Malaysia');
   assert.equal(await page.locator('#checkoutBranch option[value="closed"]').evaluate(e=>e.disabled),true);
   await page.locator('#payment').selectOption('Cash Pickup');await page.locator('#pay').click();await page.waitForFunction(()=>document.getElementById('result').textContent.includes('PM-123'));
   assert.equal(writes.at(-1).branch_id,'branch1');assert.equal(writes.at(-1).expected_unit_price,25.5);
   await page.screenshot({path:path.resolve('../outputs/buyer-branches-'+width+'.png'),fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  assert.deepEqual(errors,[]);console.log('PASS branch creation/editing, inherited prices, errors, navigation, responsive checkout and server-price payload');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
