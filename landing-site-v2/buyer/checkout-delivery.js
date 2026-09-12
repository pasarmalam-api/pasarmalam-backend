/* The server owns prices; a quote is invalidated whenever its route changes. */
(() => {
  const get = id => document.getElementById(id);
  const english = localStorage.getItem('pasarmalam-lang') === 'en';
  const t = (ms, en) => english ? en : ms;
  const shipping = get('shipping'), address = get('address'), pay = get('pay');
  shipping.replaceChildren(...[
    ['Ambil Sendiri', t('Ambil sendiri', 'Self pickup')],
    ['Lalamove Segera', t('Ekspres - pengambilan segera', 'Express - immediate pickup')],
    ['Lalamove Biasa', t('Standard - pengambilan berjadual', 'Standard - scheduled pickup')]
  ].map(([value, label]) => new Option(label, value)));
  shipping.value = 'Lalamove Segera';
  shipping.removeAttribute('onchange');
  const box = document.createElement('div');
  box.id = 'deliveryControls';
  box.innerHTML = `
    <h3>${t('Lokasi penghantaran', 'Delivery location')}</h3>
    <button type="button" class="soft" id="deliveryLocate">${t('Gunakan lokasi semasa', 'Use current location')}</button>
    <div class="row"><label>${t('Latitud', 'Latitude')}<input id="deliveryLat" type="number" step="any" min="-90" max="90"></label>
    <label>${t('Longitud', 'Longitude')}<input id="deliveryLng" type="number" step="any" min="-180" max="180"></label></div>
    <label style="display:block;margin:12px 0"><input id="deliveryConfirmed" type="checkbox" style="width:auto">
    ${t('Saya sahkan koordinat sepadan dengan alamat penghantaran.', 'I confirm these coordinates match the delivery address.')}</label>
    <div class="row"><label>${t('Kawasan', 'Area')}<select id="deliveryCity"></select></label>
    <label>${t('Kenderaan', 'Vehicle')}<select id="deliveryVehicle"></select></label></div>
    <p id="deliveryCapacity" class="muted"></p>
    <label style="display:block;margin:12px 0"><input id="deliveryPackage" type="checkbox" style="width:auto">
    ${t('Bungkusan muat dalam had kenderaan ini.', 'The package fits within this vehicle capacity.')}</label>
    <label id="deliveryScheduleLabel">${t('Masa pengambilan', 'Pickup time')}<input id="deliverySchedule" type="datetime-local"></label>
    <button type="button" class="soft" id="deliveryQuote">${t('Dapatkan caj penghantaran', 'Get delivery charge')}</button>
    <p id="deliveryStatus" role="status" class="muted"></p>`;
  shipping.closest('.row').after(box);
  let cities = [], quote = null, revision = 0, requesting = false;
  const baseApi = api, baseReady = requireCheckoutReady;
  const isPickup = () => shipping.value === 'Ambil Sendiri';
  const status = text => { get('deliveryStatus').textContent = text; };
  const valid = () => isPickup() || (quote && quote.expires_at * 1000 > Date.now());
  window.pmDeliveryFee = () => isPickup() ? 0 : valid() ? Number(quote.fee) : NaN;
  window.pmDeliveryAdminFee = () => isPickup() ? 0 : valid() ? Number(quote.admin_fee || 0) : NaN;
  window.pmDeliveryCourierFee = () => isPickup() ? 0 : valid() ? Number(quote.courier_fee ?? quote.fee) : NaN;
  function fields() {
    return {fee_version: 1, coordinates: {lat: get('deliveryLat').value, lng: get('deliveryLng').value},
      city: get('deliveryCity').value, service_type: get('deliveryVehicle').value,
      location_confirmed: get('deliveryConfirmed').checked, package_confirmed: get('deliveryPackage').checked,
      schedule_at: shipping.value === 'Lalamove Biasa' && get('deliverySchedule').value
        ? new Date(get('deliverySchedule').value).toISOString() : ''};
  }
  function reset() {
    revision++; quote = null;
    box.hidden = isPickup();
    get('deliveryScheduleLabel').hidden = shipping.value !== 'Lalamove Biasa';
    const cash = get('payment').querySelector('option[value="Cash Pickup"]');
    cash.disabled = !isPickup();
    if (cash.disabled && get('payment').value === 'Cash Pickup') get('payment').value = '';
    status(''); renderSummary();
  }
  function vehicles() {
    const services = cities.find(c => c.locode === get('deliveryCity').value)?.services || [];
    get('deliveryVehicle').replaceChildren(...services.map(s => new Option(s.key.replaceAll('_', ' '), s.key)));
    if (services.some(s => s.key === 'MOTORCYCLE')) get('deliveryVehicle').value = 'MOTORCYCLE';
    capacity();
  }
  function capacity() {
    const service = cities.find(c => c.locode === get('deliveryCity').value)?.services.find(s => s.key === get('deliveryVehicle').value);
    const dims = Object.values(service?.dimensions || {}).map(d => `${d.value} ${d.unit}`).join(' x ');
    get('deliveryCapacity').textContent = service ? `${service.load?.value || '?'} ${service.load?.unit || ''}${dims ? ' | ' + dims : ''}` : '';
    get('deliveryPackage').checked = false; reset();
  }
  shipping.addEventListener('change', reset);
  for (const id of ['address','deliveryLat','deliveryLng']) get(id).addEventListener('input', () => { get('deliveryConfirmed').checked = false; reset(); });
  for (const id of ['deliveryConfirmed','deliveryPackage','deliverySchedule']) get(id).addEventListener('change', reset);
  get('deliveryCity').addEventListener('change', vehicles);
  get('deliveryVehicle').addEventListener('change', capacity);
  get('deliveryLocate').onclick = () => {
    if (!navigator.geolocation) return status(t('Lokasi tidak tersedia.', 'Location is unavailable.'));
    status(t('Mencari lokasi...', 'Locating...'));
    navigator.geolocation.getCurrentPosition(pos => {
      get('deliveryLat').value = pos.coords.latitude.toFixed(6);
      get('deliveryLng').value = pos.coords.longitude.toFixed(6);
      get('deliveryConfirmed').checked = false; reset();
    }, () => status(t('Lokasi tidak dibenarkan. Masukkan koordinat alamat.', 'Location denied. Enter the address coordinates.')),
    {enableHighAccuracy: true, timeout: 15000, maximumAge: 0});
  };
  get('deliveryQuote').onclick = async () => {
    if (requesting) return;
    requesting = true; get('deliveryQuote').disabled = true;
    const version = revision;
    try {
      if (!checkoutProduct || !checkoutItem) throw new Error(t('Pilih produk dahulu.', 'Select a product first.'));
      const route = fields();
      if (!address.value.trim() || !route.location_confirmed || !route.package_confirmed)
        throw new Error(t('Sahkan alamat, koordinat dan saiz bungkusan.', 'Confirm the address, coordinates and package size.'));
      status(t('Mendapatkan sebut harga...', 'Getting quotation...'));
      const response = await baseApi('/api/delivery/quotation', {method: 'POST', body: JSON.stringify({
        product_id: checkoutItem.product_id, quantity: checkoutItem.quantity, variant: checkoutItem.variant || '',
        address: address.value.trim(), buyer_phone: get('buyerPhone').value.trim(), logistics_method: shipping.value, ...route})});
      if (version !== revision) return;
      quote = response;
      get('result').textContent = '';
      status(`${money(quote.fee)} | ${t('Sah sehingga', 'Valid until')} ${new Date(quote.expires_at*1000).toLocaleTimeString()}`);
      renderSummary();
    } catch (e) { if (version === revision) { quote = null; status(e.message); renderSummary(); } }
    finally { requesting = false; get('deliveryQuote').disabled = false; }
  };
  requireCheckoutReady = function() {
    baseReady();
    if (!valid()) throw new Error(t('Dapatkan sebut harga penghantaran baharu.', 'Get a fresh delivery quotation.'));
    if (!isPickup() && get('payment').value === 'Cash Pickup') throw new Error('Cash is for self pickup only.');
  };
  api = async function(path, options = {}) {
    if (['/api/checkout','/api/payments/billplz/create','/api/payments/toyyibpay/create'].includes(path)) {
      requireCheckoutReady();
      const data = JSON.parse(options.body);
      delete data.logistics_fee;
      delete data.logistics_admin_fee;
      if (!isPickup()) Object.assign(data, fields(), {quote_id: quote.quote_id});
      options = {...options, body: JSON.stringify(data)};
    }
    return baseApi(path, options);
  };
  setInterval(() => {
    if (quote && !valid()) { quote = null; status(t('Sebutharga tamat. Dapatkan caj baharu.', 'Quote expired. Request a new delivery charge.')); renderSummary(); }
  }, 1000);
  reset();
  if (token()) baseApi('/api/delivery/services').then(data => {
    cities = data.cities || [];
    get('deliveryCity').replaceChildren(...cities.map(c => new Option(c.name, c.locode)));
    if (cities.some(c => c.locode === 'MY KUL')) get('deliveryCity').value = 'MY KUL';
    vehicles();
  }).catch(e => status(e.message));
})();
