(() => {
  if(window.PMStoreTypesInitialized)return;
  window.PMStoreTypesInitialized=true;
  const types=[['retail','Retail'],['bulk','Bulk / Wholesale'],['factory','Factory Direct']];
  const page=location.pathname.split('/').pop();
  function field(){
    const label=document.createElement('label');label.textContent='Store type';
    const select=document.createElement('select');select.name='store_type';select.id='storeType';select.required=true;
    select.replaceChildren(new Option('Choose store type',''),...types.map(([v,n])=>new Option(n,v)));
    label.append(select);return label;
  }
  if(['register.html','become-seller.html'].includes(page)){
    const category=document.querySelector('#shopCategory,[name="shop_category"]');
    const anchor=category?.closest('label')||document.querySelector('label[for="shopCategory"]')||category;
    anchor?.before(field());
  }
  if(page==='settings.html'){
    const section=document.createElement('section');section.className='store-type-settings';
    const heading=document.createElement('h3');heading.textContent='Store type';section.append(heading,field());
    const note=document.createElement('p');note.className='muted';note.textContent='Applies to new listings. Existing products stay unchanged.';
    const button=document.createElement('button');button.type='button';button.className='primary';button.textContent='Save store type';
    const status=document.createElement('p');status.setAttribute('role','status');section.append(note,button,status);document.querySelector('main')?.prepend(section);
    const select=section.querySelector('select');button.disabled=true;
    request('/api/seller/profile').then(d=>{select.value=d.user.store_type||'';button.disabled=false}).catch(e=>{status.textContent=e.message});
    button.onclick=async()=>{if(!select.reportValidity())return;button.disabled=true;try{await request('/api/profile',{store_type:select.value});status.textContent='Store type saved. Existing products are unchanged.'}catch(e){status.textContent=e.message}finally{button.disabled=false}};
  }
  async function request(path,body){
    const r=await fetch('https://pasarmalam-backend.onrender.com'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(localStorage.getItem('pm_token')||'')},body:body?JSON.stringify(body):undefined});
    const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to load store type. Please reload.');return d;
  }
  if(page==='add-product.html'){
    const select=document.getElementById('sellingMode'),minimum=document.getElementById('minimumOrder');
    const publish=document.querySelector('button[onclick="save()"]');if(publish)publish.disabled=true;
    let failed=false;
    const ready=request('/api/seller/profile').then(d=>{
      const mode=d.user.store_type;
      if(types.some(([v])=>v===mode)){select.value=mode;PMSelling.editor(mode,minimum);select.disabled=true}
      if(publish)publish.disabled=false;
    }).catch(e=>{failed=true;document.getElementById('out').textContent=e.message;});
    const save=window.save;window.save=async function(){await ready;if(!failed)return save.apply(this,arguments)};
  }
})();
