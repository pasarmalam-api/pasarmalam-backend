const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('landing-site-v2/buyer/become-seller.js','utf8');
const {copy,text}=require('./landing-site-v2/seller-entry-language.js');
for(const [key,values] of Object.entries(copy)){
  assert.equal(values.length,2,key);
  for(const lang of ['ms','zh']){
    const translated=text(key,lang);
    assert.ok(translated.length,key);
    assert.doesNotMatch(translated,/\?{2,}/,key);
    assert.equal(text(translated,lang),translated,key);
  }
}
for(const lang of ['en','ms','zh']) assert.notEqual(text('Register as a Seller',lang),text('Continue with Buyer Account',lang));
async function scenario(token,data){
  const els={};
  for(const id of ['sellerProfile','status','retry','signIn','registerSeller','sellerLogin','heading','support','submit'])els[id]={hidden:true,textContent:'',addEventListener(){},elements:{shop_category:{replaceChildren(){}}}};
  const storage=new Map(token?[['pm_token','test-token'],['pm_user',JSON.stringify({role:'buyer'})]]:[]),requests=[];
  let redirect;
  vm.runInNewContext(source,{
    document:{getElementById:id=>els[id],querySelectorAll:()=>[els.signIn,els.registerSeller,els.sellerLogin]},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    location:{pathname:'/buyer/become-seller.html',replace:p=>{redirect=p;}},
    AbortSignal:{timeout(){}},Option:function(label,value){this.label=label;this.value=value;},
    fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>url.endsWith('switch-role')?{token:'seller-token',user:{role:'seller'}}:data};}
  });
  await new Promise(resolve=>setImmediate(resolve));
  return {els,requests,storage,redirect};
}
(async()=>{
  const guest=await scenario(false);
  assert.equal(guest.requests.length,0);
  for(const id of ['signIn','registerSeller','sellerLogin'])assert.equal(guest.els[id].hidden,false,id);
  assert.equal(guest.els.signIn.href,'login.html?next=become-seller.html');
  const buyer=await scenario(true,{seller_status:'none',categories:['Phones'],profile:{}});
  assert.equal(buyer.els.sellerProfile.hidden,false);
  assert.equal(buyer.els.registerSeller.hidden,true);
  assert.equal(buyer.requests.length,1);
  const pending=await scenario(true,{seller_status:'pending'});
  assert.equal(pending.els.sellerProfile.hidden,true);
  assert.match(pending.els.status.textContent,/pending approval/);
  const approved=await scenario(true,{seller_status:'approved'});
  assert.equal(approved.redirect,'../seller/index.html');
  assert.equal(approved.storage.get('pm_token'),'seller-token');
  const html=fs.readFileSync('landing-site-v2/buyer/become-seller.html','utf8');
  assert.match(html,/id="registerSeller"[^>]*href="\.\.\/seller\/register.html"/);
  assert.match(html,/seller-entry-language.js/);
  console.log('PASS: guest registration and buyer continuation, existing-buyer onboarding, pending/approved states, complete MS/EN/ZH dictionary.');
})().catch(error=>{console.error(error);process.exitCode=1;});
