const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2/seller');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':'text/html');res.end(fs.readFileSync(file))});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{localStorage.setItem('pm_token','test-token');localStorage.setItem('pm_user',JSON.stringify({id:17,role:'seller'}));localStorage.setItem('pasarmalam-lang','en');});
 let requests=[],fail=false;const errors=[];
 await context.route('https://pasarmalam-backend.onrender.com/**',route=>{
   const req=route.request();
   if(req.url().endsWith('/api/seller/ai/listing')){
     assert.equal(req.headers().authorization,'Bearer test-token');const body=req.postDataJSON();requests.push(body);
     if(fail)return route.fulfill({status:400,json:{error:'AI service is unavailable.'}});
     return route.fulfill({json:body.action==='draft'?{products:[{name:'Cable',description:'Black cable',variants:['Black'],photo_indices:[0,1],questions:'Confirm connector and stock.'}]}:{answer:'Comparable listing RM10. Verify costs.',sources:[{title:'Test store',url:'https://example.com/cable'}],checked_at:new Date().toISOString()}});
   }
   return route.fulfill({json:{shop_category:'Chargers',products:[],notifications:[],orders:[],messages:[]}});
 });
 await context.route('https://api.cloudinary.com/**',route=>route.fulfill({json:{secure_url:'https://example.com/photo.jpg'}}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/ai-assistant.html');
 await page.getByRole('button',{name:'Create listing drafts',exact:true}).click();assert.match(await page.locator('#aiStatus').innerText(),/Select/);
 const photo={name:'product.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync(path.join(root,'seller-logo.jpg'))};
 await page.locator('#aiPhotos').setInputFiles([photo,photo]);await page.waitForFunction(()=>document.querySelectorAll('#aiPreviews img').length===2);
 await page.getByRole('button',{name:'Create listing drafts',exact:true}).click();assert.match(await page.locator('#aiStatus').innerText(),/permission/);assert.equal(requests.length,0);
 await page.locator('#aiConsent').check();await page.getByRole('button',{name:'Create listing drafts',exact:true}).click();await page.getByLabel('Product name',{exact:true}).waitFor();
 assert.equal(requests[0].images.length,2);assert(requests[0].images.every(x=>x.startsWith('data:image/jpeg;base64,')));
 await page.getByLabel('Product name',{exact:true}).fill('USB cable');
 await page.getByRole('button',{name:'Compare market prices',exact:true}).click();await page.getByRole('link',{name:'Test store',exact:true}).waitFor();
 assert(requests[1].query.includes('USB cable'));
 fs.mkdirSync('../outputs/seller-ai',{recursive:true});
 await page.screenshot({path:'../outputs/seller-ai/mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'../outputs/seller-ai/desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Review listing',exact:true}).click();await page.waitForURL('**/add-product.html?ai=draft');
 assert.equal(await page.locator('#name').inputValue(),'USB cable');assert.equal(await page.locator('#variants').inputValue(),'Black');assert.equal(await page.locator('#previewGrid img').count(),2);
 assert.equal(await page.locator('#price').inputValue(),'');assert.equal(await page.locator('#stock').inputValue(),'');assert.equal(await page.locator('#category').inputValue(),'Chargers');
 await page.goto(origin+'/ai-assistant.html');await page.waitForFunction(()=>document.querySelectorAll('#aiPreviews img').length===2);
 assert.equal(await page.getByLabel('Product name',{exact:true}).inputValue(),'USB cable');
 await page.getByRole('button',{name:'Remove photo 2',exact:true}).click();assert.equal(await page.locator('#aiPreviews img').count(),1);
 fail=true;await page.locator('#aiConsent').check();await page.getByRole('button',{name:'Create listing drafts',exact:true}).click();await page.waitForFunction(()=>document.getElementById('aiStatus').textContent.includes('unavailable'));
 assert(await page.getByRole('button',{name:'Create listing drafts',exact:true}).isEnabled());assert.equal(await page.locator('#aiDrafts section').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: multi-photo consent, drafts, research links, editable handoff, category, no automatic publishing, removal, errors, desktop/mobile');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
