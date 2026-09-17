(() => {
  const el=id=>document.getElementById(id);
  const base='https://pasarmalam-backend.onrender.com';
  const api=async(path,options={})=>{
    const response=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(localStorage.getItem('pm_token')||'')}});
    const data=await response.json();if(!response.ok||data.error)throw new Error(data.error||'Request failed');return data;
  };
  let rows=[],products=[],orders=[],ordersError='',selected=null,googleLoading=null,widget=null,version=0;
  const status=text=>{el('branchFeedback').textContent=text;};
  function renderPrices(){
    el('branchProducts').replaceChildren();
    for(const product of products){
      const row=document.createElement('tr');
      for(const [index,value] of [product.name,product.stock,Number(product.price).toFixed(2)].entries()){const cell=document.createElement('td');cell.textContent=value;if(index)cell.dataset.label=index===1?'Shared stock':'Base price (RM)';row.append(cell);}
      const cell=document.createElement('td'),input=document.createElement('input');
      input.type='number';input.min='0';input.max='1000000';input.step='.01';input.placeholder='Base price';
      input.setAttribute('aria-label',product.name+' branch price');input.dataset.productId=product.id;
      input.value=selected?.prices?.[product.id]??'';cell.dataset.label='Branch price (RM)';cell.append(input);row.append(cell);el('branchProducts').append(row);
    }
  }
  function renderOrders(){
    const box=el('branchOrders');box.replaceChildren();
    if(ordersError){box.textContent=ordersError;return;}
    const matching=orders.filter(order=>{try{return JSON.parse(order.delivery_data||'{}').context?.branch?.id===selected?.id&&selected;}catch{return false;}});
    for(const order of matching){const link=document.createElement('a'),p=document.createElement('p');link.href='order-detail.html?id='+encodeURIComponent(order.id);link.textContent=`PM-${order.id} - ${order.order_status} - RM${Number(order.total).toFixed(2)}`;p.append(link);box.append(p);}
    if(!matching.length)box.textContent='No orders for this branch.';
  }
  function edit(ident){
    version++;selected=rows.find(row=>row.id===ident)||null;
    el('branchSelect').value=selected?.id||'';el('branchTitle').textContent=selected?.name||'New branch';
    el('branchName').value=selected?.name||'';el('branchPhone').value=selected?.phone||'';
    el('branchPickupAddress').value=selected?.pickup?.address||'';
    el('branchLat').value=selected?.pickup?.coordinates?.lat||'';el('branchLng').value=selected?.pickup?.coordinates?.lng||'';
    el('branchConfirmed').checked=!!selected;el('branchOpen').checked=selected?.is_open??true;el('branchActive').checked=selected?.active??true;
    if(widget)widget.value='';renderPrices();renderOrders();
  }
  async function load(ident){
    el('branchFields').disabled=true;el('branchSelect').disabled=true;el('branchNew').disabled=true;
    try{
      const branchData=await api('/api/seller/branches');
      const productData=await api('/api/products');
      rows=branchData.branches;products=productData.products;
      ordersError='';
      try{orders=(await api('/api/orders')).orders;}catch{orders=[];ordersError='Could not load branch orders. Try Refresh.';}
      el('branchSelect').replaceChildren(new Option('New branch',''),...rows.map(row=>new Option(row.name+(row.active?'':' (Hidden)'),row.id)));
      edit(ident||'');el('branchFields').disabled=false;el('branchSelect').disabled=false;el('branchNew').disabled=false;
      return true;
    }catch(e){status(e.message);return false;}
  }
  el('branchSelect').onchange=()=>{edit(el('branchSelect').value);status('');};
  el('branchNew').onclick=()=>{edit('');status('');el('branchName').focus();};
  el('branchReload').onclick=()=>load(selected?.id);
  for(const id of ['branchPickupAddress','branchLat','branchLng'])el(id).addEventListener('input',()=>{version++;el('branchConfirmed').checked=false;});
  el('branchForm').onsubmit=async event=>{
    event.preventDefault();if(el('branchFields').disabled)return;
    const data={id:selected?.id,revision:selected?.revision,name:el('branchName').value.trim(),phone:el('branchPhone').value.trim(),
      address:el('branchPickupAddress').value.trim(),coordinates:{lat:el('branchLat').value,lng:el('branchLng').value},confirmed:el('branchConfirmed').checked,
      is_open:el('branchOpen').checked,active:el('branchActive').checked,prices:{}};
    for(const input of el('branchProducts').querySelectorAll('input'))data.prices[input.dataset.productId]=input.value;
    el('branchFields').disabled=true;el('branchSelect').disabled=true;el('branchNew').disabled=true;el('branchReload').disabled=true;version++;
    try{const result=await api('/api/seller/branches',{method:'POST',body:JSON.stringify(data)});if(await load(result.saved_id))status('Branch saved.');else status('Branch saved, but reload failed. Refresh before editing again.');}
    catch(e){status(e.message);el('branchFields').disabled=false;el('branchSelect').disabled=false;el('branchNew').disabled=false;}
    finally{el('branchReload').disabled=false;}
  };
  async function googleMaps(){
    if(!googleLoading)googleLoading=(async()=>{
      const cfg=await api('/api/maps/config');if(!cfg.browser_key)throw new Error('Google search is unavailable. Enter the pickup address and coordinates.');
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('Google search timed out.')),15000);
        window.pmBranchMapsLoaded=()=>{clearTimeout(timer);resolve();};
        window.gm_authFailure=()=>{clearTimeout(timer);reject(new Error('Google key is not authorised for this seller website.'));};
        const script=document.createElement('script');script.src='https://maps.googleapis.com/maps/api/js?'+new URLSearchParams({key:cfg.browser_key,loading:'async',libraries:'places',callback:'pmBranchMapsLoaded',region:'MY',v:'weekly'});
        script.onerror=()=>{clearTimeout(timer);reject(new Error('Google search could not load.'));};document.head.append(script);
      });return google.maps;
    })();return googleLoading;
  }
  el('branchSearch').onclick=async()=>{
    status('Loading address search...');
    try{
      const maps=await googleMaps();
      if(!widget){
        const {PlaceAutocompleteElement}=await maps.importLibrary('places');widget=new PlaceAutocompleteElement({includedRegionCodes:['my']});widget.placeholder='Search Malaysian address';
        widget.addEventListener('gmp-error',()=>status('Google search failed. Try manual pickup coordinates.'));
        widget.addEventListener('input',()=>{version++;el('branchConfirmed').checked=false;});
        widget.addEventListener('gmp-select',async({placePrediction})=>{
          const expected=++version;el('branchConfirmed').checked=false;
          try{
            const place=placePrediction.toPlace();await place.fetchFields({fields:['formattedAddress','location','addressComponents']});
            if(expected!==version)return;
            if(!place.location||!place.addressComponents.some(c=>c.types.includes('country')&&c.shortText==='MY'))throw new Error('Select a Malaysian address.');
            el('branchPickupAddress').value=place.formattedAddress;el('branchLat').value=place.location.lat();el('branchLng').value=place.location.lng();status('Pickup address selected.');
          }catch(e){if(expected===version)status(e.message);}
        });el('branchGoogle').append(widget);
      }status('');
    }catch(e){status(e.message);}
  };
  load();
})();
