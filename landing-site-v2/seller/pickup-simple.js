(() => {
  const el=id=>document.getElementById(id), address=el('pickupAddress');
  const say=text=>{el('searchStatus').textContent=text;};
  let loading,revision=0,widget,selected='',selecting=false;
  function invalidate(){revision++;el('lat').value='';el('lng').value='';el('confirmed').checked=false;el('status').textContent='';}
  el('pickupUnit').addEventListener('input',()=>{el('status').textContent='';});
  address.addEventListener('input',invalidate);
  async function maps(){
    if(!loading)loading=(async()=>{
      const response=await fetch('https://pasarmalam-backend.onrender.com/api/maps/config',{headers:{Authorization:'Bearer '+(localStorage.getItem('pm_token')||'')}});
      const cfg=await response.json();
      if(!response.ok||!cfg.browser_key)throw new Error('Address search is unavailable. Please try again later.');
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('Address search timed out. Please reload.')),15000);
        window.pmPickupMapsReady=()=>{clearTimeout(timer);resolve();};
        window.gm_authFailure=()=>{clearTimeout(timer);reject(new Error('Address search is unavailable. Please contact support.'));};
        const script=document.createElement('script');
        script.src='https://maps.googleapis.com/maps/api/js?'+new URLSearchParams({key:cfg.browser_key,loading:'async',libraries:'places,geocoding',callback:'pmPickupMapsReady',region:'MY',language:localStorage.getItem('pasarmalam-lang')||'ms',v:'weekly'});
        script.onerror=()=>{clearTimeout(timer);reject(new Error('Address search could not load. Please reload.'));};
        document.head.append(script);
      });
      return google.maps;
    })();
    try{return await loading;}catch(e){loading=null;throw e;}
  }
  function apply(text,point,expected){
    if(expected!==revision)return;
    address.value=text;el('lat').value=point.lat();el('lng').value=point.lng();el('confirmed').checked=true;say('');
  }
  async function resolve(request,expected){
    const g=await maps(),result=await new g.Geocoder().geocode(request);
    const matches=result.results.filter(r=>r.address_components.some(c=>c.types.includes('country')&&c.short_name==='MY'));
    if(!matches.length||matches[0].partial_match||(!request.location&&matches.length!==1))throw new Error('Select a matching Malaysian address from the suggestions.');
    apply(matches[0].formatted_address,matches[0].geometry.location,expected);
  }
  maps().then(async g=>{
    const {PlaceAutocompleteElement}=await g.importLibrary('places');
    widget=new PlaceAutocompleteElement({includedRegionCodes:['my']});
    const language=()=>{const lang=localStorage.getItem('pasarmalam-lang')||'ms';widget.requestedLanguage=lang;widget.placeholder={ms:'Cari alamat di Malaysia',en:'Search Malaysian addresses',zh:'搜索马来西亚地址'}[lang]||'Search Malaysian addresses';};
    language();new MutationObserver(language).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    widget.addEventListener('input',()=>{if(selecting&&String(widget.value||'')===selected)return;invalidate();address.value=String(widget.value||'');say('Select an address from the suggestions.');});
    widget.addEventListener('gmp-select',async({placePrediction})=>{
      invalidate();const expected=revision;selecting=true;selected=String(widget.value||'');say('Confirming address...');
      try{const place=placePrediction.toPlace();await place.fetchFields({fields:['formattedAddress','location','addressComponents']});
        if(!place.location||!place.addressComponents.some(c=>c.types.includes('country')&&c.shortText==='MY'))throw new Error('Choose an address in Malaysia.');
        apply(place.formattedAddress,place.location,expected);
      }catch(e){if(expected===revision)say(e.message);}finally{selecting=false;}
    });
    widget.addEventListener('gmp-error',()=>say('Address search is unavailable. Enter the full address and try Save.'));
    el('pickupSearch').append(widget);
  }).catch(e=>say(e.message));
  el('locate').onclick=()=>{
    invalidate();const expected=revision;
    if(!navigator.geolocation)return say('Location unavailable.');
    say('Finding location...');
    navigator.geolocation.getCurrentPosition(async p=>{
      try{await resolve({location:{lat:p.coords.latitude,lng:p.coords.longitude}},expected);}catch(e){if(expected===revision)say(e.message);}
    },()=>{if(expected===revision)say('Location access denied. Search for your address instead.');},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  };
  // Resolve edited addresses before allowing the existing pickup save handler to run.
  el('pickupForm').addEventListener('submit',async event=>{
    if(el('lat').value&&el('lng').value){
      el('confirmed').checked=true;
      return;
    }
    event.preventDefault();event.stopImmediatePropagation();
    const expected=revision;el('savePickup').disabled=true;say('Confirming address...');
    try{await resolve({address:address.value.trim(),componentRestrictions:{country:'MY'}},expected);
      if(expected===revision){el('savePickup').disabled=false;el('pickupForm').requestSubmit();}
    }catch(e){if(expected===revision)say(e.message);}finally{el('savePickup').disabled=false;}
  },true);
})();
