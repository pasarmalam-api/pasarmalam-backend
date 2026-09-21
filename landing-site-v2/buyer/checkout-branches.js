(() => {
  const en=localStorage.getItem('pasarmalam-lang')==='en';
  const t=(ms,enText)=>en?enText:ms;
  let loaded=false, selected=null, rows=[], original=null;
  const section=document.createElement('section');section.className='checkout-section';section.hidden=true;
  section.innerHTML=`<h2>${t('Cawangan kedai','Store branch')}</h2><label for="checkoutBranch">${t('Cawangan pengambilan','Pickup branch')}</label><select id="checkoutBranch" disabled></select><p id="branchAddress" class="muted"></p><p id="branchStatus" role="status"></p><button type="button" class="soft" id="branchRetry" hidden>${t('Cuba lagi','Retry')}</button>`;
  document.querySelector('.checkout-fields').prepend(section);
  const select=section.querySelector('select'),status=section.querySelector('#branchStatus');
  window.pmBranchFields=()=>{
    if(!loaded||!selected)throw new Error(t('Tunggu maklumat cawangan atau cuba lagi.','Wait for branch details or retry.'));
    if(!selected.is_open)throw new Error(t('Cawangan ini ditutup.','This branch is closed.'));
    return {branch_id:selected.id,expected_unit_price:selected.price};
  };
  function choose(){
    selected=rows.find(row=>row.id===select.value)||null;
    if(!selected)return;
    section.hidden=rows.length===1;
    checkoutProduct={...original,price:selected.price,shop_open:original.shop_open!==false&&selected.is_open};
    section.querySelector('#branchAddress').textContent=selected.address||t('Alamat pengambilan belum disediakan.','Pickup address not configured.');
    status.textContent=`${money(selected.price)} / ${t('unit','unit')}`;
    window.pmDeliveryInvalidate?.();renderSummary();
    if(activeVoucher)applyVoucher();
  }
  async function load(){
    if(!checkoutProduct)return;
    original=original||{...checkoutProduct};section.hidden=false;loaded=false;select.disabled=true;
    status.textContent=t('Memuatkan cawangan...','Loading branches...');
    section.querySelector('#branchRetry').hidden=true;
    try{
      const data=await api('/api/product/branches?product_id='+encodeURIComponent(original.id));
      rows=data.branches||[];
      if(!rows.length)throw new Error(t('Kedai ini tidak tersedia.','This store is unavailable.'));
      select.replaceChildren(...rows.map(row=>{
        const option=new Option(`${row.name} - ${money(row.price)}${row.is_open?'':t(' (Ditutup)',' (Closed)')}`,row.id);
        option.disabled=!row.is_open;return option;
      }));
      select.value=(rows.find(row=>row.is_open)||rows[0]).id;
      loaded=true;select.disabled=false;choose();
    }catch(e){status.textContent=e.message;section.querySelector('#branchRetry').hidden=false;}
  }
  select.addEventListener('change',choose);
  section.querySelector('#branchRetry').onclick=load;
  window.addEventListener('pm-checkout-loaded',load);
  if(checkoutProduct)load();
})();
