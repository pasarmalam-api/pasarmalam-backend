const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const helper=fs.readFileSync('landing-site-v2/buyer/page-context.js','utf8');
function fixture(id,authenticated=true){
  const elements={};
  for(const key of ['detail','receipt','confirmation','trackBtn','returnBtn'])elements[key]={innerHTML:'',replaceChildren(...children){this.children=children;}};
  const context={window:{},localStorage:{getItem:key=>key==='pasarmalam-lang'?'en':authenticated?'test-token':null},
    document:{getElementById:key=>elements[key],querySelectorAll:()=>[elements.trackBtn,elements.returnBtn],createElement:()=>({setAttribute(){}})},
    location:{pathname:'/buyer/receipt.html',search:id?'?id='+id:''},URLSearchParams,setInterval:()=>0};
  vm.createContext(context);vm.runInContext(helper,context);context.PMPageContext=context.window.PMPageContext;
  return {context,elements};
}
(async()=>{
  const missing=fixture(null);
  assert.equal(missing.context.PMPageContext.require(null,'detail'),false);
  assert.equal(missing.elements.detail.children[1].href,'orders.html');
  assert.equal(missing.elements.returnBtn.disabled,true);
  const guest=fixture('9',false);
  assert.equal(guest.context.PMPageContext.require('9','receipt'),false);
  assert.match(guest.elements.receipt.children[1].href,/next=receipt.html%3Fid%3D9/);
  assert.equal(guest.context.PMPageContext.require('9','detail','product'),true);
  for(const page of ['order-detail','order-confirmation','receipt']){
    const html=fs.readFileSync('landing-site-v2/buyer/'+page+'.html','utf8');
    assert.match(html,/page-context.js/);assert.doesNotMatch(html,/\|\|(?:rows|\(data.orders\|\|\[\]\))\[0\]/);
    const inline=Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)).map(m=>m[1]).find(s=>s.includes('async function load()'));
    const f=fixture('999');let calls=0;
    Object.assign(f.context,f.elements,{fetch:async()=>{calls++;return {json:async()=>({orders:[{id:1,total:100}]})};}});
    vm.runInContext(inline,f.context);await new Promise(resolve=>setImmediate(resolve));
    assert.equal(calls,1,page);
    assert.match(f.elements[{'order-detail':'detail','order-confirmation':'confirmation',receipt:'receipt'}[page]].innerHTML,/No (order|receipt) found/,page);
    assert.equal(f.elements.trackBtn.onclick,undefined,page);
  }
  const product=fs.readFileSync('landing-site-v2/buyer/product.html','utf8');
  assert.doesNotMatch(product,/get\("id"\)\|\|1/);
  assert.match(product,/PMPageContext.require\(id,'detail','product'\)/);
  console.log('PASS: missing context, guest login return path, public product access and no unrelated-order fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
