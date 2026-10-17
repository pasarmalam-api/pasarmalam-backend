(() => {
  const id = new URLSearchParams(location.search).get('id');
  const get = name => document.getElementById(name);
  const base = 'https://pasarmalam-backend.onrender.com';
  async function request(path, options = {}) {
    const response = await fetch(base + path, {...options, headers: {
      'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('pm_token') || '')
    }});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load payment');
    return data;
  }
  async function load() {
    if (!localStorage.getItem('pm_token')) {
      location.href = 'login.html?next=' + encodeURIComponent('bank-transfer.html?id=' + id);
      return;
    }
    const {order, bank} = await request('/api/payments/bank-transfer?order_id=' + encodeURIComponent(id));
    const open = order.order_status === 'pending_payment' && order.payment_status !== 'paid';
    get('status').textContent = 'Order PM-' + order.id + ' | ' + (order.order_status === 'cancelled'
      ? 'Cancelled - do not transfer' : order.payment_status === 'paid' ? 'Payment confirmed'
      : order.payment_status === 'pending_review' ? 'Awaiting admin bank confirmation - do not transfer again'
      : order.payment_status === 'rejected' ? 'Payment not confirmed - check with support before transferring again' : 'Awaiting payment');
    get('bank').hidden = !open || ['pending_review', 'rejected'].includes(order.payment_status);
    get('submission').hidden = !open;
    get('details').replaceChildren();
    for (const [label, value] of [['Bank', bank.name], ['Account holder', bank.account_name],
      ['Account number', bank.account_number], ['Amount', 'RM' + Number(order.total).toFixed(2)],
      ['Payment reference', order.payment_reference]]) {
      const term = document.createElement('dt'), description = document.createElement('dd');
      term.textContent = label; description.textContent = value;
      get('details').append(term, description);
    }
    get('orderLink').href = 'order-detail.html?id=' + order.id;
    if (order.payment_review_note) get('message').textContent = order.payment_review_note;
  }
  get('transferForm').onsubmit = async event => {
    event.preventDefault(); get('submitReference').disabled = true;
    try {
      await request('/api/payments/bank-transfer/notify', {method: 'POST', body: JSON.stringify({
        order_id: Number(id), sender_reference: get('senderReference').value.trim()
      })});
      await load();
      get('message').textContent = 'Submitted for review. This does not confirm payment. Please do not pay again while admin checks the bank deposit.';
    } catch (error) { get('message').textContent = error.message; }
    finally { get('submitReference').disabled = false; }
  };
  get('refresh').onclick = () => load().catch(error => { get('message').textContent = error.message; });
  load().catch(error => { get('status').textContent = error.message; });
})();
