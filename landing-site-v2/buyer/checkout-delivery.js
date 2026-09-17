/* The server owns prices; a quote is invalidated whenever its route changes. */
(() => {
  const get = id => document.getElementById(id);
  const english = localStorage.getItem('pasarmalam-lang') === 'en';
  const t = (ms, en) => english ? en : ms;
  const shipping = get('shipping'), address = get('address'), pay = get('pay');
  const payment = get('payment');
  payment.replaceChildren(
    new Option(t('Perbankan dalam talian (Billplz FPX)', 'Online banking (Billplz FPX)'), 'Billplz'),
    new Option(t('Tunai semasa ambil sendiri', 'Cash on self pickup'), 'Cash Pickup')
  );
  payment.value = 'Billplz';
  shipping.replaceChildren(...[
    ['Ambil Sendiri', t('Ambil sendiri', 'Self pickup')],
    ['Lalamove Segera', t('Ekspres - pengambilan segera', 'Express - immediate pickup')],
    ['Lalamove Biasa', t('Standard - pengambilan berjadual', 'Standard - scheduled pickup')]
  ].map(([value, label]) => new Option(label, value)));
  shipping.value = 'Lalamove Segera';
  shipping.removeAttribute('onchange');
  const choices = document.createElement('fieldset');
  choices.className = 'delivery-choices';
  choices.innerHTML = `<legend>${t('Pilihan penghantaran', 'Delivery option')}</legend>`;
  for (const option of shipping.options) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = 'deliveryChoice'; radio.value = option.value;
    radio.checked = option.value === shipping.value;
    radio.addEventListener('change', () => { shipping.value = radio.value; shipping.dispatchEvent(new Event('change')); });
    const name = document.createElement('span'); name.textContent = option.textContent;
    label.append(radio, name); choices.append(label);
  }
  shipping.hidden = true;
  shipping.closest('.row').before(choices);
  const box = document.createElement('div');
  box.id = 'deliveryControls';
  box.innerHTML = `
    <h3>${t('Lokasi penerima', 'Recipient location')}</h3>
    <button type="button" class="soft" id="deliveryLocate">${t('Gunakan lokasi semasa', 'Use current location')}</button>
    <p id="deliveryLocationStatus" role="status" class="muted"></p>
    <details id="deliveryLocationDetails"><summary>${t('Tetapkan lokasi lain', 'Set another location')}</summary>
    <div class="row"><label>${t('Latitud', 'Latitude')}<input id="deliveryLat" type="number" step="any" min="-90" max="90"></label>
    <label>${t('Longitud', 'Longitude')}<input id="deliveryLng" type="number" step="any" min="-180" max="180"></label></div>
    </details>
    <label class="delivery-check"><input id="deliveryConfirmed" type="checkbox">
    ${t('Lokasi ini ialah alamat penerima.', 'This location matches the recipient address.')}</label>
    <details id="deliveryOptions"><summary>${t('Kawasan & kenderaan', 'Area & vehicle')}</summary>
    <div class="row"><label>${t('Kawasan', 'Area')}<select id="deliveryCity"></select></label>
    <label>${t('Kenderaan', 'Vehicle')}<select id="deliveryVehicle"></select></label></div>
    </details>
    <label class="delivery-check"><input id="deliveryPackage" type="checkbox">
    <span>${t('Bungkusan muat dalam kenderaan', 'Package fits the vehicle')} <span id="deliveryCapacity" class="muted"></span></span></label>
    <label id="deliveryScheduleLabel">${t('Masa pengambilan', 'Pickup time')}<input id="deliverySchedule" type="datetime-local"></label>
    <button type="button" class="soft" id="deliveryQuote">${t('Dapatkan caj penghantaran', 'Get delivery charge')}</button>
    <p id="deliveryStatus" role="status" class="muted"></p>`;
  choices.after(box);
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
    for (const radio of choices.querySelectorAll('input')) radio.checked = radio.value === shipping.value;
    get('deliveryScheduleLabel').hidden = shipping.value !== 'Lalamove Biasa';
    const cash = get('payment').querySelector('option[value="Cash Pickup"]');
    cash.disabled = !isPickup();
    cash.hidden = !isPickup();
    if (cash.disabled && payment.value === 'Cash Pickup') payment.value = 'Billplz';
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
    get('deliveryCapacity').textContent = service ? `(${service.key.replaceAll('_', ' ')}: ${service.load?.value || '?'} ${service.load?.unit || ''}${dims ? ' | ' + dims : ''})` : '';
    get('deliveryPackage').checked = false; reset();
  }
  shipping.addEventListener('change', reset);
  for (const id of ['address','deliveryLat','deliveryLng','buyerPhone']) get(id).addEventListener('input', () => {
    if (id !== 'buyerPhone') get('deliveryConfirmed').checked = false;
    if (id === 'address') get('deliveryLocationStatus').textContent = t('Sahkan semula lokasi penerima.', 'Confirm the recipient location again.');
    reset();
  });
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
      get('deliveryLocationStatus').textContent = t('Lokasi semasa dipilih. Sahkan alamat penerima di bawah.', 'Current location selected. Confirm it matches the recipient address below.');
    }, () => {
      get('deliveryLocationDetails').open = true;
      status(t('Lokasi tidak dibenarkan. Tetapkan lokasi penerima secara manual.', 'Location denied. Set the recipient location manually.'));
    },
    {enableHighAccuracy: true, timeout: 15000, maximumAge: 0});
  };
  get('deliveryQuote').onclick = async () => {
    if (requesting) return;
    requesting = true; get('deliveryQuote').disabled = true;
    const version = revision;
    try {
      if (!checkoutProduct || !checkoutItem) throw new Error(t('Pilih produk dahulu.', 'Select a product first.'));
      const route = fields();
      if (!route.coordinates.lat || !route.coordinates.lng) {
        get('deliveryLocationDetails').open = true;
        throw new Error(t('Pilih lokasi penerima dahulu.', 'Choose the recipient location first.'));
      }
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
