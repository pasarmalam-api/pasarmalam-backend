const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve('landing-site-v2/buyer');
const output=path.resolve('../outputs/buyer-mobile-audit');fs.mkdirSync(output,{recursive:true});
const product={id:2,seller_id:5,name:'USB Type C Cable with Three Colour Choices',shop:'PasarMalam Phone Accessories',price:10,stock:8,category:'Phone Accessories',condition:'New',price_mode:'Fixed',variants:['Black - 2 metres','White - 2 metres'],images:['http://buyer.test/pasarmalam-logo.png'],description:'Charging cable for everyday use.',shop_open:true};
const user={id:88,role:'buyer',name:'Test Buyer',email:'buyer@example.test',phone:'0123456789',address:'A long Malaysian delivery address, Kuala Lumpur 50450'};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const failures=[];let count=0;
 try{
  const ctx=await browser.newContext();
  await ctx.addInitScript(u=>{localStorage.setItem('pm_token','test-only');localStorage.setItem('pm_user',JSON.stringify(u));},user);
  await ctx.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='buyer.test'){
    const file=path.join(root,url.pathname);
    return route.fulfill({status:fs.existsSync(file)?200:404,body:fs.existsSync(file)?fs.readFileSync(file):'',contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html'});
   }
   if(url.hostname!=='pasarmalam-backend.onrender.com')return route.abort();
   return route.fulfill({json:{ok:true,user,products:[product],product,cart:[{...product,id:7,product_id:2,quantity:2}],orders:[{id:1,product_id:2,product_name:product.name,order_status:'delivered',payment_status:'paid',total:20}],notifications:[],unread:0,reviews:[],rates:[],messages:[],returns:[],wishlist:[{product_id:2}],items:[],vouchers:[],payments:[],tickets:[],branches:[]}});
  });
  const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
  for(const width of [320,360,390,768,1440]){
   const page=await ctx.newPage();await page.setViewportSize({width,height:844});
   for(const file of pages){
    await page.goto('http://buyer.test/'+file+'?id=2&product_id=2&seller_id=5&order_id=1');
    await page.waitForLoadState('networkidle');
    const issues=await page.evaluate(()=>{
     const bad=[];
     if(document.documentElement.scrollWidth>innerWidth+1)bad.push('page overflow');
     for(const el of document.querySelectorAll('main button,main input,main select,main textarea,header button')){
      const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
      const scroll=el.closest('.cats');
      const scrollable=scroll&&getComputedStyle(scroll).overflowX==='auto'&&scroll.getBoundingClientRect().right<=innerWidth;
      if(!scrollable&&(r.left< -1||r.right>innerWidth+1))bad.push('outside viewport: '+(el.id||el.textContent));
      if(el.tagName==='BUTTON'&&(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2))bad.push('clipped button: '+el.textContent);
     }
     const detail=document.querySelector('.buyer-product #detail'),photo=document.querySelector('.buyer-product #photo');
     if(detail&&innerWidth<=760){
      if(detail.getBoundingClientRect().width<innerWidth-40)bad.push('narrow product detail');
      if(detail.getBoundingClientRect().top<photo.getBoundingClientRect().bottom)bad.push('product panels overlap');
     }
     return bad;
    });
    if(issues.length)failures.push({file,width,issues});
    if(!process.env.SKIP_SCREENSHOTS&&['product.html','checkout.html','cart.html','signup.html','index.html'].includes(file))await page.screenshot({path:path.join(output,file.replace('.html','')+'-'+width+'.png'),fullPage:true});
    if(file==='index.html'&&width<=760){
     const last=page.locator('.cats button').last();await last.scrollIntoViewIfNeeded();
     const rect=await last.boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width+1,'Last category must be reachable');
    }
    count++;
   }
   await page.close();
  }
  console.log(JSON.stringify({pages:pages.length,checks:count,failures},null,2));
  assert.deepEqual(failures,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
