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
    if (!checkoutProduct || checkoutProduct.selling_mode !== 'bulk') return;
    if (!payment.querySelector('option[value="Bank Transfer"]')) {
      payment.add(new Option('Public Bank transfer (bulk orders)', 'Bank Transfer'));
    }
  };
  window.addEventListener('pm-checkout-loaded', update);
  update();
  const baseLabel = window.pmCheckoutButtonLabel;
  window.pmCheckoutButtonLabel = () => payment.value === 'Bank Transfer'
    ? 'Place order - bank transfer' : baseLabel();
})();
