const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const origin='http://127.0.0.1:'+server.address().port;
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const width of [375,1440]){
      await page.setViewportSize({width,height:900});
      const response=await page.goto(origin+'/delete-account.html');assert.equal(response.status(),200);
      assert(await page.getByRole('heading',{name:'Delete your PasarMalam account',exact:true}).isVisible());
      assert((await page.locator('main').innerText()).includes('within 30 days after verifying account ownership'));
      const mail=new URL(await page.getByRole('link',{name:'Email deletion request',exact:true}).getAttribute('href'));
      assert.equal(mail.protocol,'mailto:');assert.equal(mail.pathname,'pasahmallam@gmail.com');
      assert.equal(mail.searchParams.get('subject'),'PasarMalam account deletion request');
      assert(mail.searchParams.get('body').includes('associated personal data'));
      assert(await page.locator('header img').evaluate(img=>img.complete&&img.naturalWidth>0));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      fs.mkdirSync(path.resolve('../outputs'),{recursive:true});
      await page.screenshot({path:path.resolve('../outputs/deletion-'+width+'.png'),fullPage:true});
    }
    for(const file of ['policies.html','buyer/policies.html','seller/policies.html','buyer/profile.html','seller/settings.html']){
      const text=fs.readFileSync(path.join(root,file),'utf8');
      assert(text.includes('href="https://www.pasarmalamapp.com/delete-account.html"'),file);
      assert.equal((text.match(/id="account-deletion-heading"/g)||[]).length,1,file);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS public deletion page, 30-day wording, email request, logo, mobile/desktop layout and five entry links. No email sent or account deleted.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
