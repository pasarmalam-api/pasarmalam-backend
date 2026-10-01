(function(){
 const el=id=>document.getElementById(id);
 const regions=['Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Pulau Pinang','Perak','Perlis','Selangor','Terengganu','Sabah','Sarawak','Kuala Lumpur','Labuan','Putrajaya'];
 const fields=document.createElement('div');
 fields.innerHTML='<label for="addressUnit">Unit / floor (optional)</label><input id="addressUnit" autocomplete="address-line2" maxlength="120"><label for="addressPostcode">Postcode</label><input id="addressPostcode" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" required><label for="addressCity">City</label><input id="addressCity" autocomplete="address-level2" maxlength="100" required><label for="addressState">State</label><select id="addressState" autocomplete="address-level1" required style="width:100%;min-height:44px;font:inherit;padding:10px;border:1px solid #dce3e8;border-radius:6px"><option value="">Select state</option></select>';
 el('address').after(fields);el('address').required=true;el('address').maxLength=300;el('address').autocomplete='address-line1';
 el('addressState').append(...regions.map(r=>new Option(r,r)));
 el('addressPostcode').addEventListener('input',()=>{el('addressPostcode').value=el('addressPostcode').value.replace(/[^0-9]/g,'').slice(0,5);});
 function deliveryAddress(){
  const value=id=>el(id).value.trim();
  const address_fields={street:value('address'),unit:value('addressUnit'),postcode:value('addressPostcode'),city:value('addressCity'),state:value('addressState')};
  const t=(ms,en)=>window.pmBuyerText?window.pmBuyerText(ms,en):en;
  if(address_fields.street.length<4)throw new Error(t('Masukkan nama jalan atau bangunan dan nombor rumah jika berkenaan.','Enter the street or building and house number where applicable.'));
  if(!/^[0-9]{5}$/.test(address_fields.postcode))throw new Error(t('Masukkan poskod 5 digit.','Enter a five-digit postcode.'));
  if(address_fields.city.length<2||!/[\p{L}]/u.test(address_fields.city))throw new Error(t('Masukkan bandar.','Enter the city.'));
  if(!regions.includes(address_fields.state))throw new Error(t('Pilih negeri.','Select the state.'));
  return {address_fields,address:[address_fields.unit,address_fields.street,address_fields.postcode+' '+address_fields.city,address_fields.state,'Malaysia'].filter(Boolean).join(', ')};
 }
 async function request(options={}){
  const token=localStorage.getItem('pm_token');if(!token)throw new Error('Please sign in to view your profile.');
  const r=await fetch('https://pasarmalam-backend.onrender.com/api/profile',{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token}});
  const d=await r.json().catch(()=>({}));
  if(r.status===401){localStorage.removeItem('pm_token');localStorage.removeItem('pm_user');el('profileForm').hidden=true;el('loginLink').hidden=false}
  if(!r.ok||!d.user)throw new Error(d.error||'Unable to load profile. Please try again.');return d;
 }
 function fill(user){
  for(const key of ['name','email','phone','address'])el(key).value=user[key]||'';
  const text=user.address||'',match=text.match(/\b([0-9]{5})\s+([^,]+)/);
  el('addressUnit').value='';
  el('addressPostcode').value=match?match[1]:'';
  el('addressState').value=regions.find(r=>text.toLowerCase().includes(r.toLowerCase()))||(/penang/i.test(text)?'Pulau Pinang':/malacca/i.test(text)?'Melaka':'');
  el('addressCity').value=match?match[2].replace(/Malaysia/gi,'').trim():'';
  // Keep an old unstructured address intact until the buyer completes it.
  if(match)el('address').value=text.slice(0,match.index).replace(/[,\s]+$/,'');
  el('profileForm').hidden=false;el('logout').hidden=false;el('loginLink').hidden=true;
 }
 el('profileForm').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.currentTarget.querySelector('button');if(button.disabled)return;button.disabled=true;
  try{const d=await request({method:'POST',body:JSON.stringify({name:el('name').value.trim(),phone:el('phone').value.trim(),...deliveryAddress()})});fill(d.user);localStorage.setItem('pm_user',JSON.stringify(d.user));if(d.token)localStorage.setItem('pm_token',d.token);el('profileStatus').textContent='Profile saved.'}
  catch(e){el('profileStatus').textContent=e instanceof TypeError?'Connection failed. Please try again.':e.message}finally{button.disabled=false}
 });
 el('logout').onclick=()=>{localStorage.removeItem('pm_token');localStorage.removeItem('pm_user');location.href='login.html'};
 request().then(d=>{fill(d.user);el('profileStatus').textContent=''}).catch(e=>{el('profileStatus').textContent=e instanceof TypeError?'Connection failed. Please reload to try again.':e.message;el('loginLink').hidden=false});
})();
