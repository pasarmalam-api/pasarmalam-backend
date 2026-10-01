(() => {
  const el=id=>document.getElementById(id);
  const t=(ms,en)=>window.pmBuyerText?window.pmBuyerText(ms,en):en;
  const regions=['Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Pulau Pinang','Perak','Perlis','Selangor','Terengganu','Sabah','Sarawak','Kuala Lumpur','Labuan','Putrajaya'];
  el('addressState').append(new Option('Select state',''),...regions.map(r=>new Option(r,r)));
  el('addressPostcode').addEventListener('input',()=>{
    el('addressPostcode').value=el('addressPostcode').value.replace(/[^0-9]/g,'').slice(0,5);
  });
  window.pmRegistrationAddress=()=>{
    const fields={street:el('address').value.trim(),unit:el('addressUnit').value.trim(),postcode:el('addressPostcode').value.trim(),city:el('addressCity').value.trim(),state:el('addressState').value};
    function fail(id,message){el(id).focus();throw new Error(message);}
    if(fields.street.length<4)fail('address',t('Masukkan nama jalan atau bangunan dan nombor rumah jika berkenaan.','Enter the street or building and house number where applicable.'));
    if(!/^[0-9]{5}$/.test(fields.postcode))fail('addressPostcode',t('Masukkan poskod 5 digit.','Enter a five-digit postcode.'));
    if(fields.city.length<2||!/[\p{L}]/u.test(fields.city))fail('addressCity',t('Masukkan bandar.','Enter the city.'));
    if(!regions.includes(fields.state))fail('addressState',t('Pilih negeri.','Select the state.'));
    return {address_fields:fields,address:[fields.unit,fields.street,fields.postcode+' '+fields.city,fields.state,'Malaysia'].filter(Boolean).join(', ')};
  };
})();
