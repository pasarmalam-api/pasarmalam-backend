const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'landing-site-v2/buyer');
function harness(next='cart.html'){
  const values=new Map(),elements=new Map();
  const context={URLSearchParams,JSON,console,
    location:{search:'?next='+encodeURIComponent(next),replace(url){this.redirect=url}},
    localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},
    document:{readyState:'loading',addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,{value:'',checked:false,addEventListener(){}});return elements.get(id);}},
    fetch:async()=>({ok:true,json:async()=>({token:'test-token',user:{role:'buyer'}})})};
  context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'buyer-ui.js'),'utf8'),context);
  return {context,values,field:id=>context.document.getElementById(id)};
}
function inline(context,file){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(match[1],context);
}
(async()=>{
  for(const next of ['cart.html','product.html?id=2','checkout.html'])assert.equal(harness(next).context.pmAuthDestination(),next);
  for(const next of ['https://evil.test','//evil.test','../index.html','login.html','signup.html?next=cart.html'])assert.equal(harness(next).context.pmAuthDestination(),'index.html');
  let h=harness();inline(h.context,'login.html');
  h.field('email').value='buyer@example.test';h.field('password').value='test-password';
  await h.context.login();assert.equal(h.context.location.redirect,'cart.html');assert.equal(h.values.get('pm_token'),'test-token');
  h.context.pmSignOut();assert.equal(h.context.location.redirect,'index.html');assert(!h.values.has('pm_token'));assert(!h.values.has('pm_user'));
  h=harness();inline(h.context,'login.html');h.field('email').value='buyer@example.test';h.field('password').value='bad';
  h.context.fetch=async()=>({ok:false,json:async()=>({error:'Invalid credentials'})});
  await h.context.login();assert.equal(h.field('status').textContent,'Invalid credentials');assert(!h.context.location.redirect);
  h.context.fetch=async()=>{throw Error('offline')};await h.context.login();assert.equal(h.context.login.busy,false);assert.match(h.field('status').textContent,/Connection failed/);
  h=harness('product.html?id=2');inline(h.context,'signup.html');
  for(const [id,value] of Object.entries({name:'Test Buyer',phone:'+60123456789',email:'buyer@example.test',password:'test-password'}))h.field(id).value=value;
  h.field('agree').checked=true;h.context.pmRegistrationAddress=()=>({address:'Test address'});
  await h.context.signup();assert.match(h.field('status').textContent,/verify your email/);
  vm.runInContext('emailOtpToken="verified-test-token"',h.context);
  await h.context.signup();assert.equal(h.context.location.redirect,'product.html?id=2');assert.equal(h.values.get('pm_token'),'test-token');
  // The profile coordinate variable must never receive the logout redirect.
  const profile=fs.readFileSync(path.join(root,'profile.js'),'utf8');
  const handler=profile.match(/el\('logout'\)\.onclick=\(\)=>\{([\s\S]*?)\};/);
  assert(handler);h.context.location.redirect=null;
  vm.runInContext('(function(){let location=null;'+handler[1]+'})()',h.context);
  assert.equal(h.context.location.redirect,'index.html');assert(!h.values.has('pm_token'));
  console.log('PASS: safe destinations, login, failed login, offline retry, signup OTP gate, signup destination, and logout shadow-variable regression');
})().catch(error=>{console.error(error);process.exitCode=1});
