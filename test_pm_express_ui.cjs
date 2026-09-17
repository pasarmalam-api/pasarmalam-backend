const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{
 const file=path.join(root,new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const ctx=await browser.newContext();
  await ctx.addInitScript(()=>{
   localStorage.setItem('pm_token','test');
   localStorage.setItem('pm_user',JSON.stringify({id:2,role:'seller',name:'Test Seller',seller_status:'approved',status:'active'}));
  });
  const order={id:123,product_id:1,total:29.4,payment_status:'unpaid',payment_method:'Pay on Arrival',logistics_method:'PM Express',order_status:'placed',escrow_status:'pending'};
  const writes=[];
  await ctx.route('**/*',async route=>{
   const req=route.request();if(req.url().startsWith(origin))return route.continue();
   if(!req.url().startsWith('https://pasarmalam-backend.onrender.com'))return route.abort();
   const endpoint=new URL(req.url()).pathname;
   if(endpoint==='/api/orders')return route.fulfill({json:{orders:[order]}});
   if(endpoint==='/api/orders/status'){const body=req.postDataJSON();writes.push(body);order.order_status=body.order_status;return route.fulfill({json:{ok:true}});}
   return route.fulfill({json:{user:{id:2,role:'seller',seller_status:'approved',status:'active'},notifications:[],unread:0}});
  });
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/seller/orders.html');
  await page.getByRole('button',{name:'To Pack (1)',exact:true}).click();
  await page.getByRole('button',{name:'Mark Shipped',exact:true}).click();
  await page.waitForFunction(()=>document.body.textContent.includes('Shipped (1)'));
  assert.equal(writes.at(-1).order_status,'shipped');
  await page.goto(origin+'/seller/order-detail.html?id=123');
  await page.getByText(/payment is due on arrival/).waitFor();
  assert.equal(await page.locator('#actionRow select').isEnabled(),true);
  assert.equal(order.payment_status,'unpaid');
  assert.deepEqual(errors,[]);
  console.log('PASS PM Express unpaid seller fulfillment and detail controls');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
