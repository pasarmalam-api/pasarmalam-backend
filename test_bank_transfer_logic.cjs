const vm = require('vm'), fs = require('fs'), assert = require('assert');
async function check(mode) {
  const calls = [], options = ['Billplz', 'Cash Pickup', 'Pay on Arrival'].map(value => ({value, disabled: false}));
  const payment = {value: 'Billplz', options, dispatchEvent() {}, querySelector: () => options.find(option => option.value === 'Bank Transfer'), add: option => options.push(option)};
  const context = vm.createContext({payment, checkoutProduct: {selling_mode: mode},
    Option: function(text, value) {this.text = text; this.value = value;},
    encodeURIComponent, Event: function(type) {this.type = type;}, window: {addEventListener() {}, pmCheckoutButtonLabel: () => 'Pay Now'},
    api: async (path, options) => {calls.push({path, options}); return {id: 91, total: 1000, payment_reference: 'PM-BULK-91-ABCDEF'};}});
  vm.runInContext(fs.readFileSync('landing-site-v2/buyer/checkout-bank-transfer.js', 'utf8'), context);
  assert.equal(options.length, mode === 'bulk' ? 4 : 3);
  if (mode !== 'bulk') return;
  assert.equal(payment.value, 'Bank Transfer');
  assert(options.filter(option => option.value !== 'Bank Transfer').every(option => option.disabled));
  const payload = {body: JSON.stringify({product_id: 1, quantity: 10, payment_method: 'Bank Transfer'})};
  const result = await context.api('/api/payments/billplz/create', payload);
  assert.equal(calls[0].path, '/api/checkout');
  assert.equal(calls[0].options, payload);
  assert.equal(result.order_id, 91);
  assert.equal(result.checkout_url, 'bank-transfer.html?id=91');
  assert.equal(context.window.pmCheckoutButtonLabel(), 'Place order - bank transfer');
  payment.value = 'Billplz';
  await context.api('/api/payments/billplz/create', payload);
  assert.equal(calls[1].path, '/api/payments/billplz/create');
  assert.equal(context.window.pmCheckoutButtonLabel(), 'Pay Now');
}
Promise.all([check('bulk'), check('retail')]).then(() => console.log('Bulk transfer routing and retail gateway isolation passed'))
  .catch(error => {console.error(error); process.exitCode = 1;});
