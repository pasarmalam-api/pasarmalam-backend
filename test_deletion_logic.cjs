const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('landing-site-v2/account-deletion.js','utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture({signedIn=true,fail=false,existing=null,timeout=false}={}){
  const ids=['deletion-form','deletion-credentials','deletion-status','submit-deletion','confirm-deletion','deletion-email','deletion-password'];
  const elements=Object.fromEntries(ids.map(id=>[id,{value:'',checked:true,hidden:false,disabled:false,textContent:'',reportValidity:()=>true,focus(){this.focused=true},scrollIntoView(){this.scrolled=true},addEventListener(type,fn){this[type]=fn}}]));
  elements['deletion-email'].value='disposable@example.test';
  elements['deletion-password'].value='test-only-password';
  elements['deletion-credentials'].querySelectorAll=()=>[elements['deletion-email'],elements['deletion-password']];
  const calls=[];let timer;
  const fetch=async(url,options)=>{
    if(options.method==='GET')return {ok:signedIn,json:async()=>signedIn?{request:existing}:{error:'Login required'}};
    calls.push(JSON.parse(options.body));
    if(timeout)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted'))));
    return {ok:!fail,json:async()=>fail?{error:'Service temporarily unavailable'}:{request:{id:7,status:'requested',due_at:1793404800}}};
  };
  vm.runInNewContext(source,{document:{getElementById:id=>elements[id]},localStorage:{getItem:()=>signedIn?'test-token':null},fetch,AbortController,Date,setTimeout:fn=>{timer=fn;return 1},clearTimeout:()=>{}});
  await tick();
  return {elements,calls,expire:()=>timer(),submit:()=>elements['deletion-form'].submit({preventDefault(){}})};
}
(async()=>{
  const signed=await fixture();
  assert(signed.elements['deletion-credentials'].disabled);
  await signed.submit();
  assert.equal(signed.calls.length,1);assert.equal(signed.calls[0].confirm,true);
  assert(!('password' in signed.calls[0]));
  assert(signed.elements['deletion-form'].hidden);
  assert(signed.elements['deletion-status'].textContent.includes('Request #7 received'));
  assert(signed.elements['deletion-status'].focused);
  const guest=await fixture({signedIn:false});await guest.submit();
  assert.equal(guest.calls[0].email,'disposable@example.test');
  assert.equal(guest.elements['deletion-password'].value,'');
  const failure=await fixture({fail:true});await failure.submit();
  assert.equal(failure.elements['deletion-status'].textContent,'Service temporarily unavailable');
  assert(!failure.elements['deletion-credentials'].disabled);
  assert(!failure.elements['submit-deletion'].disabled);
  const slow=await fixture({timeout:true});const request=slow.submit();await slow.submit();
  assert.equal(slow.calls.length,1);slow.expire();await request;
  assert(slow.elements['deletion-status'].textContent.includes('timed out'));
  const prior=await fixture({existing:{id:8,status:'reviewing',due_at:1793404800}});
  assert(prior.elements['deletion-form'].hidden);
  assert(prior.elements['deletion-status'].textContent.includes('Request #8 received'));
  console.log('PASS signed-in, password, failure/retry, timeout, duplicate-submit guard and existing receipt flows; no live requests.');
})().catch(error=>{console.error(error);process.exitCode=1});
