(() => {
  const baseApi = api;
  api = async function(path, options = {}) {
    if (path === '/api/payments/billplz/create' && payment.value === 'Bank Transfer') {
      const order = await baseApi('/api/checkout', options);
      return {...order, order_id: order.id, bill_code: order.payment_reference,
        checkout_url: 'bank-transfer.html?id=' + encodeURIComponent(order.id)};
    }
    return baseApi(path, options);
  };
  const update = () => {
    if (!checkoutProduct || !['bulk', 'factory'].includes(checkoutProduct.selling_mode)) return;
    if (!payment.querySelector('option[value="Bank Transfer"]')) {
      payment.add(new Option('Public Bank transfer (bulk / factory orders)', 'Bank Transfer'));
    }
    for (const option of payment.options) option.disabled = option.value !== 'Bank Transfer';
    payment.value = 'Bank Transfer';
    payment.dispatchEvent(new Event('change'));
  };
  window.addEventListener('pm-checkout-loaded', update);
  update();
  const baseLabel = window.pmCheckoutButtonLabel;
  window.pmCheckoutButtonLabel = () => payment.value === 'Bank Transfer'
    ? (checkoutProduct?.selling_mode === 'factory' ? 'Place factory order - bank transfer' : 'Place order - bank transfer') : baseLabel();
})();
