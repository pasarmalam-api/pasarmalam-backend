const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve('landing-site-v2');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='buyer.test'){
    const file=path.join(root,url.pathname);
    if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});
    return route.fulfill({status:404,body:''});
   }
   if(url.hostname==='pasarmalam-backend.onrender.com')return route.fulfill({json:{products:[{id:991,name:'USB C Cable',category:'Chargers',shop:'Accessory Store',stock:4,price:10,condition:'New',shop_open:true},{id:992,name:'Phone',category:'Phones',shop:'Phone Store',stock:2,price:100,condition:'New',shop_open:true}],cart:[],notifications:[],orders:[],rates:[],reviews:[]}});
   return route.abort();
  });
  for(const width of [1440,375]){
   await page.setViewportSize({width,height:900});
   await page.goto('http://buyer.test/buyer/index.html');
   for(const label of ['Aksesori Telefon','Phone Accessories','\u624b\u673a\u914d\u4ef6','Aksesori Telefon']){
    const button=page.locator('#cats button').filter({hasText:label});
    await button.waitFor();
    assert((await button.getAttribute('onclick')).includes('category=Chargers'));
    assert(await button.evaluate(el=>el.scrollWidth<=el.clientWidth));
    await page.locator('#langToggle').click();
   }
   await page.goto('http://buyer.test/buyer/category.html?category=Chargers');
   await page.waitForFunction(()=>document.querySelector('#title').textContent==='Phone Accessories');
   assert.equal(await page.locator('#list .card').count(),1);
   assert.match(await page.locator('#list').innerText(),/USB C Cable/);
   for(const label of ['\u624b\u673a\u914d\u4ef6','Aksesori Telefon','Phone Accessories']){
    await page.locator('.buyer-lang-toggle').click();
    await page.waitForFunction(label=>document.querySelector('#title').textContent===label,label);
   }
   await page.evaluate(()=>{localStorage.setItem('pasarmalam-lang','ms')});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS buyer category labels, language switching, preserved filter and mobile fit');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
