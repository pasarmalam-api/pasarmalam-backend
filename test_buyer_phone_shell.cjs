const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve('landing-site-v2');
const output=path.resolve('release-zips/phone-shell-check');
fs.mkdirSync(output,{recursive:true});
const product={id:2,seller_id:5,name:'Wireless microphone',shop:'Phone Accessories',price:38,stock:9,category:'Phone Accessories',condition:'New',price_mode:'Fixed',variants:[],images:['http://buyer.test/buyer/pasarmalam-logo.png'],description:'A microphone for recording.',shop_open:true};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [320,390,428,768,1440]){
   const context=await browser.newContext({viewport:{width,height:844}});
   await context.addInitScript(()=>{localStorage.setItem('pasarmalam-lang','en');localStorage.setItem('pasarmalam-buyer-lang-version','20260903-ms-default');});
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='buyer.test'){
     const file=path.join(root,url.pathname);
     return route.fulfill({status:fs.existsSync(file)?200:404,body:fs.existsSync(file)?fs.readFileSync(file):'',contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html'});
    }
    if(url.hostname!=='pasarmalam-backend.onrender.com')return route.abort();
    return route.fulfill({json:{ok:true,products:[product],reviews:[],notifications:[],unread:0,cart:[]}});
   });
   const page=await context.newPage();
   for(const file of ['index.html','product.html']){
    await page.goto('http://buyer.test/buyer/'+file+'?id=2');
    await page.waitForLoadState('networkidle');
    if(file==='product.html'){
     await page.getByText('Product option',{exact:false}).waitFor();
     assert.equal(await page.locator('#variant option').innerText(),'Default option');
     assert((await page.locator('#detail').innerText()).includes('Not specified'));
     assert((await page.locator('#detail').innerText()).includes('Request a return or exchange from the Orders page'));
     for(const [language,option] of [['zh','默认选项'],['ms','Pilihan asal'],['en','Default option']]){
      await page.locator('.buyer-lang-toggle').click();
      await page.waitForFunction(lang=>document.documentElement.lang===lang,language);
      assert.equal(await page.locator('#variant option').innerText(),option);
      assert.equal(await page.locator('#variant').inputValue(),'Pilihan asal','translation must not change checkout variant values');
     }
    }
    const geometry=await page.evaluate(()=>{
     const main=document.querySelector('main').getBoundingClientRect(),nav=document.querySelector('.buyer-navigation').getBoundingClientRect();
     return {overflow:document.documentElement.scrollWidth>innerWidth+1,mainRight:main.right,mainBottom:main.bottom,navTop:nav.top,navBottom:nav.bottom,header:document.querySelector('header').getBoundingClientRect().height};
    });
    assert(!geometry.overflow,`${file} ${width}: horizontal overflow`);
    if(width<=760){
     assert(geometry.mainRight<=width+1,`${file}: scroll area outside viewport`);
     assert(geometry.mainBottom<=geometry.navTop+1,`${file}: content extends beneath navigation`);
     assert(geometry.navBottom<=844+1,`${file}: navigation outside viewport`);
     if(file==='index.html')assert(geometry.header<=200,`home header too tall: ${geometry.header}`);
     if(file==='product.html'){
      for(const text of ['Add to cart','Buy Now','Chat Seller']){
       const button=page.getByRole('button',{name:text,exact:true});
       await button.scrollIntoViewIfNeeded();
       const rect=await button.boundingBox();
       assert(rect.y>=geometry.header-1&&rect.y+rect.height<=geometry.navTop+1,`${text} is covered`);
      }
      await page.screenshot({path:path.join(output,'product-controls-'+width+'.png')});
      await page.locator('main').evaluate(el=>el.scrollTop=0);
     }
    }
    await page.screenshot({path:path.join(output,file.replace('.html','')+'-'+width+'.png')});
   }
   await context.close();
  }
  console.log('PASS: phone shell, product controls and English labels at five viewport widths');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
