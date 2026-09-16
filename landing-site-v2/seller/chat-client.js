(() => {
  const seller=location.pathname.endsWith('messages.html');
  const role=seller?'seller':'buyer', params=new URLSearchParams(location.search);
  const user=(()=>{try{return JSON.parse(localStorage.getItem('pm_user')||'{}')}catch{return {}}})();
  window.productId=Number(params.get('product_id'))||0;
  let selected=productId?{product_id:productId,buyer_id:seller?Number(params.get('buyer_id')):user.id}:null;
  let rows=[],loading=false,sending=false;
  const drafts=new Map();
  const panel=document.querySelector('main .panel');
  panel.innerHTML='<h2>Conversations</h2><div id="conversations"></div><h3 id="conversationTitle">Select a conversation</h3><div id="chatMessages" aria-live="polite"></div><form id="chatForm"><label for="chatText">Message</label><textarea id="chatText" maxlength="4000" rows="3"></textarea><button class="primary" id="chatSend" type="submit">Send</button><button class="soft" id="chatRefresh" type="button">Refresh</button></form><p id="chatStatus" role="status"></p>';
  const style=document.createElement('style');style.textContent='#conversations{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}#conversations button{white-space:normal;text-align:left;max-width:100%;overflow-wrap:anywhere}#conversations button[aria-pressed=true]{border:2px solid #087f72}#chatMessages{max-height:55vh;overflow:auto}#chatMessages .msg{white-space:pre-wrap;overflow-wrap:anywhere}#chatText{width:100%;font:inherit;border:1px solid #ddd;border-radius:6px;padding:10px;resize:vertical}#chatForm button{margin:8px 8px 0 0}';document.head.append(style);
  const $=id=>document.getElementById(id), key=t=>t.product_id+':'+t.buyer_id;
  const status=text=>{
    $('chatStatus').textContent=text;
    if(!localStorage.getItem('pm_token')){
      const link=document.createElement('a');link.textContent=' Sign In';link.href='login.html?next='+encodeURIComponent(location.pathname.split('/').pop()+location.search);$('chatStatus').append(link);
    }
  };
  async function api(path,data){
    const token=localStorage.getItem('pm_token');if(!token)throw new Error('Please sign in to use messages.');
    const res=await fetch('https://pasarmalam-backend.onrender.com'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(15000)});
    const body=await res.json();if(!res.ok)throw new Error(body.error||'Unable to load messages.');return body;
  }
  function render(){
    const threads=new Map();rows.forEach(m=>threads.set(key(m),m));
    $('conversations').replaceChildren();
    for(const thread of [...threads.values()].reverse()){
      const button=document.createElement('button');button.type='button';button.className='soft';
      const unread=rows.filter(m=>key(m)===key(thread)&&m.sender_role!==role&&!m.read_at).length;
      button.textContent=(seller?thread.buyer_name:thread.seller_name)+' / '+thread.product_name+(unread?' ('+unread+' unread)':'');
      button.setAttribute('aria-pressed',String(!!selected&&key(thread)===key(selected)));
      button.onclick=()=>{if(selected)drafts.set(key(selected),$('chatText').value);selected={product_id:thread.product_id,buyer_id:thread.buyer_id};window.productId=thread.product_id;$('chatText').value=drafts.get(key(selected))||'';render();markRead().catch(e=>status(e.message));};
      $('conversations').append(button);
    }
    const messages=selected?rows.filter(m=>key(m)===key(selected)):[];
    $('conversationTitle').textContent=selected?(messages[0]?.product_name||'Product #'+selected.product_id):'Select a conversation';
    $('chatMessages').replaceChildren();
    for(const message of messages){
      const div=document.createElement('div');div.className='msg'+(message.sender_role===role?' me':'');
      const name=document.createElement('b');name.textContent=message.sender_role===role?'You':(seller?message.buyer_name:message.seller_name);
      const text=document.createElement('p');text.textContent=message.body;div.append(name,text);$('chatMessages').append(div);
    }
    $('chatSend').disabled=!selected||sending||!localStorage.getItem('pm_token');
    if(!rows.length&&!selected)status('No conversations yet. Buyers can start from a product page.');
  }
  async function markRead(){
    if(!selected||document.hidden)return;
    const unread=rows.filter(m=>key(m)===key(selected)&&m.sender_role!==role&&!m.read_at);
    if(!unread.length)return;
    const thread={...selected};await api('/api/messages/read',{...thread,through_id:Math.max(...unread.map(m=>m.id))});
    unread.forEach(m=>m.read_at=Date.now());render();window.dispatchEvent(new Event('seller-data-changed'));window.dispatchEvent(new Event('pm-chat-read'));
  }
  async function load(){
    if(loading)return;loading=true;
    try {
      if(seller&&params.get('order_id')&&!selected){
        const order=((await api('/api/orders')).orders||[]).find(o=>String(o.id)===params.get('order_id'));
        if(!order)throw new Error('Order conversation is unavailable.');
        selected={product_id:order.product_id,buyer_id:order.buyer_id};
      }
      rows=(await api('/api/messages')).messages||[];status('');render();await markRead();}
    catch(e){status(e.message);}finally{loading=false;}
  }
  $('chatForm').onsubmit=async event=>{
    event.preventDefault();if(sending||!selected)return;
    const body=$('chatText').value.trim();if(!body){status('Enter your message.');return;}
    const thread={...selected};sending=true;render();status('Sending...');
    try {await api('/api/messages',{...thread,body});drafts.delete(key(thread));if(key(selected)===key(thread))$('chatText').value='';await load();status('Message sent.');}
    catch(e){status(e.message);}finally{sending=false;render();}
  };
  $('chatRefresh').onclick=load;
  render();load();
  const timer=setInterval(()=>{if(!document.hidden)load();},10000);
  window.addEventListener('pagehide',()=>clearInterval(timer));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
})();
