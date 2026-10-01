(() => {
  const el = id => document.getElementById(id);
  const t = (ms, english) => window.pmBuyerText ? window.pmBuyerText(ms,english) : localStorage.getItem('pasarmalam-lang') === 'en' ? english : ms;
  const address = el('address');
  const section = address.closest('section');
  const controls = document.createElement('div');
  controls.className = 'address-tools';
  controls.innerHTML = `<p id="savedAddress"></p><button type="button" class="soft" id="changeAddress">${t('Tukar alamat','Change address')}</button>
    <button type="button" class="soft" id="useDefaultAddress">${t('Guna alamat lalai','Use default address')}</button>
    <div id="addressSearch" hidden></div><p id="addressSearchStatus" role="status" class="muted"></p>`;
  section.querySelector('h2').after(controls);
  const extra = document.createElement('div');
  extra.innerHTML = `<label for="addressUnit">${t('Unit / tingkat (pilihan)','Unit / floor (optional)')}</label><input id="addressUnit" autocomplete="address-line2" maxlength="120">
    <button type="button" class="soft" id="saveDefaultAddress">${t('Simpan sebagai alamat lalai','Save as default address')}</button>`;
  address.after(extra);
  const regions=['Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Pulau Pinang','Perak','Perlis','Selangor','Terengganu','Sabah','Sarawak','Kuala Lumpur','Labuan','Putrajaya'];
  const locality=document.createElement('div');locality.className='row';
  locality.innerHTML=`<label for="addressPostcode">${t('Poskod','Postcode')}<input id="addressPostcode" inputmode="numeric" autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" required></label><label for="addressCity">${t('Bandar','City')}<input id="addressCity" autocomplete="address-level2" maxlength="100" required></label><label for="addressState">${t('Negeri','State')}<select id="addressState" autocomplete="address-level1" required><option value="">${t('Pilih negeri','Select state')}</option>${regions.map(r=>`<option value="${r}">${r}</option>`).join('')}</select></label>`;
  extra.before(locality);
  el('addressPostcode').addEventListener('input',()=>{el('addressPostcode').value=el('addressPostcode').value.replace(/[^0-9]/g,'').slice(0,5);});
  function fillParts(text,components=[]){
    const component=type=>{const c=components.find(c=>c.types.includes(type));return c?.longText||c?.long_name||'';};
    const state=component('administrative_area_level_1')||text;
    el('addressState').value=regions.find(r=>state.toLowerCase().includes(r.toLowerCase()))||(/penang/i.test(state)?'Pulau Pinang':/malacca/i.test(state)?'Melaka':'');
    el('addressPostcode').value=component('postal_code')||(text.match(/\b\d{5}\b/)||[''])[0];
    const after=text.split(/\b\d{5}\b/)[1]||'';
    el('addressCity').value=component('locality')||component('postal_town')||after.split(',')[0].replace(/Malaysia/gi,'').trim()||(['Kuala Lumpur','Labuan','Putrajaya'].includes(el('addressState').value)?el('addressState').value:'');
  }
  fillParts(address.value);
  function validateAddress(){
    if(!/^\d{5}$/.test(el('addressPostcode').value.trim()))throw new Error(t('Masukkan poskod 5 digit.','Enter a five-digit postcode.'));
    if(el('addressCity').value.trim().length<2)throw new Error(t('Masukkan bandar.','Enter the city.'));
    if(!el('addressState').value)throw new Error(t('Pilih negeri.','Select the state.'));
    const street=address.value.replace(/\b\d{5}\b/g,'').replace(/Malaysia/gi,'').replaceAll(el('addressCity').value.trim(),'').replaceAll(el('addressState').value,'').replace(/[,\s]/g,'');
    if(street.length<4)throw new Error(t('Masukkan nama jalan atau bangunan dan nombor rumah jika berkenaan.','Enter the street or building and house number where applicable.'));
    if(!el('buyerPhone').value.trim())throw new Error(t('Masukkan nombor telefon penerima.','Enter the recipient phone number.'));
    return true;
  }
  window.pmValidateDeliveryAddress=validateAddress;
  function completeAddress(){
    validateAddress();
    let text=address.value.trim().replace(/\b\d{5}\b[\s\S]*$/,'').replace(/[,\s]+$/,'');
    text=[text,el('addressPostcode').value.trim()+' '+el('addressCity').value.trim(),el('addressState').value,'Malaysia'].filter(Boolean).join(', ');
    const changed=address.value!==text;address.value=text;base=text;if(changed)invalidate();
  }
  const editor=document.createElement('div');editor.id='addressEditor';
  for(const child of [...section.children])if(child!==controls&&child.tagName!=='H2')editor.append(child);
  controls.insertBefore(el('useDefaultAddress'),el('changeAddress'));
  editor.prepend(el('addressSearch'),el('addressSearchStatus'));
  el('deliveryLocate').hidden=false;
  editor.insertBefore(el('deliveryLocate'),el('addressSearch'));
  const done=document.createElement('button');done.type='button';done.className='primary';done.id='useAddress';done.textContent=t('Gunakan alamat ini','Use this address');editor.append(done);section.append(editor);
  function displayAddress(editing){
    window.pmAddressEditing=editing;editor.hidden=!editing;
    el('savedAddress').textContent=[currentUser().name,el('buyerPhone').value,address.value].filter(Boolean).join(' | ');
    el('changeAddress').hidden=editing;
    if(window.pmDeliveryPendingLabel)renderSummary();
  }
  // Old accounts can complete their address explicitly without expanding checkout on arrival.
  const notice=document.createElement('p');notice.className='muted';notice.id='addressNotice';controls.append(notice);
  function showSavedAddress(){
    let valid=true;try{validateAddress();}catch(e){valid=false;}
    notice.textContent=valid?'':t('Lengkapkan alamat penghantaran sebelum meneruskan.','Complete your delivery address before continuing.');
    notice.hidden=valid;displayAddress(false);
  }
  showSavedAddress();
  let saved = currentUser().address || '', base = address.value, version = 0, loading;
  let savedLocation=null,profileReady=Promise.resolve();
  function restoreLocation(){
    const point=savedLocation;
    if(!point||point.address!==address.value.trim()||point.confirmed!==true||!Number.isFinite(Number(point.lat))||!Number.isFinite(Number(point.lng)))return false;
    el('deliveryLat').value=point.lat;el('deliveryLng').value=point.lng;el('deliveryConfirmed').checked=true;
    el('deliveryConfirmed').dispatchEvent(new Event('change'));return true;
  }
  const status = value => { el('addressSearchStatus').textContent = value; };
  const drawDefault = () => {
    el('savedAddress').textContent = [currentUser().name,el('buyerPhone').value,address.value||saved].filter(Boolean).join(' | ');
    el('useDefaultAddress').disabled = !saved;
  };
  drawDefault();
  address.readOnly = !!saved;
  function invalidate() {
    version++;
    el('deliveryLat').value = ''; el('deliveryLng').value = '';
    address.dispatchEvent(new Event('input', {bubbles:true}));
  }
  address.addEventListener('input', event => { version++;if(event.isTrusted)fillParts(address.value); });
  for(const id of ['addressPostcode','addressCity','addressState'])el(id).addEventListener('input',invalidate);
  async function maps() {
    if (!loading) loading = (async () => {
      const cfg = await api('/api/maps/config');
      if (!cfg.browser_key) throw new Error(t('Carian Google belum tersedia. Masukkan alamat secara manual.','Google search is not configured. Enter your address manually.'));
      await new Promise((resolve,reject) => {
        const timer = setTimeout(()=>reject(new Error('Google Maps timed out.')),15000);
        window.pmMapsLoaded = () => { clearTimeout(timer); resolve(); };
        window.gm_authFailure = () => { clearTimeout(timer); reject(new Error('Google Maps key or billing is unavailable.')); };
        const script = document.createElement('script');
        const params = new URLSearchParams({key:cfg.browser_key,loading:'async',libraries:'places,geocoding',callback:'pmMapsLoaded',region:'MY',language:localStorage.getItem('pasarmalam-lang')||'ms',v:'weekly'});
        script.src = 'https://maps.googleapis.com/maps/api/js?' + params;
        script.onerror = () => { clearTimeout(timer); reject(new Error('Google Maps could not load.')); };
        document.head.append(script);
      });
      return google.maps;
    })();
    try { return await loading; } catch(e) { loading=null; throw e; }
  }
  function applyLocation(text, location, expected, components=[]) {
    if (version !== expected) return;
    base = text; address.value = [el('addressUnit').value.trim(),text].filter(Boolean).join(', ');
    fillParts(text,components);
    invalidate();
    el('deliveryLat').value = location.lat(); el('deliveryLng').value = location.lng();
    el('deliveryConfirmed').checked = true;
    el('deliveryConfirmed').dispatchEvent(new Event('change'));
    status('');
  }
  const inMalaysia = result => (result.address_components || []).some(c=>c.types.includes('country')&&c.short_name==='MY');
  async function geocode(request, expected, keepText) {
    const g = await maps();
    const response = await new g.Geocoder().geocode(request);
    const matches = response.results.filter(inMalaysia);
    if (!matches.length || matches[0].partial_match) throw new Error(t('Pilih alamat Malaysia yang tepat melalui carian.','Select a precise Malaysian address using search.'));
    if (!request.location && matches.length !== 1) throw new Error(t('Beberapa alamat ditemui. Pilih melalui carian.','Several addresses matched. Please choose using search.'));
    applyLocation(keepText || matches[0].formatted_address,matches[0].geometry.location,expected,matches[0].address_components);
  }
  let resolving;
  window.pmResolveDeliveryAddress=async()=>{
    await profileReady;
    validateAddress();
    if(el('deliveryConfirmed').checked&&el('deliveryLat').value&&el('deliveryLng').value)return;
    if(!resolving){
      const expected=version,value=address.value.trim();
      resolving=geocode({address:value,componentRestrictions:{country:'MY'}},expected,value)
        .finally(()=>{resolving=null;});
    }
    await resolving;
  };
  let widget, selectedSearch = '', selecting = false;
  el('changeAddress').onclick = async () => {
    notice.hidden=true;
    displayAddress(true);
    address.readOnly = false; invalidate(); el('addressSearch').hidden = false;
    status(t('Memuatkan carian Google...','Loading Google search...'));
    try {
      const g = await maps();
      if (!widget) {
        const {PlaceAutocompleteElement} = await g.importLibrary('places');
        widget = new PlaceAutocompleteElement({includedRegionCodes:['my']});
        widget.placeholder = t('Cari alamat di Malaysia','Search Malaysian addresses');
        widget.addEventListener('input',()=>{
          const value=String(widget.value||'').trim();
          if(selecting && value===selectedSearch)return;
          invalidate();
          if(value){address.value=value;base=value;el('addressUnit').value='';}
          status(t('Pilih alamat daripada cadangan atau sahkan alamat penuh.','Choose an address suggestion or confirm the full address.'));
        });
        widget.addEventListener('gmp-error',()=>status(t('Carian gagal. Cuba lagi atau masukkan alamat secara manual.','Search failed. Try again or enter an address manually.')));
        widget.addEventListener('gmp-select',async ({placePrediction})=>{
          invalidate(); const expected = version;selectedSearch=String(widget.value||'').trim();selecting=true;
          status(t('Mengesahkan alamat...','Confirming address...'));
          try {
            const place = placePrediction.toPlace();
            await place.fetchFields({fields:['formattedAddress','location','addressComponents']});
            if (!place.location || !place.addressComponents.some(c=>c.types.includes('country')&&c.shortText==='MY')) throw new Error('Choose an address in Malaysia.');
            if(version!==expected)return;
            el('addressUnit').value=''; applyLocation(place.formattedAddress,place.location,expected,place.addressComponents);
          } catch(e) { if(version===expected)status(e.message); }
          finally {selecting=false;}
        });
        el('addressSearch').append(widget);
      }
      status('');
    } catch(e) { status(e.message); address.focus(); }
  };
  window.addEventListener('pm-language-change',()=>{
    if(widget){widget.requestedLanguage=localStorage.getItem('pasarmalam-lang')||'ms';widget.placeholder=t('Cari alamat di Malaysia','Search Malaysian addresses');}
  });
  el('useDefaultAddress').onclick = () => {
    address.value=saved; base=saved; el('addressUnit').value=''; address.readOnly=true;
    fillParts(saved);invalidate();restoreLocation();status('');showSavedAddress();window.pmDeliveryInvalidate?.();
  };
  done.onclick=async()=>{
    if(!address.value.trim()||!el('buyerPhone').value.trim())return status(t('Lengkapkan alamat dan nombor telefon.','Enter your address and phone number.'));
    done.disabled=true;
    try{
      completeAddress();
      if(el('shipping').value!=='EasyParcel'&&el('shipping').value!=='Ambil Sendiri'&&!el('deliveryConfirmed').checked){
        await geocode({address:address.value,componentRestrictions:{country:'MY'}},version,address.value);
      }
      validateAddress();
      showSavedAddress();status('');window.pmDeliveryInvalidate?.();
    }catch(e){status(e.message);}finally{done.disabled=false;renderSummary();}
  };
  el('addressUnit').addEventListener('input',()=>{
    address.value=[el('addressUnit').value.trim(),base].filter(Boolean).join(', ');
    address.dispatchEvent(new Event('input',{bubbles:true}));
  });
  address.addEventListener('change',()=>{base=address.value;el('addressUnit').value='';});
  el('saveDefaultAddress').onclick=async()=>{
    if(!address.value.trim())return status(t('Masukkan alamat dahulu.','Enter an address first.'));
    try{completeAddress();}catch(e){status(e.message);return;}
    const button=el('saveDefaultAddress');button.disabled=true;
    const value=address.value.trim();
    try {
      await window.pmResolveDeliveryAddress();
      if(value!==address.value.trim())throw new Error(t('Sahkan semula lokasi penerima.','Confirm the recipient location again.'));
      const point={address:value,lat:Number(el('deliveryLat').value),lng:Number(el('deliveryLng').value),confirmed:el('deliveryConfirmed').checked};
      const response=await api('/api/profile',{method:'POST',body:JSON.stringify({address:value,delivery_location:point})});
      saved=value;savedLocation=point;localStorage.setItem('pm_user',JSON.stringify({...currentUser(),...response.user,address:value,delivery_location:point}));drawDefault();
      status(t('Alamat lalai disimpan.','Default address saved.'));
    }catch(e){status(e.message);}finally{button.disabled=false;}
  };
  // Replace the coordinates-only locator; request device permission only on click.
  el('deliveryLocate').onclick=()=>{
    if(!navigator.geolocation)return status('Location is unavailable.');
    invalidate(); const expected=version;
    status(t('Mencari lokasi...','Finding your location...'));
    navigator.geolocation.getCurrentPosition(async pos=>{
      try { await geocode({location:{lat:pos.coords.latitude,lng:pos.coords.longitude}},expected); }
      catch(e){if(version===expected)status(e.message);}
    },()=>{if(version===expected){el('deliveryLocationDetails').open=true;status(t('Lokasi tidak dibenarkan. Cari atau masukkan alamat.','Location denied. Search or enter an address.'));}},
    {enableHighAccuracy:true,timeout:15000,maximumAge:0});
  };
  if(token())profileReady=api('/api/profile').then(async data=>{
    if(!data.user)return;
    saved=data.user.address||'';drawDefault();
    try{savedLocation=typeof data.user.delivery_location==='string'?JSON.parse(data.user.delivery_location||'null'):data.user.delivery_location;}catch(e){savedLocation=null;}
    if(version===0){
      address.value=saved;base=saved;address.readOnly=!!saved;
      fillParts(saved);showSavedAddress();
      restoreLocation();
      window.pmDeliveryInvalidate?.();
    }
  }).catch(()=>{});
})();
