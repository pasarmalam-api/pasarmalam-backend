(function(root) {
  const types = {
    retail: {name: 'Retail', minimum: 1},
    bulk: {name: 'Bulk / Wholesale', minimum: 10, commission: 5},
    factory: {name: 'Factory Direct', minimum: 500, commission: 3}
  };
  function minimum(product) {
    return Math.max(types[product.selling_mode]?.minimum || 1, Number(product.minimum_order) || 1);
  }
  function badge(product) {
    if (!['bulk', 'factory'].includes(product.selling_mode)) return '';
    return `<p class="tag selling-type"><strong>${types[product.selling_mode].name}</strong> | MOQ ${minimum(product)} units | Price per unit</p>`;
  }
  function photoBadge(product) {
    return product?.selling_mode === 'factory' ? '<span class="factory-photo-label">Factory Sales</span>' : '';
  }
  function labelPhoto(container, product) {
    container.classList.add('selling-photo');
    container.querySelectorAll('.factory-photo-label').forEach(label => label.remove());
    if (product?.selling_mode === 'factory') {
      const label = document.createElement('span');
      label.className = 'factory-photo-label';
      label.textContent = 'Factory Sales';
      container.appendChild(label);
    }
  }
  function editor(mode, input, reset = true) {
    const floor = types[mode]?.minimum || 1;
    input.disabled = mode === 'retail';
    input.min = floor;
    input.value = mode === 'retail' ? 1 : reset ? floor : Math.max(floor, Number(input.value) || floor);
  }
  root.PMSelling = {types, minimum, badge, photoBadge, labelPhoto, editor};
  if (typeof module === 'object' && module.exports) module.exports = root.PMSelling;
})(typeof window === 'object' ? window : globalThis);
