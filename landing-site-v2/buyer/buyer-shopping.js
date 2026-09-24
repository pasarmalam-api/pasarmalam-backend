(function(){
 const page=location.pathname.split('/').pop();
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const empty=text=>`<div class="empty-state">${esc(text)}<br><a href="index.html">Continue shopping</a></div>`;
 const apiBase='https://pasarmalam-backend.onrender.com';
 if(page==='cart.html'){
  let selected=null,busy=false;
  document.querySelectorAll('.panel>.line').forEach(el=>el.remove());
  const note=document.createElement('p');note.className='muted';note.textContent='Select one item to check out. Other items stay in your cart.';document.querySelector('#cartList').before(note);
  document.querySelector('#checkoutBtn').disabled=true;
  draw=function(){
   if(!cart.some(i=>String(i.id)===String(selected)&&Number(i.stock)>0))selected=cart.find(i=>Number(i.stock)>0)?.id??null;
   cartList.innerHTML=cart.length?cart.map(i=>{
    const available=Number(i.stock)>0,image=(i.images||[])[0]||i.image_url;
    return `<div class="line"><div class="checkout-choice"><input type="radio" name="checkoutItem" aria-label="Select ${esc(i.name)}" value="${esc(i.id)}" ${String(selected)===String(i.id)?'checked':''} ${available?'':'disabled'}><div class="cart-product">${image?`<img src="${esc(image)}" alt="${esc(i.name)}">`:'<span></span>'}<div><a href="product.html?id=${encodeURIComponent(i.product_id)}">${esc(i.name)}</a><p class="muted">${esc(i.shop)}${i.variant?' | '+esc(i.variant):''}</p><p class="price">${money(i.price)} <span class="muted">&times; ${Number(i.quantity)}</span></p><span class="muted">${available?'Stock: '+Number(i.stock):'Out of stock'}${i.selling_mode==='bulk'?' | Bulk: minimum '+Number(i.minimum_order)+' units':''}</span></div></div></div><div><div class="qty"><button class="step" aria-label="Decrease quantity" onclick="changeQty(${Number(i.id)},${Number(i.quantity)-1})" ${!available||i.quantity<=Number(i.minimum_order||1)?'disabled':''}>-</button><b>${Number(i.quantity)}</b><button class="step" aria-label="Increase quantity" onclick="changeQty(${Number(i.id)},${Number(i.quantity)+1})" ${!available||i.quantity>=i.stock?'disabled':''}>+</button></div><button class="danger" onclick="removeItem(${Number(i.id)})">Remove</button></div></div>`;
   }).join(''):empty('Your cart is empty.');
   const item=cart.find(i=>String(i.id)===String(selected));total.textContent=item?'Selected item: '+money(Number(item.price)*Number(item.quantity)):'';
   checkoutBtn.disabled=!item||busy||Number(item.quantity)<Number(item.minimum_order||1)||Number(item.stock)<Number(item.quantity);checkoutBtn.textContent='Checkout selected item';
  };
  cartList.addEventListener('change',e=>{if(e.target.name==='checkoutItem'){selected=e.target.value;draw()}});
  goCheckout=function(){const item=cart.find(i=>String(i.id)===String(selected));if(!item||!token()||Number(item.quantity)<Number(item.minimum_order||1)||Number(item.stock)<Number(item.quantity))return;location.href='checkout.html?'+new URLSearchParams({product_id:item.product_id,quantity:item.quantity,variant:item.variant||''})};
  for(const name of ['changeQty','removeItem']){const original=window[name];window[name]=async(...args)=>{if(busy)return;busy=true;cartList.querySelectorAll('button,input').forEach(el=>el.disabled=true);checkoutBtn.disabled=true;try{await original(...args)}finally{busy=false;draw()}}}
 }
 if(page==='orders.html'){
  const holder=document.getElementById('orders'),tabs=document.createElement('div');tabs.className='status-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Order status');holder.before(tabs);
  let rows=[],active='all';
  const states=[['all','All'],['pay','To Pay'],['ship','To Ship'],['receive','To Receive'],['complete','Completed'],['closed','Cancelled / Refunded']];
  function bucket(o){if(['cancelled','refunded'].includes(o.order_status)||['cancelled','refunded'].includes(o.escrow_status))return 'closed';if(['delivered','completed'].includes(o.order_status))return 'complete';if(o.order_status==='shipped')return 'receive';if(o.payment_status!=='paid'&&o.payment_method!=='Pay on Arrival'&&o.payment_method!=='Cash Pickup')return 'pay';return 'ship'}
  function render(){
   tabs.innerHTML=states.map(([key,label])=>`<button type="button" data-state="${key}" aria-pressed="${active===key}">${label} (${key==='all'?rows.length:rows.filter(o=>bucket(o)===key).length})</button>`).join('');
   const filtered=rows.filter(o=>active==='all'||bucket(o)===active);
   holder.innerHTML=filtered.length?filtered.map(o=>`<article class="order"><b>PM-${esc(o.id)}</b> <span class="tag">${esc(orderLabel(o.order_status))}</span><p>${esc(o.product_name||'Order')} ${o.shop?' | '+esc(o.shop):''}</p><p class="price">RM${Number(o.total||0).toFixed(2)}</p><p class="muted">${esc(paymentLabel(o.payment_status))} | ${esc(o.logistics_method||'Delivery')}</p><div class="actions"><a class="soft" href="order-detail.html?id=${encodeURIComponent(o.id)}">View details</a><a class="soft" href="receipt.html?id=${encodeURIComponent(o.id)}">Receipt</a>${['delivered','completed'].includes(o.order_status)?`<a class="soft" href="returns.html?order_id=${encodeURIComponent(o.id)}">Return / Refund</a>`:''}</div></article>`).join(''):empty('No orders in this section.');
  }
  tabs.onclick=e=>{const button=e.target.closest('[data-state]');if(button){active=button.dataset.state;render()}};
  if(!authToken()){signedOut();return}
  fetch(apiBase+'/api/orders',{headers:{Authorization:'Bearer '+authToken()}}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to load orders');return data}).then(data=>{rows=data.orders||[];render()}).catch(e=>{holder.textContent=e.message});
 }
 if(page==='vouchers.html'){
  const panel=document.querySelector('main .panel');panel.innerHTML='<h2>Vouchers</h2><p role="status">Loading...</p>';
  fetch(apiBase+'/api/campaigns').then(async r=>{if(!r.ok)throw Error('Unable to load vouchers. Please refresh to try again.');return r.json()}).then(data=>{
   const rows=(data.campaigns||[]).filter(c=>c.status==='active'&&['voucher','flash_sale','bundle_deal'].includes(c.type));
   panel.innerHTML='<h2>Vouchers</h2><p class="muted">Use the code at checkout for the issuing shop. Eligibility is checked before payment.</p>'+ (rows.length?rows.map(c=>`<article class="voucher"><div><b>${esc(c.name)}</b><p>${esc(c.value)}</p></div><a class="soft" href="seller-store.html?seller_id=${encodeURIComponent(c.seller_id)}">Shop</a></article>`).join(''):empty('No active vouchers.'));
  }).catch(e=>panel.querySelector('[role=status]').textContent=e.message);
 }
})();
