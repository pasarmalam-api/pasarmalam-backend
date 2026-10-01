(function(){
 const el=id=>document.getElementById(id);
 const regions=['Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Pulau Pinang','Perak','Perlis','Selangor','Terengganu','Sabah','Sarawak','Kuala Lumpur','Labuan','Putrajaya'];
 const fields=document.createElement('div');
 fields.innerHTML='<label for="addressUnit">Unit / floor (optional)</label><input id="addressUnit" autocomplete="address-line2" maxlength="120"><label for="addressPostcode">Postcode</label><input id="addressPostcode" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" required><label for="addressCity">City</label><input id="addressCity" autocomplete="address-level2" maxlength="100" required><label for="addressState">State</label><select id="addressState" autocomplete="address-level1" required style="width:100%;min-height:44px;font:inherit;padding:10px;border:1px solid #dce3e8;border-radius:6px"><option value="">Select state</option></select>';
 el('address').after(fields);el('address').required=true;el('address').maxLength=300;el('address').autocomplete='address-line1';
 el('addressState').append(...regions.map(r=>new Option(r,r)));
 el('addressPostcode').addEventListener('input',()=>{el('addressPostcode').value=el('addressPostcode').value.replace(/[^0-9]/g,'').slice(0,5);});
 let location=null,revision=0,mapsLoading;
 const locationTools=document.createElement('div');
 locationTools.innerHTML='<button type="button" class="soft" id="confirmLocation">Confirm delivery location</button><div id="profileAddressSearch" hidden></div><p id="profileLocationStatus" role="status"></p>';
 fields.after(locationTools);
 const text=(ms,en)=>window.pmBuyerText?window.pmBuyerText(ms,en):en;
 function locationStatus(){el('profileLocationStatus').textContent=location?text('Lokasi penghantaran disahkan.','Delivery location confirmed.'):text('Sahkan lokasi untuk penghantaran Lalamove dan PM Express.','Confirm location for Lalamove and PM Express delivery.');}
 for(const id of ['address','addressUnit','addressPostcode','addressCity','addressState'])el(id).addEventListener('input',()=>{revision++;location=null;locationStatus();});
 el('confirmLocation').onclick=async()=>{
  const button=el('confirmLocation');button.disabled=true;el('profileAddressSearch').hidden=false;
  try{
   if(!mapsLoading)mapsLoading=(async()=>{
    const r=await fetch('https://pasarmalam-backend.onrender.com/api/maps/config',{headers:{Authorization:'Bearer '+localStorage.getItem('pm_token')}});
    const cfg=await r.json();if(!r.ok||!cfg.browser_key)throw new Error('Address search is unavailable. Please try again.');
    await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(new Error('Address search timed out. Please try again.')),15000);
     window.pmProfileMapsReady=()=>{clearTimeout(timer);resolve();};
     window.gm_authFailure=()=>{clearTimeout(timer);reject(new Error('Address search is unavailable. Please try again.'));};
     const script=document.createElement('script');script.src='https://maps.googleapis.com/maps/api/js?'+new URLSearchParams({key:cfg.browser_key,libraries:'places',loading:'async',callback:'pmProfileMapsReady',region:'MY',language:localStorage.getItem('pasarmalam-lang')||'ms'});
     script.onerror=()=>{clearTimeout(timer);reject(new Error('Address search is unavailable. Please try again.'));};document.head.append(script);
    });
    const {PlaceAutocompleteElement}=await google.maps.importLibrary('places');
    const widget=new PlaceAutocompleteElement({includedRegionCodes:['my']});
    widget.placeholder=text('Cari alamat di Malaysia','Search Malaysian addresses');
    let selected='',selecting=false;
    widget.addEventListener('input',()=>{if(selecting&&String(widget.value||'')===selected)return;revision++;location=null;locationStatus();});
    widget.addEventListener('gmp-select',async({placePrediction})=>{
     const expected=++revision;location=null;selected=String(widget.value||'');selecting=true;locationStatus();
     try{
      const place=placePrediction.toPlace();await place.fetchFields({fields:['formattedAddress','location','addressComponents']});
      if(expected!==revision)return;
      const parts=place.addressComponents||[],part=type=>parts.find(c=>c.types.includes(type))?.longText||'';
      if(!place.location||!parts.some(c=>c.types.includes('country')&&c.shortText==='MY'))throw new Error('Choose an address in Malaysia.');
      const formatted=place.formattedAddress||'';
      el('address').value=formatted.replace(/\b\d{5}\b[\s\S]*$/,'').replace(/[,\s]+$/,'');
      el('addressPostcode').value=part('postal_code')||(formatted.match(/\b\d{5}\b/)||[''])[0];
      el('addressCity').value=part('locality')||part('postal_town');
      const state=part('administrative_area_level_1')||formatted;
      el('addressState').value=regions.find(s=>state.toLowerCase().includes(s.toLowerCase()))||(/penang/i.test(state)?'Pulau Pinang':/malacca/i.test(state)?'Melaka':'');
      const address=deliveryAddress().address;
      location={address,lat:place.location.lat(),lng:place.location.lng(),confirmed:true};locationStatus();
     }catch(e){el('profileLocationStatus').textContent=e.message;}finally{selecting=false;}
    });
    el('profileAddressSearch').replaceChildren(widget);
   })().catch(e=>{mapsLoading=null;throw e;});
   await mapsLoading;
  }catch(e){el('profileLocationStatus').textContent=e.message;}finally{button.disabled=false;}
 };
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
  revision++;try{location=typeof user.delivery_location==='string'?JSON.parse(user.delivery_location||'null'):user.delivery_location;}catch(e){location=null;}
  if(!location||location.address!==text||!location.confirmed)location=null;
  locationStatus();
  el('profileForm').hidden=false;el('logout').hidden=false;el('loginLink').hidden=true;
 }
 el('profileForm').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.currentTarget.querySelector('button[type="submit"]');if(button.disabled)return;button.disabled=true;
  try{const delivery=deliveryAddress();const confirmed=location?{...location,address:delivery.address}:null;const d=await request({method:'POST',body:JSON.stringify({name:el('name').value.trim(),phone:el('phone').value.trim(),...delivery,delivery_location:confirmed})});fill(d.user);localStorage.setItem('pm_user',JSON.stringify(d.user));if(d.token)localStorage.setItem('pm_token',d.token);el('profileStatus').textContent='Profile saved.'}
  catch(e){el('profileStatus').textContent=e instanceof TypeError?'Connection failed. Please try again.':e.message}finally{button.disabled=false}
 });
 el('logout').onclick=()=>{localStorage.removeItem('pm_token');localStorage.removeItem('pm_user');location.href='login.html'};
 request().then(d=>{fill(d.user);el('profileStatus').textContent=''}).catch(e=>{el('profileStatus').textContent=e instanceof TypeError?'Connection failed. Please reload to try again.':e.message;el('loginLink').hidden=false});
})();
