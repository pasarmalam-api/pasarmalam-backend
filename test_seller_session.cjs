const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve('landing-site-v2/seller');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file))});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{if(!sessionStorage.getItem('initialized')){localStorage.setItem('pm_token','test-token');localStorage.setItem('pm_user',JSON.stringify({id:17,role:'seller'}));localStorage.setItem('pasarmalam-lang','en');sessionStorage.setItem('initialized','1')}});
 const requests=[];let unauthorized=false;
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin))return route.continue();if(!url.startsWith('https://pasarmalam-backend.onrender.com'))return route.abort();requests.push(route.request().headers());return route.fulfill({status:unauthorized?401:200,json:unauthorized?{error:'Session expired'}:{products:[],orders:[],wallet:[],messages:[],reviews:[],returns:[],rates:[],notifications:[]}})});
 const page=await context.newPage();
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
   await page.goto(origin+'/'+file);
   for(const href of await page.locator('aside nav a').evaluateAll(links=>links.map(a=>a.getAttribute('href')))){
     if(/^[a-z-]+\.html$/.test(href))assert.ok(fs.existsSync(path.join(root,href)),file+' broken navigation '+href);
   }
 }
 await page.goto(origin+'/index.html');await page.waitForTimeout(500);
 fs.mkdirSync('../outputs/seller-audit',{recursive:true});
 await page.screenshot({path:'../outputs/seller-audit/mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'../outputs/seller-audit/desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});
 assert.ok(requests.length>5);assert.ok(requests.every(r=>r.authorization==='Bearer test-token'));
 assert.equal(await page.locator('a[href="register.html"]:visible').count(),0);
 assert.equal(await page.locator('button[onclick*="login.html"]:visible').count(),0);
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 await page.getByRole('link',{name:'Change Password',exact:true}).click();
 assert.equal(await page.locator('#email').isVisible(),false);assert.equal(await page.locator('#currentPassword').isVisible(),true);
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Sign Out',exact:true}).click();
 await page.waitForTimeout(300);assert.equal(await page.locator('#email').isVisible(),true);assert.equal(await page.locator('#currentPassword').isVisible(),false);
 await page.evaluate(()=>{localStorage.setItem('pm_token','test-token');localStorage.setItem('pm_user',JSON.stringify({role:'buyer'}))});
 await page.goto(origin+'/orders.html');await page.locator('.auth-lock').waitFor();
 await page.evaluate(()=>localStorage.setItem('pm_user',JSON.stringify({role:'seller'})));unauthorized=true;
 await page.goto(origin+'/index.html');await page.waitForURL('**/login.html?next=index.html');
 assert.equal(await page.evaluate(()=>localStorage.getItem('pm_token')),null);
 console.log('PASS seller auth headers, duplicate controls, password navigation, logout, buyer guard, expired session');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
