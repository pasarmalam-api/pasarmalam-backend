const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('landing-site-v2/buyer/checkout-payment-methods.js', 'utf8');
function run(mode, value = 'Billplz') {
  const listeners = {};
  const option = {textContent: 'Billplz FPX'};
  let note;
  const field = {
    value,
    querySelector: () => option,
    setAttribute() {},
    closest: () => ({append: item => { note = item; }}),
    addEventListener: (name, fn) => { listeners[name] = fn; }
  };
  vm.runInNewContext(source, {
    checkoutProduct: {selling_mode: mode},
    document: {getElementById: () => field, createElement: () => ({setAttribute() {}})},
    window: {addEventListener: (name, fn) => { listeners[name] = fn; }}
  });
  return {field, option, listeners, get note() { return note; }};
}
const retail = run('retail');
assert.equal(retail.option.textContent, 'Online payment - Billplz');
assert.equal(retail.field.value, 'Billplz');
assert.match(retail.note.textContent, /depends on Billplz activation/);
for (const mode of ['bulk', 'factory']) {
  const result = run(mode, 'Bank Transfer');
  assert.match(result.note.textContent, /TANITOOLUWA VENTURES Public Bank only/);
  assert.equal(result.field.value, 'Bank Transfer');
}
retail.field.value = 'Cash Pickup';
retail.listeners.change();
assert.match(retail.note.textContent, /does not use Billplz/);
assert.match(run('retail', 'Pay on Arrival').note.textContent, /does not use Billplz/);
const html = fs.readFileSync('landing-site-v2/buyer/checkout.html', 'utf8');
assert.ok(html.indexOf('checkout-bank-transfer.js') < html.indexOf('checkout-payment-methods.js'));
console.log('Checkout payment presentation checks passed.');
