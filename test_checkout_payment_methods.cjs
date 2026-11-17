const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('landing-site-v2/buyer/checkout-payment-methods.js', 'utf8');
function run(mode, value = 'Billplz', options = {}) {
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
    document: {documentElement:{lang:options.language || 'en'},getElementById: () => field, createElement: () => ({setAttribute() {}})},
    API_BASE:'https://payments.test',
    fetch:options.availability ? async () => ({ok:true,json:async()=>({online:options.availability})}) : undefined,
    window: {addEventListener: (name, fn) => { listeners[name] = fn; }}
  });
  return {field, option, listeners, get note() { return note; }};
}
const retail = run('retail');
assert.equal(retail.option.textContent, 'Secure payment - Billplz');
assert.equal(retail.field.value, 'Billplz');
assert.match(retail.note.textContent, /available method on the secure Billplz/);
assert.doesNotMatch(retail.option.textContent, /Visa|Mastercard/);
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
(async()=>{
  const active=run('retail','Billplz',{availability:{available:true,card:true}});
  const inactive=run('retail','Billplz',{availability:{available:true,card:false}});
  const unavailable=run('retail','Billplz',{availability:{available:false,card:false}});
  const bulk=run('bulk','Bank Transfer',{availability:{available:true,card:true}});
  const malay=run('retail','Billplz',{language:'ms',availability:{available:true,card:true}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(active.option.textContent,/Visa \/ Mastercard/);
  assert.match(active.note.textContent,/Enter card details only there/);
  assert.doesNotMatch(inactive.option.textContent,/Visa|Mastercard/);
  assert.equal(unavailable.option.disabled,true);
  assert.equal(unavailable.field.value,'');
  assert.equal(bulk.field.value,'Bank Transfer');
  assert.equal(bulk.option.disabled,true);
  assert.match(malay.note.textContent,/Masukkan butiran kad/);
  console.log('PASS: capability-based FPX/cards, unavailable states, translated notes and mandatory bank transfers.');
})().catch(error=>{console.error(error);process.exitCode=1});
