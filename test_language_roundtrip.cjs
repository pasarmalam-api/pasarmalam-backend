const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<html><body><aside><a class="brand">PasarMalam</a></aside><header></header><main></main></body></html>'}));
  for(const kind of ['seller','buyer']){
   await page.goto('http://language.test/'+kind+'/index.html');
   await page.evaluate(()=>{localStorage.setItem('pasarmalam-lang','en');document.querySelector('main').innerHTML='<h2 id="label">Lokasi Pengambilan</h2><p id="status">Lokasi pengambilan disimpan.</p><p id="stock">Stok 99</p><p id="voucher">Voucher / kod promosi</p><input id="address" value="Jalan Perdana 63000"><button id="save">Simpan lokasi</button>';});
   await page.addScriptTag({content:fs.readFileSync('landing-site-v2/'+kind+'/badges.js','utf8')});
   const selector=kind==='seller'?'.seller-lang-toggle':'.buyer-lang-toggle';
   await page.locator(selector).waitFor();
   if(kind==='seller'){
    await page.waitForFunction(()=>document.getElementById('label').textContent==='Pickup Location');
    for(const lang of ['zh','ms','en','zh','ms','en']){
     await page.locator(selector).click();
     assert.equal(await page.evaluate(()=>document.documentElement.lang),lang);
     assert.equal(await page.locator('#save').textContent(),{en:'Save location',ms:'Simpan lokasi',zh:'保存地点'}[lang]);
    }
    await page.evaluate(()=>document.getElementById('status').textContent='Mencari lokasi...');
    await page.waitForFunction(()=>document.getElementById('status').textContent==='Finding location...');
   }else{
    await page.waitForFunction(()=>document.getElementById('stock').textContent==='Stock 99');
    assert.equal(await page.locator('#voucher').textContent(),'Voucher / promo code');
    for(let i=0;i<6;i++)await page.locator(selector).click();
    assert.equal(await page.locator('#stock').textContent(),'Stock 99');
    assert.equal(await page.locator('#voucher').textContent(),'Voucher / promo code');
   }
   assert.equal(await page.locator('#address').inputValue(),'Jalan Perdana 63000');
   assert.equal(await page.evaluate(()=>localStorage.getItem('pasarmalam-lang')),'en');
  }
  console.log('PASS: seller pickup and buyer labels round-trip across EN/ZH/MS; dynamic status and form values preserved');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
