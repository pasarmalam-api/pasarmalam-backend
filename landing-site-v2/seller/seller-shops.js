(function(){
  const base='https://pasarmalam-backend.onrender.com';
  const main=document.querySelector('main');if(!main)return;
  const bar=document.createElement('section');bar.className='shop-toolbar';bar.setAttribute('aria-label','Shop management');
  bar.innerHTML='<label for="activeShop">My Shops</label><select id="activeShop" disabled><option>Loading...</option></select><small id="shopCount"></small><button type="button" class="primary" id="addShop" disabled>Add Shop</button><button type="button" class="soft" id="reloadShops">Refresh</button><p class="shop-feedback" id="shopFeedback" role="status"></p>';
  main.prepend(bar);
  const dialog=document.createElement('dialog');dialog.className='shop-dialog';dialog.setAttribute('aria-labelledby','newShopTitle');
  dialog.innerHTML='<form id="newShopForm"><h2 id="newShopTitle">Add Shop</h2><label for="newShopName">Shop name</label><input id="newShopName" required minlength="2" maxlength="100" autocomplete="off"><label for="newShopCategory">Category</label><select id="newShopCategory" required></select><p id="newShopFeedback" class="shop-feedback" role="status"></p><footer><button type="button" class="soft" id="cancelShop">Cancel</button><button type="submit" class="primary" id="saveShop">Create Shop</button></footer></form>';
  document.body.append(dialog);
  const el=id=>document.getElementById(id);let activeId=null,busy=false;
  async function api(path,body){
    const response=await fetch(base+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to load shops');return data;
  }
  async function switchShop(id){
    const data=await api('/api/seller/shops/switch',{shop_id:Number(id)});
    if(!data.token||!data.user)throw new Error('Shop switch failed. Please retry.');
    localStorage.setItem('pm_user',JSON.stringify(data.user));localStorage.setItem('pm_token',data.token);
    location.replace('index.html');
  }
  async function load(){
    el('activeShop').disabled=true;el('addShop').disabled=true;el('shopFeedback').textContent='';
    try{
      const data=await api('/api/seller/shops');activeId=data.active_shop_id;
      el('activeShop').replaceChildren(...data.shops.map(shop=>{
        const option=new Option(shop.shop_name||'My Shop',shop.id);
        option.disabled=shop.status!=='active'||shop.seller_status!=='approved';return option;
      }));el('activeShop').value=String(activeId);el('activeShop').disabled=false;
      el('shopCount').textContent=data.shops.length+' / '+data.limit;
      el('addShop').disabled=data.shops.length>=data.limit;
      el('addShop').title=data.shops.length>=data.limit?'Five-shop limit reached':'Add another shop';
      el('newShopCategory').replaceChildren(new Option('Choose category',''),...data.categories.map(c=>new Option(c,c)));
    }catch(error){el('shopFeedback').textContent=error.message;}
  }
  el('reloadShops').onclick=()=>{if(!busy)load();};
  el('addShop').onclick=()=>{el('newShopForm').reset();el('newShopFeedback').textContent='';dialog.showModal();el('newShopName').focus();};
  el('cancelShop').onclick=()=>dialog.close();
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  el('activeShop').onchange=async()=>{
    if(busy)return;
    if(!confirm('Switch shops and return to the dashboard? Unsaved changes will be lost.')){el('activeShop').value=String(activeId);return;}
    busy=true;el('activeShop').disabled=true;el('addShop').disabled=true;
    try{await switchShop(el('activeShop').value);}catch(error){await load();el('shopFeedback').textContent=error.message;busy=false;}
  };
  el('newShopForm').onsubmit=async event=>{
    event.preventDefault();if(busy||!el('newShopForm').reportValidity())return;
    busy=true;el('saveShop').disabled=true;el('cancelShop').disabled=true;
    el('newShopFeedback').textContent='Creating shop...';
    let created=false;
    try{
      const result=await api('/api/seller/shops',{shop_name:el('newShopName').value.trim(),shop_category:el('newShopCategory').value});
      created=true;await switchShop(result.created_shop_id);
    }catch(error){
      if(created){dialog.close();await load();el('shopFeedback').textContent='Shop created. Select it from My Shops to continue.';}
      else el('newShopFeedback').textContent=error.message;
      busy=false;el('saveShop').disabled=false;el('cancelShop').disabled=false;
    }
  };
  load();
})();
