const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('landing-site-v2/buyer/checkout-address.js', 'utf8');
const delivery = fs.readFileSync('landing-site-v2/buyer/checkout-delivery.js', 'utf8');
const fields = Object.fromEntries(['addressPostcode','addressCity','addressState','buyerPhone','shipping'].map(id => [id, {value:''}]));
const address = {value:''};
let invalidations = 0;
const context = vm.createContext({
  window: {}, address, el: id => fields[id], t: (ms,en) => en,
  regions: ['Selangor','Kuala Lumpur','Johor','Pulau Pinang'],
  invalidate: () => invalidations++, base: ''
});
// Exercise the actual closure functions without loading Maps or creating an order.
vm.runInContext(source.slice(source.indexOf('  function validateAddress(){'), source.indexOf("  const editor=document.createElement")), context);
fields.buyerPhone.value = '01123456789';
fields.shipping.value = 'EasyParcel';
address.value = 'Unit 8, 12 Jalan Baru, 63000 Cyberjaya, Selangor';
assert.equal(context.validateAddress(), true, 'Full typed address needs no duplicate city/postcode fields');
context.completeAddress();
assert.equal(address.value, 'Unit 8, 12 Jalan Baru, 63000 Cyberjaya, Selangor', 'Never truncate address after postcode');
assert.equal(invalidations, 0, 'Unchanged address preserves quotation and location');
address.value = '12 Jalan Baru';
assert.throws(() => context.validateAddress(), /postcode/);
fields.addressPostcode.value = '63000';
fields.addressCity.value = 'Cyberjaya';
fields.addressState.value = 'Selangor';
context.completeAddress();
assert.equal(context.validateAddress(), true, 'Optional structured fields can complete a parcel address');
assert.equal(invalidations, 1);
address.value = '12 Jalan Baru, 63000 Cyberjaya';
assert.throws(() => context.validateAddress(), /state/);
address.value = '12 Jalan Baru, 10000 Penang';
assert.equal(context.validateAddress(), true);
fields.shipping.value = 'PM Express';
address.value = 'KLCC entrance, Jalan Ampang';
assert.equal(context.validateAddress(), true, 'Rider addresses do not require separate postal fields');
address.value = '';
assert.throws(() => context.validateAddress(), /delivery address/);
fields.shipping.value = 'Ambil Sendiri';
assert.equal(context.validateAddress(), true, 'Pickup has no delivery-address requirement in address editor');
fields.buyerPhone.value = '';
assert.throws(() => context.validateAddress(), /phone/);
const changeAction = source.slice(source.indexOf("  el('changeAddress').onclick"), source.indexOf('  const searchButton='));
assert.doesNotMatch(changeAction, /maps\(|invalidate\(/, 'Editing must not load Maps or invalidate an unchanged quote');
const saveAction = source.slice(source.indexOf("  el('saveDefaultAddress').onclick"), source.indexOf('  // Replace the coordinates-only'));
assert.doesNotMatch(saveAction, /await window.pmResolveDeliveryAddress/, 'Saving manual address must not require Google');
assert.doesNotMatch(delivery, /\|\|window.pmAddressEditing/, 'Open editor must not disable payment or quote loading');
assert.match(delivery, /!ready\|\|!valid\(\)/, 'Payment still requires a valid server quotation');
assert.match(delivery, /quote_id: quote.quote_id/, 'Checkout still submits the priced delivery quotation');
assert.match(delivery, /delete data.logistics_fee/, 'Client may not set delivery prices');
assert.match(delivery, /location_confirmed/, 'Rider route confirmation remains intact');
console.log('PASS: simple address, manual save, no confirmation gate, delivery quote protection');
