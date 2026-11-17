(() => {
  const field = document.getElementById('payment');
  if (!field) return;
  const online = field.querySelector('option[value="Billplz"]');
  const note = document.createElement('p');
  note.id = 'paymentAvailability';
  note.className = 'muted';
  note.setAttribute('role', 'status');
  field.setAttribute('aria-describedby', note.id);
  field.closest('.checkout-section').append(note);
  const copy = {
    en: {online:'Secure payment - Billplz',card:'FPX / Visa / Mastercard - Billplz',fpx:'Online banking (FPX) - Billplz',bank:'Bulk / factory: bank transfer to TANITOOLUWA VENTURES Public Bank only. Payment is confirmed after verification.',cash:'Pay when collecting or receiving your order. This option does not use Billplz.',choose:'Choose an available method on the secure Billplz payment page.',ready:'Online banking and Visa/Mastercard are available on the secure Billplz page. Enter card details only there.',unavailable:'Online payment is temporarily unavailable. Please retry later.'},
    ms: {online:'Bayaran selamat - Billplz',card:'FPX / Visa / Mastercard - Billplz',fpx:'Perbankan dalam talian (FPX) - Billplz',bank:'Borong / kilang: pindahan bank ke Public Bank TANITOOLUWA VENTURES sahaja. Bayaran disahkan selepas semakan.',cash:'Bayar semasa mengambil atau menerima pesanan. Pilihan ini tidak menggunakan Billplz.',choose:'Pilih kaedah yang tersedia di halaman bayaran selamat Billplz.',ready:'Perbankan dalam talian dan Visa/Mastercard tersedia di halaman selamat Billplz. Masukkan butiran kad hanya di sana.',unavailable:'Bayaran dalam talian tidak tersedia buat sementara waktu. Sila cuba lagi kemudian.'},
    zh: {online:'\u5b89\u5168\u652f\u4ed8 - Billplz',card:'FPX / Visa / Mastercard - Billplz',fpx:'\u7f51\u4e0a\u94f6\u884c (FPX) - Billplz',bank:'\u6279\u53d1\u53ca\u5de5\u5382\u8ba2\u5355\u4ec5\u652f\u6301\u8f6c\u8d26\u81f3 TANITOOLUWA VENTURES Public Bank\uff0c\u5ba1\u6838\u540e\u786e\u8ba4\u4ed8\u6b3e\u3002',cash:'\u63d0\u8d27\u6216\u6536\u8d27\u65f6\u4ed8\u6b3e\u3002\u6b64\u9009\u9879\u4e0d\u4f7f\u7528 Billplz\u3002',choose:'\u8bf7\u5728 Billplz \u5b89\u5168\u4ed8\u6b3e\u9875\u9762\u9009\u62e9\u53ef\u7528\u7684\u4ed8\u6b3e\u65b9\u5f0f\u3002',ready:'Billplz \u5b89\u5168\u9875\u9762\u652f\u6301\u7f51\u4e0a\u94f6\u884c\u53ca Visa/Mastercard\u3002\u8bf7\u4ec5\u5728\u8be5\u9875\u9762\u8f93\u5165\u94f6\u884c\u5361\u8d44\u6599\u3002',unavailable:'\u7f51\u4e0a\u652f\u4ed8\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002'}
  };
  let availability = null;
  const update = () => {
    const text = copy[document.documentElement.lang] || copy.en;
    const mode = typeof checkoutProduct === 'undefined' ? '' : checkoutProduct?.selling_mode;
    const bankOnly = ['bulk', 'factory'].includes(mode);
    if (online) {
      online.textContent = availability ? (availability.card ? text.card : text.fpx) : text.online;
      online.disabled = bankOnly || availability?.available === false;
      if (online.disabled && field.value === 'Billplz') field.value = '';
    }
    note.textContent = bankOnly ? text.bank
      : ['Cash Pickup', 'Pay on Arrival'].includes(field.value) ? text.cash
      : availability?.available === false ? text.unavailable
      : availability?.card ? text.ready : text.choose;
  };
  field.addEventListener('change', update);
  window.addEventListener('pm-checkout-loaded', update);
  window.addEventListener('pm-language-change', update);
  update();
  if (typeof fetch === 'function' && typeof API_BASE === 'string') {
    fetch(API_BASE + '/api/payments/options', {cache:'no-store'}).then(response => response.ok ? response.json() : null).then(data => {
      if (data?.online && typeof data.online.available === 'boolean' && typeof data.online.card === 'boolean') {
        availability = data.online;
        update();
      }
    }).catch(() => {});
  }
})();
