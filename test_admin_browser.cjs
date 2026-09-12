const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.PLAYWRIGHT_MODULES||'C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const root=path.resolve('admin-app');
const sellers=[{id:2,name:'Test Seller',shop_name:'Test Shop',email:'seller@example.test',status:'active',seller_status:'pending'}];
const base={users:[],products:[],orders:[],payments:[],returns:[],tickets:[],messages:[],open_disputes:[],wallet:[],campaigns:[],settings:[],audit:[],rates:[],notifications:[],summary:{},order_status:[],product_categories:[],seller_rank:[],return_rate:0,payment_mismatches:[],payout_blocks:[],account_flags:[],product_flags:[],high_value_orders:[],old_pending_payments:[]};
const writes=[];
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end('Not found')}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file))});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addInitScript(()=>{localStorage.setItem('pm_admin_token','test');localStorage.setItem('pm_admin_user',JSON.stringify({id:1,role:'admin'}))});
    await context.route('**/*',async route=>{
      const url=route.request().url();if(url.startsWith(origin))return route.continue();
      if(!url.startsWith('https://pasarmalam-backend.onrender.com/api/'))return route.abort();
      const request=route.request(),endpoint=new URL(url).pathname;
      if(request.method()==='POST'){
        const data=request.postDataJSON();writes.push({endpoint,data});
        if(endpoint==='/api/admin/user-status')Object.assign(sellers.find(s=>s.id===data.user_id),{status:data.status,seller_status:data.seller_status});
        return route.fulfill({json:{ok:true,decision_email_queued:true}});
      }
      let response={...base};
      if(endpoint==='/api/admin/sellers')response={sellers};
      if(endpoint==='/api/admin/metrics')response={users:0,products:0,orders:0,sales:0,buyers:0,sellers:1,returns:0,campaigns:0};
      return route.fulfill({json:response});
    });
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!['login.html','reset-admin.html'].includes(f));
    for(const file of pages){
      await page.goto(origin+'/'+file);await page.waitForTimeout(120);
      assert.equal(await page.locator('aside nav a').count(),18,file+' navigation');
      assert.equal(await page.locator('aside nav [aria-current=page]').count(),1,file+' active navigation');
      assert.equal(await page.getByRole('button',{name:'Back',exact:true}).count(),1,file+' back');
      assert.equal(await page.locator('.feedback.error').count(),0,file+' load error');
      for(const href of await page.locator('aside nav a').evaluateAll(links=>links.map(a=>a.getAttribute('href'))))assert.ok(fs.existsSync(path.join(root,href)),href);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),file+' horizontal overflow');
    }
    await page.goto(origin+'/sellers.html');await page.getByRole('button',{name:'Review & approve'}).click();
    await page.getByRole('button',{name:'Back',exact:true}).last().click();assert.equal(writes.length,0);
    await page.getByRole('button',{name:'Review & approve'}).click();await page.getByRole('button',{name:'Confirm approval'}).click();
    await page.getByText('Seller approved. Decision email queued.').waitFor();
    assert.equal(writes.length,1);assert.equal(writes[0].data.seller_status,'approved');
    await page.getByRole('button',{name:'Suspend account'}).waitFor();
    sellers[0].seller_status='pending';await page.reload();await page.getByRole('button',{name:'Reject application'}).click();
    await page.locator('#decisionReason').fill('Required document missing');await page.getByRole('button',{name:'Confirm rejection'}).click();
    await page.getByText('Seller rejected. Decision email queued.').waitFor();assert.equal(writes[1].data.reason,'Required document missing');
    await page.getByRole('link',{name:'Orders',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();await page.waitForURL('**/sellers.html');
    fs.mkdirSync('../outputs/admin-audit',{recursive:true});
    await page.screenshot({path:'../outputs/admin-audit/desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:'../outputs/admin-audit/mobile.png',fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
    await page.getByRole('button',{name:'Menu',exact:true}).click();assert.equal(await page.locator('aside nav').isVisible(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: '+pages.length+' pages, all navigation targets, approval/rejection, cancel/back, desktop/mobile layout');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
