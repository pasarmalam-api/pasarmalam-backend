(() => {
  const el = id => document.getElementById(id);
  const en = localStorage.getItem('pasarmalam-lang') === 'en';
  const t = (ms, english) => en ? english : ms;
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
  const editor=document.createElement('div');editor.id='addressEditor';
  for(const child of [...section.children])if(child!==controls&&child.tagName!=='H2')editor.append(child);
  editor.prepend(el('addressSearch'),el('useDefaultAddress'));
  const done=document.createElement('button');done.type='button';done.className='primary';done.id='useAddress';done.textContent=t('Gunakan alamat ini','Use this address');editor.append(done);section.append(editor);
  function displayAddress(editing){
    window.pmAddressEditing=editing;editor.hidden=!editing;
    el('savedAddress').textContent=[currentUser().name,el('buyerPhone').value,address.value].filter(Boolean).join(' | ');
    el('changeAddress').hidden=editing;
  }
  displayAddress(!address.value.trim()||!el('buyerPhone').value.trim());
  let saved = currentUser().address || '', base = address.value, version = 0, loading;
  const status = value => { el('addressSearchStatus').textContent = value; };
  const drawDefault = () => {
    el('savedAddress').textContent = [currentUser().name,el('buyerPhone').value,address.value||saved].filter(Boolean).join(' | ');
    el('useDefaultAddress').hidden = !saved;
  };
  drawDefault();
  address.readOnly = !!saved;
  function invalidate() {
    version++;
    el('deliveryLat').value = ''; el('deliveryLng').value = '';
    address.dispatchEvent(new Event('input', {bubbles:true}));
  }
  address.addEventListener('input', () => { version++; });
  async function maps() {
    if (!loading) loading = (async () => {
      const cfg = await api('/api/maps/config');
      if (!cfg.browser_key) throw new Error(t('Carian Google belum tersedia. Masukkan alamat secara manual.','Google search is not configured. Enter your address manually.'));
      await new Promise((resolve,reject) => {
        const timer = setTimeout(()=>reject(new Error('Google Maps timed out.')),15000);
        window.pmMapsLoaded = () => { clearTimeout(timer); resolve(); };
        window.gm_authFailure = () => { clearTimeout(timer); reject(new Error('Google Maps key or billing is unavailable.')); };
        const script = document.createElement('script');
        const params = new URLSearchParams({key:cfg.browser_key,loading:'async',libraries:'places,geocoding',callback:'pmMapsLoaded',region:'MY',language:en?'en':'ms',v:'weekly'});
        script.src = 'https://maps.googleapis.com/maps/api/js?' + params;
        script.onerror = () => { clearTimeout(timer); reject(new Error('Google Maps could not load.')); };
        document.head.append(script);
      });
      return google.maps;
    })();
    return loading;
  }
  function applyLocation(text, location, expected) {
    if (version !== expected) return;
    base = text; address.value = [el('addressUnit').value.trim(),text].filter(Boolean).join(', ');
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
    applyLocation(keepText || matches[0].formatted_address,matches[0].geometry.location,expected);
  }
  let widget;
  el('changeAddress').onclick = async () => {
    displayAddress(true);
    address.readOnly = false; invalidate(); el('addressSearch').hidden = false;
    status(t('Memuatkan carian Google...','Loading Google search...'));
    try {
      const g = await maps();
      if (!widget) {
        const {PlaceAutocompleteElement} = await g.importLibrary('places');
        widget = new PlaceAutocompleteElement({includedRegionCodes:['my']});
        widget.placeholder = t('Cari alamat di Malaysia','Search Malaysian addresses');
        widget.addEventListener('input',invalidate);
        widget.addEventListener('gmp-error',()=>status(t('Carian gagal. Cuba lagi atau masukkan alamat secara manual.','Search failed. Try again or enter an address manually.')));
        widget.addEventListener('gmp-select',async ({placePrediction})=>{
          invalidate(); const expected = version;
          try {
            const place = placePrediction.toPlace();
            await place.fetchFields({fields:['formattedAddress','location','addressComponents']});
            if (!place.location || !place.addressComponents.some(c=>c.types.includes('country')&&c.shortText==='MY')) throw new Error('Choose an address in Malaysia.');
            if(version!==expected)return;
            el('addressUnit').value=''; applyLocation(place.formattedAddress,place.location,expected);
          } catch(e) { if(version===expected)status(e.message); }
        });
        el('addressSearch').append(widget);
      }
      status('');
    } catch(e) { status(e.message); address.focus(); }
  };
  el('useDefaultAddress').onclick = async () => {
    address.value=saved; base=saved; el('addressUnit').value=''; address.readOnly=true;
    invalidate(); const expected=version;
    try { await geocode({address:saved,componentRestrictions:{country:'MY'}},expected,saved); }
    catch(e) { if(version===expected)status(e.message); address.readOnly=false; }
  };
  done.onclick=async()=>{
    if(!address.value.trim()||!el('buyerPhone').value.trim())return status(t('Lengkapkan alamat dan nombor telefon.','Enter your address and phone number.'));
    done.disabled=true;
    try{
      if(el('shipping').value!=='EasyParcel'&&el('shipping').value!=='Ambil Sendiri'&&!el('deliveryConfirmed').checked){
        await geocode({address:address.value,componentRestrictions:{country:'MY'}},version,address.value);
      }
      displayAddress(false);status('');window.pmDeliveryInvalidate?.();
    }catch(e){status(e.message);}finally{done.disabled=false;}
  };
  el('addressUnit').addEventListener('input',()=>{
    address.value=[el('addressUnit').value.trim(),base].filter(Boolean).join(', ');
    address.dispatchEvent(new Event('input',{bubbles:true}));
  });
  address.addEventListener('change',()=>{base=address.value;el('addressUnit').value='';});
  el('saveDefaultAddress').onclick=async()=>{
    if(!address.value.trim())return status(t('Masukkan alamat dahulu.','Enter an address first.'));
    const button=el('saveDefaultAddress');button.disabled=true;
    const value=address.value.trim();
    try {
      await api('/api/profile',{method:'POST',body:JSON.stringify({address:value})});
      saved=value;localStorage.setItem('pm_user',JSON.stringify({...currentUser(),address:value}));drawDefault();
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
  if(token())api('/api/profile').then(async data=>{
    if(!data.user)return;
    saved=data.user.address||'';drawDefault();
    if(version===0){
      address.value=saved;base=saved;address.readOnly=!!saved;
      displayAddress(!saved||!el('buyerPhone').value.trim());
      if(saved){
        const expected=version;
        try{await geocode({address:saved,componentRestrictions:{country:'MY'}},expected,saved);}
        catch(e){if(version===expected)status(e.message);}
      }
    }
  }).catch(()=>{});
})();
