const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('landing-site-v2/buyer/checkout-delivery.js', 'utf8');
const start = source.indexOf('  function updateCod() {');
const end = source.indexOf('  function vehicles() {', start);
assert.ok(start > 0 && end > start);
function scenario(mode, courier, eligible, valid = true) {
  const option = {};
  const note = {};
  const payment = {value: 'Pay on Arrival', querySelector: () => option, dispatchEvent() {}};
  const context = {payment, checkoutProduct: {selling_mode: mode}, shipping: {value: courier},
    valid: () => valid, quote: {cod: {eligible, reason: eligible ? 'Eligible' : 'Not eligible'}},
    get: () => note, t: (ms, en) => en, Event: class {}};
  vm.runInNewContext(source.slice(start, end) + '\nupdateCod();', context);
  return {option, note, payment};
}
assert.equal(scenario('retail', 'PM Express', true).option.disabled, false);
for (const args of [['bulk', 'PM Express', true], ['factory', 'PM Express', true],
                    ['retail', 'EasyParcel', true], ['retail', 'PM Express', false],
                    ['retail', 'PM Express', true, false]]) {
  const result = scenario(...args);
  assert.equal(result.option.disabled, true);
  assert.equal(result.payment.value, 'Billplz');
}
assert.equal(scenario('bulk', 'PM Express', true).note.hidden, true);
assert.match(source, /quote\?\.cod\?\.eligible !== true/);
console.log('COD checkout eligibility, prepaid restrictions and stale-quote checks passed.');
