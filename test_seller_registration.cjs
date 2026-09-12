const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
(async()=>{
  for(const dir of ['seller-app','landing-site-v2/seller']){
    const html=fs.readFileSync(dir+'/register.html','utf8');
    const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
    const elements=new Map();
    const calls=[];
    const context=vm.createContext({document:{getElementById(id){if(!elements.has(id))elements.set(id,{value:'test-value',textContent:''});return elements.get(id)}},location:{replace(path){calls.push(path)}},fetch:async()=>({ok:true,json:async()=>({})})});
    vm.runInContext(script,context);
    vm.runInContext('sellerOtpToken="verified";',context);
    await Promise.all([context.applySeller(),context.applySeller()]);
    assert.deepEqual(calls,['thank-you.html']);
    const thankYou=fs.readFileSync(dir+'/thank-you.html','utf8');
    for(const lang of ['ms','en','zh']){
      const translated=new Map();
      vm.runInNewContext(thankYou.match(/<script>([\s\S]*?)<\/script>/)[1],{localStorage:{getItem(key){assert.equal(key,'pasarmalam-lang');return lang}},document:{documentElement:{},getElementById(id){if(!translated.has(id))translated.set(id,{});return translated.get(id)}}});
      if(lang!=='en')assert.ok(translated.get('thanks').textContent);
    }
  }
  console.log('PASS: both registration redirects, duplicate-click guard, and three thank-you languages');
})().catch(e=>{console.error(e);process.exitCode=1});
