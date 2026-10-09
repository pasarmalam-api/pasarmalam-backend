const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const origin='http://127.0.0.1:'+server.address().port;
    const page=await browser.newPage();
    let fail = false, signedIn = false, existing = null, submissions = [];
    await page.route('https://pasarmalam-backend.onrender.com/**', async route => {
      const req = route.request();
      if(req.url().endsWith('/api/account/deletion')) {
        if(req.method()==='GET') return route.fulfill({status:signedIn?200:401,json:signedIn?{request:existing}:{error:'Login required'}});
        const data=req.postDataJSON();submissions.push(data);
        if(fail) return route.fulfill({status:503,json:{error:'Service temporarily unavailable'}});
        return route.fulfill({json:{ok:true,request:{id:7,status:'requested',due_at:1793404800}}});
      }
      return route.fulfill({json:{}});
    });
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const width of [375,1440]){
      await page.setViewportSize({width,height:900});
      const response=await page.goto(origin+'/delete-account.html');assert.equal(response.status(),200);
      assert(await page.getByRole('heading',{name:'Delete your PasarMalam account',exact:true}).isVisible());
      assert((await page.locator('main').innerText()).includes('within 30 days after verifying account ownership'));
      const mail=new URL(await page.locator('a[href^="mailto:"]').first().getAttribute('href'));
      assert.equal(mail.protocol,'mailto:');assert.equal(mail.pathname,'pasahmallam@gmail.com');
      assert.equal(mail.searchParams.get('subject'),'PasarMalam account deletion request');
      assert(mail.searchParams.get('body').includes('associated personal data'));
      assert(await page.locator('header img').evaluate(img=>img.complete&&img.naturalWidth>0));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.locator('#deletion-email').fill('privacy@example.test');
      await page.locator('#deletion-password').fill('synthetic-password');
      await page.locator('#confirm-deletion').check();
      fail=true;
      await page.getByRole('button',{name:'Request account deletion',exact:true}).click();
      await page.getByRole('status').filter({hasText:'Service temporarily unavailable'}).waitFor();
      assert.equal(await page.locator('#deletion-password').inputValue(),'');
      assert(await page.locator('#deletion-form').isVisible());
      fail=false;
      await page.locator('#deletion-password').fill('synthetic-password');
      await page.getByRole('button',{name:'Request account deletion',exact:true}).click();
      await page.getByRole('status').filter({hasText:'Request #7 received'}).waitFor();
      assert(await page.locator('#deletion-form').isHidden());
      fs.mkdirSync(path.resolve('release-zips/privacy-audit'),{recursive:true});
      await page.screenshot({path:path.resolve('release-zips/privacy-audit/deletion-'+width+'.png'),fullPage:true});
    }
    assert(submissions.every(x=>x.confirm===true&&x.email==='privacy@example.test'));
    signedIn=true;
    await page.goto(origin+'/delete-account.html');
    await page.locator('#deletion-credentials').waitFor({state:'hidden'});
    await page.locator('#confirm-deletion').check();
    await page.locator('#submit-deletion').click();
    await page.getByRole('status').filter({hasText:'Request #7 received'}).waitFor();
    assert(!('password' in submissions.at(-1)));
    existing={id:7,status:'reviewing',due_at:1793404800};
    await page.reload();
    await page.getByRole('status').filter({hasText:'Status: reviewing'}).waitFor();
    for (const width of [320,1440]) {
      await page.setViewportSize({width,height:900});
      await page.goto(origin+'/privacy.html');
      assert(await page.getByRole('heading',{name:'Privacy Policy',exact:true}).isVisible());
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    for(const file of ['policies.html','buyer/policies.html','seller/policies.html','buyer/profile.html','seller/settings.html']){
      const text=fs.readFileSync(path.join(root,file),'utf8');
      assert(text.includes('href="https://www.pasarmalamapp.com/delete-account.html"'),file);
      assert.equal((text.match(/id="account-deletion-heading"/g)||[]).length,1,file);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS deletion entry links, signed-in and password request flows, retry, status, privacy page and responsive layouts. Mock requests only; no live account deleted.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
