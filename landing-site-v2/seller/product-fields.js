(function () {
  'use strict';
  const weight = document.getElementById('weight');
  const unit = document.getElementById('weightUnit');
  const equivalent = document.getElementById('weightEquivalent');
  const storage = document.getElementById('storageClass');
  function kilograms(value, selectedUnit) {
    const number = Number(value);
    if (!String(value).trim() || !Number.isFinite(number) || number <= 0) {
      throw new Error('Enter a packed weight greater than zero.');
    }
    return selectedUnit === 'kg' ? number : number / 1000;
  }
  let previousUnit = unit.value;
  function update() {
    try {
      const kg = kilograms(weight.value, unit.value);
      equivalent.textContent = unit.value === 'kg'
        ? Number((kg * 1000).toFixed(6)) + ' g'
        : Number(kg.toFixed(9)) + ' kg';
    } catch (_) { equivalent.textContent = ''; }
  }
  weight.addEventListener('input', update);
  unit.addEventListener('change', () => {
    if (weight.value.trim() && Number(weight.value) > 0 && Number.isFinite(Number(weight.value))) {
      const kg = kilograms(weight.value, previousUnit);
      weight.value = Number((unit.value === 'kg' ? kg : kg * 1000).toFixed(9));
    }
    previousUnit = unit.value;
    update();
  });
  window.PMProductFields = {
    kilograms,
    read() {
      return {weight_kg: kilograms(weight.value, unit.value), storage_class: storage.value};
    },
    load(product) {
      unit.value = previousUnit = 'g';
      weight.value = Number((Number(product.weight_kg) * 1000).toFixed(6));
      storage.value = product.storage_class || 'unknown';
      update();
    }
  };
})();
