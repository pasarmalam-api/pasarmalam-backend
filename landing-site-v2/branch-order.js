(() => {
  const ident=new URLSearchParams(location.search).get('id');
  const token=localStorage.getItem('pm_token');
  if(!ident||!token)return;
  const section=document.createElement('section');section.className='checkout-section';section.style.padding='16px';section.hidden=true;
  document.querySelector('main')?.prepend(section);
  fetch('https://pasarmalam-backend.onrender.com/api/orders',{headers:{Authorization:'Bearer '+token}})
    .then(async response=>{if(!response.ok)throw new Error('Branch information could not be loaded.');return response.json();})
    .then(data=>{
      const order=(data.orders||[]).find(row=>String(row.id)===ident);
      const branch=JSON.parse(order?.delivery_data||'{}').context?.branch;
      if(!branch)return;
      const heading=document.createElement('h3');heading.textContent='Pickup branch';section.append(heading);
      for(const value of [branch.name,branch.pickup?.address,branch.phone]){const p=document.createElement('p');p.textContent=value||'';section.append(p);}
      section.hidden=false;
    }).catch(error=>{section.textContent=error.message;section.setAttribute('role','status');section.hidden=false;});
})();
