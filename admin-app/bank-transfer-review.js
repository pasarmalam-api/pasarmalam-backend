(() => {
  const baseActions = paymentActions, baseReview = reviewPayment;
  paymentActions = (payment, canReview) => {
    if (payment.payment_method !== 'Bank Transfer') return baseActions(payment, canReview);
    const closed = payment.payment_status === 'paid' || ['cancelled', 'completed'].includes(payment.order_status);
    if (closed) return '<span>Reviewed</span>';
    return `<button class="soft" onclick="reviewBankDeposit(${Number(payment.order_id)})">Confirm Bank Deposit</button>
      <button class="danger" onclick="reviewPayment(${Number(payment.order_id)},'rejected')">Reject</button>
      <button class="danger" onclick="cancelPendingPayment(${Number(payment.order_id)})">Cancel / Expire</button>`;
  };
  window.reviewBankDeposit = async orderId => {
    const reference = prompt('After checking Public Bank, enter the received transaction reference.');
    if (!reference || !reference.trim()) return;
    if (!confirm('Confirm you verified the exact order amount was received in Public Bank. This releases the order for fulfilment.')) return;
    try {
      await api('/api/admin/payment-status', {method: 'POST', body: JSON.stringify({order_id: orderId,
        payment_status: 'paid', bank_confirmed: true, settlement_reference: reference.trim()})});
      await loadPayments();
    } catch (error) { alert(error.message); }
  };
  reviewPayment = async (orderId, status) => {
    if (paymentRows.find(row => Number(row.order_id) === orderId)?.payment_method !== 'Bank Transfer') return baseReview(orderId, status);
    const note = prompt('Reason the deposit could not be confirmed');
    if (!note) return;
    try {
      await api('/api/admin/payment-status', {method: 'POST', body: JSON.stringify({order_id: orderId, payment_status: status, note})});
      await loadPayments();
    } catch (error) { alert(error.message); }
  };
})();
