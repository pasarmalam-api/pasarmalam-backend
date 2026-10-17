(() => {
  const panel = document.getElementById('detail');
  const inspect = () => {
    if (!panel || panel.querySelector('[data-bank-transfer]')) return;
    const id = new URLSearchParams(location.search).get('id');
    if (!id) return;
    const link = document.createElement('a');
    link.dataset.bankTransfer = 'true';
    link.href = 'bank-transfer.html?id=' + encodeURIComponent(id);
    link.textContent = 'Bulk bank transfer details';
    link.hidden = true;
    panel.append(link);
    fetch('https://pasarmalam-backend.onrender.com/api/payments/bank-transfer?order_id=' + encodeURIComponent(id),
      {headers: {Authorization: 'Bearer ' + (localStorage.getItem('pm_token') || '')}})
      .then(response => { if (response.ok) link.hidden = false; }).catch(() => {});
  };
  new MutationObserver(inspect).observe(panel, {childList: true});
  inspect();
})();
