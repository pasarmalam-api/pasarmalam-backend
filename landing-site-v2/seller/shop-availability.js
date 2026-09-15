(() => {
  const main = document.querySelector('main');
  if (!main || !window.PMSellerSession?.signedIn()) return;
  const words = {
    ms: ['Status kedai', 'Dibuka', 'Ditutup', 'Menerima pesanan', 'Memuatkan...', 'Gagal menyimpan. Cuba lagi.', 'Cuba lagi'],
    en: ['Shop status', 'Open', 'Closed', 'Accepting orders', 'Loading...', 'Could not save. Try again.', 'Retry'],
    zh: ['\u5e97\u94fa\u72b6\u6001', '\u8425\u4e1a\u4e2d', '\u5df2\u6253\u70ca', '\u63a5\u53d7\u8ba2\u5355', '\u52a0\u8f7d\u4e2d...', '\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002', '\u91cd\u8bd5']
  };
  const section = document.createElement('section');
  section.className = 'shop-availability';
  section.innerHTML = '<div><b></b><span role="status"></span></div><label><span></span><input type="checkbox" role="switch" disabled></label><button type="button" class="soft" hidden></button><p role="alert" hidden></p>';
  main.prepend(section);
  const toggle = section.querySelector('input'), label = section.querySelector('label span');
  const message = section.querySelector('p'), retry = section.querySelector('button');
  let state = null, busy = false, failed = false;
  const t = () => words[localStorage.getItem('pasarmalam-lang')] || words.ms;
  function render() {
    const w = t();
    section.hidden = state?.eligible === false;
    section.querySelector('b').textContent = w[0];
    section.querySelector('[role=status]').textContent = state ? w[state.is_open ? 1 : 2] : w[4];
    section.dataset.open = String(Boolean(state?.is_open));
    label.textContent = w[3]; toggle.setAttribute('aria-label', w[3]);
    toggle.checked = Boolean(state?.is_open); toggle.disabled = busy || !state;
    message.hidden = !failed; message.textContent = failed ? w[5] : '';
    retry.hidden = !failed; retry.textContent = w[6];
  }
  async function sync(value) {
    if (busy) return;
    busy = true; failed = false; render();
    try {
      const res = await fetch('https://pasarmalam-backend.onrender.com/api/seller/availability', value === undefined ? {} : {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({is_open: value})
      });
      const data = await res.json();
      if (!res.ok || typeof data.is_open !== 'boolean') throw new Error('Unavailable');
      state = data;
    } catch (_) { failed = true; }
    finally { busy = false; render(); }
  }
  toggle.addEventListener('change', () => sync(toggle.checked));
  retry.onclick = () => sync();
  window.addEventListener('focus', () => sync());
  document.addEventListener('click', e => { if (e.target.closest('.seller-lang-toggle')) render(); });
  window.addEventListener('storage', render);
  window.addEventListener('seller-data-changed', () => { if (!busy) sync(); });
  sync();
})();
