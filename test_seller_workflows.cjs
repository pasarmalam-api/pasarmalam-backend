const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2/seller');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file))});
const user={id:17,role:'seller',name:'Seller',shop_name:'Shop',email:'seller@example.test',identity_type:'Passport',identity_number:'TEST',bank_name:'Bank',bank_account_name:'Seller',bank_account_number:'123',business_type:'Sole Proprietor',ssm_number:'123'};
const product={id:101,seller_id:17,name:'Camera',shop:'Shop',category:'Electronics',condition:'New',price_mode:'Fixed',price:50,stock:3,variants:[],images:[]};
const order={id:201,product_id:101,buyer_name:'Buyer A',payment_status:'paid',order_status:'to_pack',escrow_status:'holding',total:50};
const data={products:[product],orders:[order],returns:[{id:301,order_id:201,status:'requested',dispute_status:'open',request_type:'Refund',reason:'Wrong size'}],reviews:[{id:401,rating:4,title:'Review',body:'Good',buyer_name:'Buyer A'}],messages:[{id:1,product_id:101,buyer_name:'Buyer A',seller_name:'Shop',sender_role:'buyer',body:'Hello'}],campaigns:[],notifications:[{id:501,title:'Order',body:'New order',target_url:'orders.html',read_at:0}],rates:[],wallet:[],summary:{},tickets:[],unread:1};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(u=>{localStorage.setItem('pm_token','test');localStorage.setItem('pm_user',JSON.stringify(u));localStorage.setItem('pasarmalam-lang','en')},user);
 const writes=[];let fail=false;
 await context.route('**/*',route=>{const request=route.request(),url=request.url();if(url.startsWith(origin))return route.continue();if(url.includes('api.cloudinary.com'))return route.fulfill({json:{secure_url:'https://example.test/image.jpg'}});if(!url.startsWith('https://pasarmalam-backend.onrender.com'))return route.abort();const endpoint=new URL(url).pathname;if(request.method()!=='GET'){writes.push({endpoint,body:request.postDataJSON()});return route.fulfill({status:fail?400:200,json:fail?{error:'Simulated validation failure'}:{ok:true,id:601,user,token:'test',answer:'Listing advice',print_text:'PM-AWB-201'}})}return route.fulfill({json:data})});
 const page=await context.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function visit(file){await page.goto(origin+'/'+file);await page.waitForTimeout(180)}
 async function fill(values){for(const [id,value]of Object.entries(values))await page.locator('#'+id).fill(value)}
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){await visit(file+(file==='edit-product.html'?'?id=101':file==='order-detail.html'?'?id=201':''));assert.equal(await page.locator('.auth-lock').count(),0,file+' unexpectedly locked')}
 async function action(file,values,handler,endpoint){await visit(file);await fill(values);const before=writes.length;await page.locator('button[onclick="'+handler+'"]').click();await page.waitForTimeout(250);assert.equal(writes.length,before+1,file+' submit');assert.equal(writes.at(-1).endpoint,endpoint);console.log('PASS '+file+' '+handler)}
 await action('add-product.html',{name:'Camera',price:'50',stock:'3'},'save()','/api/products');assert.equal(writes.at(-1).body.name,'Camera');
 await action('edit-product.html?id=101',{name:'Camera edited',price:'60',stock:'4'},'save()','/api/products/101');assert.equal(writes.at(-1).body.name,'Camera edited');
 await visit('edit-product.html');assert.equal(await page.locator('button[onclick="save()"]').isDisabled(),true);
 await visit('edit-product.html?id=101');page.once('dialog',d=>d.dismiss());let n=writes.length;await page.locator('button[onclick="removeProduct()"]').click();assert.equal(writes.length,n);
 page.once('dialog',d=>d.accept());await page.locator('button[onclick="removeProduct()"]').click();await page.waitForTimeout(100);assert.equal(writes.at(-1).endpoint,'/api/products/101');
 await action('campaigns.html',{name:'Campaign',value:'10'},'create()','/api/campaigns');assert.equal(writes.at(-1).body.name,'Campaign');
 await action('support.html',{subject:'Help',message:'Upload problem'},'createTicket()','/api/support/tickets');assert.ok((await page.locator('#status').textContent()).includes('submitted'));
 await action('messages.html',{reply:'Reply for buyer A'},'send()','/api/messages');assert.equal(writes.at(-1).body.product_id,101);assert.equal(writes.at(-1).body.buyer_name,'Buyer A');
 await action('reviews.html',{reply401:'Thank you'},'replyReview(401)','/api/reviews/reply');
 await action('returns.html',{resp301:'Please return item'},'respond(301)','/api/returns/respond');
 await action('logistics.html',{orderId:'201'},'awb()','/api/logistics/awb');
 await action('store-profile.html',{shopName:'Updated Shop'},'save()','/api/profile');
 await action('settings.html',{shopName:'Updated Shop'},'saveProfile()','/api/profile');
 await visit('settings.html');await page.locator('#identityType').selectOption({index:1});await fill({sellerName:'Seller',identityNumber:'ABC123',bankName:'Bank',bankAccountName:'Seller',bankAccountNumber:'123456'});await page.locator('button[onclick="savePayoutProfile()"]').click();await page.waitForTimeout(200);assert.equal(writes.at(-1).body.bank_account_number,'123456');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 await visit('add-product.html');await page.locator('#productImage').setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});await page.locator('#previewGrid .preview').waitFor();
 await fill({name:'Photo product',price:'5',stock:'2'});await page.locator('button[onclick="save()"]').click();await page.waitForTimeout(200);assert.deepEqual(writes.at(-1).body.images,['https://example.test/image.jpg']);
 await visit('business-verification.html');await page.locator('#businessType').selectOption({index:1});await fill({ssmNumber:'SSM123'});await page.locator('#docInput').setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.getElementById('uploadStatus').textContent.includes('uploaded'));await page.locator('button[onclick="submitVerification()"]').click();await page.waitForTimeout(200);assert.equal(writes.at(-1).body.ssm_document_url,'https://example.test/image.jpg');
 await action('login.html',{currentPassword:'old-password',newPassword:'new-password'},'changePassword()','/api/auth/change-password');
 await action('order-detail.html?id=201',{tracking:'TRACK-1'},'update()','/api/orders/status');
 await action('order-detail.html?id=201',{},'awb()','/api/logistics/awb');
 await visit('orders.html');await page.locator('button[onclick*="current=\'to_pack\'"]').click();await page.locator('button[onclick="quick(201,\'shipped\')"]').click();await page.waitForTimeout(200);assert.equal(writes.at(-1).body.order_status,'shipped');
 order.payment_status='unpaid';await visit('order-detail.html?id=201');assert.equal(await page.locator('#awbBtn').isDisabled(),true);order.payment_status='paid';
 await visit('order-detail.html?id=999');assert.ok((await page.locator('#detail').textContent()).includes('No order'));
 await action('notifications.html',{},'markRead()','/api/notifications/read');
 await visit('ai-assistant.html');await fill({prompt:'Camera listing'});await page.locator('button[onclick="askAi()"]').click();await page.waitForTimeout(200);assert.equal(writes.at(-1).endpoint,'/api/ai/assistant');
 fail=true;await action('support.html',{subject:'Failure',message:'Failure'},'createTicket()','/api/support/tickets');assert.ok((await page.locator('#status').textContent()).includes('Simulated validation failure'));
 assert.deepEqual(errors,[]);
 console.log('PASS seller populated workflow suite');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
