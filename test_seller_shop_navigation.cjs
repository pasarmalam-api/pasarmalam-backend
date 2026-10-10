const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element {
  constructor(){this.children=[];this.attributes={};this.value='';}
  append(...items){this.children.push(...items)}
  prepend(item){this.children.unshift(item)}
  before(item){this.previous=item}
  replaceChildren(...items){this.children=items}
  setAttribute(key,value){this.attributes[key]=value}
  addEventListener(){} contains(){return false}
  querySelectorAll(){return this.children.flatMap(item=>item.children.length?item.children:[item])}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  const nodes={},main=new Element(),nav=new Element(),body=new Element();
  let poll,confirm=true,fail=false,redirect,unread=3;const writes={},requests=[];
  const context={console,Number,String,Math,Option:function(text,value){this.textContent=text;this.value=value},
    document:{body,hidden:false,activeElement:null,createElement:()=>new Element(),
      querySelector:selector=>selector==='main'?main:{querySelector:()=>nav},getElementById:id=>nodes[id]??=new Element()},
    localStorage:{setItem:(key,value)=>writes[key]=value},location:{replace:url=>redirect=url},
    confirm:()=>confirm,setInterval:fn=>poll=fn,addEventListener(){},
    fetch:async(url,options)=>{
      if(url.endsWith('/switch')){requests.push(JSON.parse(options.body));return {ok:!fail,json:async()=>fail?{error:'Switch failed'}:{token:'shop-token',user:{id:3}}};}
      assert.equal(options.cache,'no-store');return {ok:true,json:async()=>({active_shop_id:2,limit:5,categories:['Food'],shops:[
        {id:2,shop_name:'First Shop',status:'active',seller_status:'approved',unread_notifications:0},
        {id:3,shop_name:'Other <Shop>',status:'active',seller_status:'approved',unread_notifications:unread},
        {id:4,shop_name:'Pending',status:'active',seller_status:'pending',unread_notifications:0}]})};
    }};
  context.window=context;
  vm.runInNewContext(fs.readFileSync('landing-site-v2/seller/seller-shops.js','utf8'),context);await tick();
  const list=nodes.activeShop;
  const choose=async()=>{list.value='3';await list.onchange();};
  assert.equal(nav.children.length,0);
  assert.equal(main.children[0].previous.textContent,'First Shop');
  assert.equal(list.value,'2');
  assert.equal(list.children[1].textContent,'Other <Shop> (3 unread)');assert(list.children[2].disabled);
  confirm=false;await choose();assert.equal(requests.length,0);assert.equal(list.value,'2');
  unread=0;poll();await tick();assert.equal(list.children[1].textContent,'Other <Shop>');
  confirm=true;fail=true;await choose();await tick();assert.equal(nodes.shopFeedback.textContent,'Switch failed');assert(!nodes.activeShop.disabled);
  fail=false;await choose();await tick();assert.equal(requests.at(-1).shop_id,3);assert.equal(writes.pm_token,'shop-token');assert.equal(redirect,'index.html');
  console.log('PASS dropdown only, active shop name, unread refresh, disabled shop, cancel, failure recovery and successful switch');
})().catch(error=>{console.error(error);process.exitCode=1});
