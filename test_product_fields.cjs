const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const elements = {};
for (const id of ['weight', 'weightUnit', 'weightEquivalent', 'storageClass']) {
  elements[id] = {value: '', textContent: '', events: {}, addEventListener(name, fn) {this.events[name] = fn;}};
}
elements.weightUnit.value = 'g';
elements.storageClass.value = 'unknown';
const context = {window: {}, document: {getElementById: id => elements[id]}};
vm.runInNewContext(fs.readFileSync('landing-site-v2/seller/product-fields.js', 'utf8'), context);
const fields = context.window.PMProductFields;
assert.equal(fields.kilograms('350', 'g'), .35);
assert.equal(fields.kilograms('1.25', 'kg'), 1.25);
for (const value of ['', '0', '-2', 'NaN', 'Infinity']) assert.throws(() => fields.kilograms(value, 'kg'));
fields.load({weight_kg: .35, storage_class: 'canned_drink'});
assert.equal(Number(elements.weight.value), 350);
// Browser inputs stringify assigned values.
elements.weight.value = String(elements.weight.value);
elements.weightUnit.value = 'kg';
elements.weightUnit.events.change();
assert.equal(Number(elements.weight.value), .35);
elements.weight.value = '1.25';
elements.weight.events.input();
assert.equal(elements.weightEquivalent.textContent, '1250 g');
assert.equal(fields.read().weight_kg, 1.25);
assert.equal(fields.read().storage_class, 'canned_drink');
elements.weightUnit.value = 'g';
elements.weightUnit.events.change();
assert.equal(Number(elements.weight.value), 1250);
console.log('PASS kg/g conversion, decimal entry, saved weights, storage and invalid input');
