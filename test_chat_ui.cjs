const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file))});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});let rows=[],reads=[],fail=false;const errors=[];
 try{
 async function pageFor(role,id){
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  await ctx.addInitScript(({role,id})=>{localStorage.setItem('pm_token',role+'-test');localStorage.setItem('pm_user',JSON.stringify({id,role,name:'Test'}));localStorage.setItem('pasarmalam-lang','en');},{role,id});
  await ctx.route('https://pasarmalam-backend.onrender.com/**',route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname==='/api/messages'&&req.method()==='POST'){
    if(fail)return route.fulfill({status:503,json:{error:'Try again'}});
    const data=req.postDataJSON();assert.equal(data.product_id,42);assert.equal(data.buyer_id,1);
    rows.push({...data,id:rows.length+1,buyer_name:'Same Name',seller_name:'Shop <script>',product_name:'Cable',sender_role:role,read_at:0});return route.fulfill({status:201,json:{ok:true,id:rows.length}});
   }
   if(url.pathname==='/api/messages/read'){const data=req.postDataJSON();reads.push({...data,role});rows.filter(m=>m.product_id===data.product_id&&m.buyer_id===data.buyer_id&&m.id<=data.through_id&&m.sender_role!==role).forEach(m=>m.read_at=1);return route.fulfill({json:{ok:true}});}
   return route.fulfill({json:{messages:rows,notifications:[],is_open:true,eligible:false,orders:[]}});
  });
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));return p;
 }
 const buyer=await pageFor('buyer',1),seller=await pageFor('seller',2);
 await buyer.goto(origin+'/buyer/chat.html?product_id=42');await buyer.locator('#chatText').fill('Is this available?');await buyer.locator('#chatSend').click();await buyer.waitForFunction(()=>document.getElementById('chatStatus').textContent==='Message sent.');
 await seller.goto(origin+'/seller/messages.html');await seller.locator('#conversations button').click();await seller.waitForFunction(()=>!document.querySelector('#conversations').textContent.includes('unread'));
 assert(reads.some(r=>r.role==='seller'&&r.product_id===42));
 await seller.locator('#chatText').fill('Yes <img src=x onerror=alert(1)>');await seller.locator('#chatSend').click();await seller.waitForFunction(()=>document.getElementById('chatStatus').textContent==='Message sent.');
 await buyer.locator('#chatRefresh').click();await buyer.waitForFunction(()=>document.getElementById('chatMessages').textContent.includes('Yes <img'));
 assert.equal(await buyer.locator('#chatMessages img').count(),0);assert(reads.some(r=>r.role==='buyer'));
 fail=true;await buyer.locator('#chatText').fill('Keep this draft');await buyer.locator('#chatSend').click();await buyer.waitForFunction(()=>document.getElementById('chatStatus').textContent==='Try again');assert.equal(await buyer.locator('#chatText').inputValue(),'Keep this draft');
 fs.mkdirSync('../outputs/chat',{recursive:true});
 for(const p of [buyer,seller]){assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'../outputs/chat/'+(p===buyer?'buyer':'seller')+'-mobile.png',fullPage:true});await p.setViewportSize({width:1440,height:1000});await p.screenshot({path:'../outputs/chat/'+(p===buyer?'buyer':'seller')+'-desktop.png',fullPage:true});}
 assert.deepEqual(errors,[]);console.log('PASS: buyer sends, seller selects correct thread and replies, unread readback, escaping, failed-send draft retention, responsive layout');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
