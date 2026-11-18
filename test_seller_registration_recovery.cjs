const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('landing-site-v2/seller/register.html', 'utf8');
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
function setup() {
  const fields = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(([,id]) => [id, {
    value:'', textContent:'', attrs:{}, listeners:{}, disabled:false,
    setAttribute(k,v){this.attrs[k]=v}, removeAttribute(k){delete this.attrs[k]},
    setCustomValidity(message){this.validationMessage=message},reportValidity(){this.reported=true},
    addEventListener(k,fn){this.listeners[k]=fn}, checkValidity(){return /.+@.+\..+/.test(this.value)},
    focus(){this.focused=true}, scrollIntoView(){this.scrolled=true}
  }]));
  fields.storeType = {value:'retail'};
  const buttons = [{disabled:false},{disabled:false}], submit = {disabled:false};
  const calls=[];
  const context=vm.createContext({AbortController, setTimeout, clearTimeout,window:{},
    document:{documentElement:{lang:'en'},getElementById:id=>fields[id], querySelector:()=>submit,
      querySelectorAll:selector=>selector.startsWith('button')?buttons:Object.values(fields).filter(f=>f.addEventListener)},
    location:{replace:path=>calls.push({redirect:path})},
    fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({email_otp_token:'test-token'})}}
  });
  vm.runInContext(source,context);
  return {fields,buttons,submit,calls,context,run:code=>vm.runInContext(code,context)};
}
(async()=>{
  const s=setup();
  assert.equal(s.context.required('sellerName','Owner name is required.'),false);
  assert.equal(s.fields.sellerName.focused,true);
  assert.equal(s.fields.sellerName.scrolled,true);
  assert.equal(s.fields.sellerName.attrs['aria-invalid'],'true');
  assert.equal(s.fields.sellerName.validationMessage,'Owner name is required.');
  assert.equal(s.fields.sellerName.reported,true);
  delete s.fields.storeType;
  assert.equal(s.context.required('storeType','Choose your store type.'),false);
  assert.match(s.fields.applyStatus.textContent,/still loading/);
  assert.equal(s.fields.otpStatus.attrs['aria-live'],'polite');
  s.fields.sellerEmail.value='seller@example.com';s.fields.otp.value='123456';
  await s.context.verifySellerOtp();
  assert.equal(s.run('sellerOtpToken'),'test-token');
  s.fields.sellerEmail.value='changed@example.com';s.fields.sellerEmail.listeners.input();
  assert.equal(s.run('sellerOtpToken'),'');
  assert.equal(s.run('verifiedSellerEmail'),'');
  let finish;
  s.context.fetch=()=>new Promise(resolve=>{finish=resolve});
  const sending=s.context.sendSellerOtp();
  assert.equal(s.buttons[0].disabled,true);
  await s.context.sendSellerOtp();
  finish({ok:true,json:async()=>({})});await sending;
  assert.equal(s.buttons[0].disabled,false);
  let abort;
  s.context.setTimeout=fn=>{abort=fn;return 1};s.context.clearTimeout=()=>{};
  s.context.fetch=(url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error(),{name:'AbortError'}))));
  const timeout=s.context.sendSellerOtp();abort();await timeout;
  assert.equal(s.buttons[1].disabled,false);
  assert.match(s.fields.otpStatus.textContent,/timed out/);
  const compatibilityFiles=['buyer/become-seller.js','seller/shop-category.js'];
  for(const name of compatibilityFiles){
    const code=fs.readFileSync('landing-site-v2/'+name,'utf8');new vm.Script(code);
    assert.doesNotMatch(code,/AbortSignal\.timeout/);
    assert.match(code,/finally \{ clearTimeout\(timer\); \}/);
  }
  console.log('PASS: visible field validation, missing store-type recovery, email-bound verification, duplicate OTP prevention, request timeout recovery and older-phone timeout support');
})().catch(error=>{console.error(error);process.exitCode=1});
