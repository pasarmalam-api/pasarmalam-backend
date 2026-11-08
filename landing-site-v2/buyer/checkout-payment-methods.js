(() => {
  const field = document.getElementById('payment');
  if (!field) return;
  const online = field.querySelector('option[value="Billplz"]');
  if (online) online.textContent = 'Online payment - Billplz';
  const note = document.createElement('p');
  note.id = 'paymentAvailability';
  note.className = 'muted';
  note.setAttribute('role', 'status');
  field.setAttribute('aria-describedby', note.id);
  field.closest('.checkout-section').append(note);
  const update = () => {
    const mode = typeof checkoutProduct === 'undefined' ? '' : checkoutProduct?.selling_mode;
    if (['bulk', 'factory'].includes(mode)) {
      note.textContent = 'Bulk / factory: bank transfer to TANITOOLUWA VENTURES Public Bank only. Payment is confirmed after verification.';
    } else if (field.value === 'Cash Pickup' || field.value === 'Pay on Arrival') {
      note.textContent = 'Pay when collecting or receiving your order. This option does not use Billplz.';
    } else {
      note.textContent = 'Choose an available method on the secure Billplz payment page. Card, DuitNow QR and eWallet availability depends on Billplz activation. Only methods displayed there can be used.';
    }
  };
  field.addEventListener('change', update);
  window.addEventListener('pm-checkout-loaded', update);
  update();
})();
