const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2');
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  const types={'.css':'text/css','.js':'application/javascript','.png':'image/png','.html':'text/html'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage();
    const origin='http://127.0.0.1:'+server.address().port;
    for(const width of [360,1440]){
      await page.setViewportSize({width,height:900});
      for(const file of ['index.html','about.html','contact.html','policies.html']){
        const response=await page.goto(origin+'/'+file);assert.equal(response.status(),200);
        assert((await page.locator('body').innerText()).includes('Tanitooluwa Ventures'),file);
        assert((await page.locator('body').innerText()).includes('202603072240 (AS0511875-M)'),file);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),file+' overflow');
        for(const href of await page.locator('a').evaluateAll(links=>links.map(a=>a.getAttribute('href')).filter(h=>h&&h.startsWith('/')))){
          const target=path.join(root,href.endsWith('/')?href+'index.html':href);
          assert(fs.existsSync(target),file+' missing '+href);
        }
        if(file==='about.html'){
          assert(await page.getByRole('link',{name:'admin@pasarmalamapp.com',exact:true}).isVisible());
          fs.mkdirSync('../outputs',{recursive:true});
          await page.screenshot({path:'../outputs/company-about-'+width+'.png',fullPage:true});
        }
      }
    }
    console.log('PASS: four company pages at 360px and 1440px; ownership, SSM, internal links, email contact and no horizontal overflow.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
