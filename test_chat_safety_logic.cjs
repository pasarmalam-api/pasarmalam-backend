const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
class Element {
 constructor(){this.children=[];this.style={};this.value='';this.textContent='';this.events={};}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(){} addEventListener(type,fn){this.events[type]=fn}
 showModal(){this.open=true} close(){this.open=false} remove(){} focus(){} scrollIntoView(){}
}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 for(const role of ['buyer','seller']){
  const nodes={};const body=new Element();let poll,fail=false;const requests=[];
  let messages=[{id:1,product_id:42,buyer_id:1,sender_role:role==='buyer'?'seller':'buyer',body:'Test reply',product_name:'Cable',seller_name:'Shop',buyer_name:'Buyer',read_at:1,blocked_by_me:false}];
  const context={URLSearchParams,AbortSignal,Event,Map,Date,console,
   location:{pathname:role==='buyer'?'/buyer/chat.html':'/seller/messages.html',search:'?product_id=42&buyer_id=1'},
   localStorage:{getItem:key=>key==='pm_user'?JSON.stringify({id:role==='buyer'?1:2,role}):'test-token'},
   document:{hidden:false,body,head:new Element(),querySelector:()=>new Element(),getElementById:id=>nodes[id]??=(new Element()),createElement:()=>new Element(),addEventListener(){}},
   setInterval:fn=>{poll=fn;return 1},clearInterval(){},addEventListener(){},dispatchEvent(){},
   fetch:async(url,options)=>{
    assert.equal(options.cache,'no-store');
    if(url.endsWith('/block')){const data=JSON.parse(options.body);requests.push(data);if(fail)return {ok:false,json:async()=>({error:'Test failure'})};messages.forEach(m=>m.blocked_by_me=data.blocked);return {ok:true,json:async()=>({ok:true})};}
    return {ok:true,json:async()=>({messages:JSON.parse(JSON.stringify(messages))})};
   }
  };context.window=context;vm.runInNewContext(fs.readFileSync('landing-site-v2/'+role+'/chat-client.js','utf8'),context);await tick();
  const button=name=>nodes.chatMessages.children.flatMap(n=>n.children).find(n=>n.textContent===name);
  let action=button('Block user').onclick();await tick();
  let dialog=body.children.at(-1);assert(dialog.open);dialog.children[3].onclick();await action;assert.equal(requests.length,0);
  action=button('Block user').onclick();await tick();dialog=body.children.at(-1);dialog.children[2].onclick();await action;
  assert(button('Unblock user'));assert.equal(nodes.chatStatus.textContent,'User blocked.');
  poll();await tick();assert(button('Unblock user'));assert.equal(nodes.chatStatus.textContent,'User blocked.');
  fail=true;action=button('Unblock user').onclick();await tick();body.children.at(-1).children[2].onclick();await action;
  assert(button('Unblock user'));assert.equal(nodes.chatStatus.textContent,'Test failure');
  fail=false;action=button('Unblock user').onclick();await tick();body.children.at(-1).children[2].onclick();await action;
  assert(button('Block user'));assert.equal(nodes.chatStatus.textContent,'User unblocked.');
 }
 console.log('PASS buyer/seller in-app confirm, cancel, block, poll persistence, failed unblock and successful unblock. Mock requests only.');
})().catch(e=>{console.error(e);process.exitCode=1});
