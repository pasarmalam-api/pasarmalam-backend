const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'), fs=require('fs'), path=require('path'), assert=require('assert');
const root=path.resolve('admin-app');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':'text/html');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage();
    await page.addInitScript(()=>{localStorage.setItem('pm_admin_token','synthetic');localStorage.setItem('pm_admin_user',JSON.stringify({role:'admin'}));});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    let saved=0;
    const record={id:7,user_id:22,email:'privacy@example.test',role:'seller',status:'requested',requested_at:1790726400,due_at:1793318400,fulfilment_note:'<img src=x onerror=alert(1)>'};
    await page.route('https://pasarmalam-backend.onrender.com/**',route=>{
      const req=route.request();
      if(req.url().endsWith('/api/admin/account-deletions')){
        assert.equal(req.headers().authorization,'Bearer synthetic');
        if(req.method()==='POST'){
          const data=req.postDataJSON();
          if(data.action==='preview')return route.fulfill({json:{preview:{email:record.email,counts:{orders:0,wallet:0},blockers:[],legacy_reviews:[],legacy_messages:[]}}});
          if(data.action==='purge'){
            assert.equal(data.confirm_email,record.email);assert.equal(data.confirm_purge,true);assert.equal(data.legacy_reviewed,true);
            record.status='external_cleanup';return route.fulfill({json:{requests:[record]}});
          }
          if(data.status==='completed')return route.fulfill({status:400,json:{error:'Account still exists. Remove the account and associated data before recording completion; suspension is not deletion.'}});
          saved++;record.status='reviewing';record.fulfilment_note=data.note;
        }
        return route.fulfill({json:{requests:[record]}});
      }
      return route.fulfill({json:{tickets:[],messages:[],open_disputes:[],notifications:[]}});
    });
    for(const width of [360,1440]){
      record.status='requested';
      await page.setViewportSize({width,height:900});
      await page.goto('http://127.0.0.1:'+server.address().port+'/tickets.html');
      const area=page.locator('#account-deletions');
      await area.getByText('privacy@example.test',{exact:false}).waitFor();
      assert.equal(await area.locator('article img').count(),0);
      await area.locator('textarea').fill('Reviewing associated records and provider copies.');
      await area.getByRole('button',{name:'Save review notes',exact:true}).click();
      await area.getByText('reviewing',{exact:true}).waitFor();
      await area.getByRole('button',{name:'Record completed deletion'}).click();
      await area.getByRole('status').filter({hasText:'Account still exists'}).waitFor();
      await area.getByRole('button',{name:'Review data for erasure'}).click();
      const purge=area.locator('form[data-purge]');
      await purge.locator('[name=confirm_email]').fill(record.email);
      await purge.locator('[name=legacy_reviewed]').check();
      await purge.locator('[name=confirm_purge]').check();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      fs.mkdirSync('release-zips/privacy-audit',{recursive:true});
      await page.screenshot({path:'release-zips/privacy-audit/admin-'+width+'.png',fullPage:true});
      await purge.getByRole('button',{name:'Erase local account data'}).click();
      await area.getByText('external_cleanup',{exact:true}).waitFor();
    }
    assert.equal(saved,2);assert.deepEqual(errors,[]);
    console.log('PASS admin deletion queue, notes, completion guard, escaping and mobile/desktop layouts. Mocked API only.');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
