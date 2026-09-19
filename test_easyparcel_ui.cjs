const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('admin-app');
const server=http.createServer((req,res)=>{
  const file=path.join(root,new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':'text/html');
  res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const ctx=await browser.newContext();
    await ctx.addInitScript(()=>{localStorage.setItem('pm_admin_token','test');localStorage.setItem('pm_admin_user',JSON.stringify({role:'admin'}));});
    let configured=false,connected=false,failed=false,starts=0;
    await ctx.route('https://pasarmalam-backend.onrender.com/**',async route=>{
      const p=new URL(route.request().url()).pathname;
      if(p.endsWith('/easyparcel/status'))return route.fulfill({json:{configured,connected,booking_enabled:false}});
      if(p.endsWith('/easyparcel/connect')){
        starts++;
        return route.fulfill({status:failed?503:200,json:failed?{error:'Connection unavailable'}:{authorization_url:'https://pasarmalam-backend.onrender.com/api/integrations/easyparcel/authorize?ticket=test'}});
      }
      if(p.endsWith('/easyparcel/authorize'))return route.fulfill({contentType:'text/html',body:'Test authorization destination'});
      return route.fulfill({json:{settings:{},notifications:[]}});
    });
    const page=await ctx.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/settings.html');
    await page.getByText('EasyParcel credentials are missing in Render.').waitFor();
    assert(await page.locator('#easyparcelConnect').isDisabled());
    configured=true;await page.locator('#easyparcelRefresh').click();
    await page.getByText('Not connected.',{exact:true}).waitFor();
    failed=true;await page.locator('#easyparcelConnect').click();
    await page.getByText('Connection unavailable',{exact:true}).waitFor();
    assert(await page.locator('#easyparcelConnect').isEnabled());
    connected=true;await page.locator('#easyparcelRefresh').click();
    await page.getByRole('button',{name:'Reconnect EasyParcel',exact:true}).waitFor();
    for(const width of [402,1440]){
      await page.setViewportSize({width,height:900});
      await page.locator('#easyparcelConnect').scrollIntoViewIfNeeded();
      assert(await page.locator('#easyparcelConnect').isVisible());
    }
    failed=false;await page.locator('#easyparcelConnect').click();
    await page.waitForURL('**/authorize?ticket=test');
    assert.equal(starts,2);assert.deepEqual(errors,[]);
    console.log('PASS EasyParcel admin configuration, status, failure/retry, reconnect and navigation');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
