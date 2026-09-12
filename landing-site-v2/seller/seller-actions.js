(function(){
  const page=location.pathname.split('/').pop();
  const byId=id=>document.getElementById(id);
  function error(message){let box=byId('sellerActionError');if(!box){box=document.createElement('p');box.id='sellerActionError';box.setAttribute('role','alert');document.querySelector('main')?.prepend(box)}box.textContent=message}
  window.addEventListener('unhandledrejection',event=>error(event.reason?.message||'Request failed. Please try again.'));
  if(page==='messages.html'){
    let rows=[];
    const select=document.createElement('select');select.id='conversation';select.setAttribute('aria-label','Buyer conversation');byId('reply').before(select);
    const messageStatus=document.createElement('p');messageStatus.setAttribute('role','status');byId('reply').after(messageStatus);
    function render(){const selected=rows[Number(select.value)];byId('msgs').innerHTML=selected?rows.filter(r=>r.product_id===selected.product_id&&r.buyer_name===selected.buyer_name).map(m=>`<div class="msg"><b>${esc(m.sender_role==='buyer'?m.buyer_name:m.seller_name)}</b><p>${esc(m.body)}</p></div>`).join(''):'No conversations yet.'}
    select.onchange=render;
    window.load=async function(){try{rows=(await api('/api/messages')).messages||[];const previous=select.selectedOptions[0]?.textContent;select.replaceChildren();const seen=new Set();rows.forEach((r,i)=>{const key=JSON.stringify([r.product_id,r.buyer_name]);if(seen.has(key))return;seen.add(key);select.add(new Option(`${r.buyer_name} / #${r.product_id}`,String(i)))});if(previous){for(const option of select.options)if(option.textContent===previous)option.selected=true}render()}catch(e){messageStatus.textContent=e.message}};
    window.send=async function(){const selected=rows[Number(select.value)];try{if(!selected)throw new Error('Select a buyer conversation.');if(!byId('reply').value.trim())throw new Error('Reply cannot be empty.');await api('/api/messages',{method:'POST',body:JSON.stringify({product_id:selected.product_id,buyer_name:selected.buyer_name,sender_role:'seller',body:byId('reply').value.trim()})});byId('reply').value='';messageStatus.textContent='Reply sent.';await load()}catch(e){messageStatus.textContent=e.message}};
    load();
  }
  if(page==='edit-product.html'&&!/^[1-9]\d*$/.test(new URLSearchParams(location.search).get('id')||'')){
    document.querySelectorAll('button[onclick="save()"],button[onclick="removeProduct()"]').forEach(b=>b.disabled=true);
    byId('out').textContent='Open a product from the product list first.';
  }
  if(['campaigns.html','logistics.html'].includes(page))document.querySelector('main > .grid')?.remove();
  if(page==='add-product.html'){
    let uploading=false;const upload=window.handleFiles,publish=window.save;
    window.handleFiles=async function(files){if(uploading)return;uploading=true;try{await upload(files.slice(0,Math.max(0,6-images.length)))}catch(e){error(e.message||'Image upload failed')}finally{uploading=false}};
    window.save=async function(){if(uploading){error('Wait for image uploads to finish.');return}return publish()};
  }
  for(const name of ['save','create','send','createTicket','saveProfile','savePayoutProfile','submitVerification','askAi','changePassword','update','quick','respond','replyReview','removeProduct','markRead','awb']){
    const original=window[name];if(typeof original!=='function')continue;
    let pending=false;
    window[name]=async function(...args){
      if(pending)return;pending=true;
      const button=document.activeElement?.tagName==='BUTTON'?document.activeElement:null;
      const disabled=button?.disabled;if(button)button.disabled=true;
      try{return await original.apply(this,args)}catch(e){error(e.message||'Request failed')}finally{pending=false;if(button)button.disabled=disabled}
    };
  }
})();
