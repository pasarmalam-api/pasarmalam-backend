(function () {
  'use strict';
  const api = 'https://pasarmalam-backend.onrender.com';
  const form = document.getElementById('sellerProfile');
  const status = document.getElementById('status');
  const retry = document.getElementById('retry');
  let busy = false;
  async function request(path, data) {
    const response = await fetch(api + path, {
      method: data === undefined ? 'GET' : 'POST',
      headers: {'Content-Type':'application/json', Authorization:'Bearer ' + (localStorage.getItem('pm_token') || '')},
      body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(15000)
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 || result.error === 'Login required') document.getElementById('signIn').hidden = false;
      throw new Error(result.error || 'Unable to load your account. Please retry.');
    }
    return result;
  }
  function saveSession(data) {
    localStorage.setItem('pm_token', data.token);
    localStorage.setItem('pm_user', JSON.stringify(data.user));
  }
  async function render(data) {
    if (data.seller_status === 'approved') {
      const session = await request('/api/auth/switch-role', {role:'seller'});
      if (!session.token) throw new Error('Seller access changed. Please refresh.');
      // Separate Tiiny origins cannot share browser storage. Never put credentials in URLs.
      if (location.pathname.startsWith('/buyer/')) {
        saveSession(session); location.replace('../seller/index.html');
      } else {
        status.textContent = 'Your seller account is approved. Sign in with the same email on the main seller site.';
        const link = document.getElementById('signIn'); link.href = 'https://www.pasarmalamapp.com/seller/login.html';
        link.textContent = 'Open Seller Centre'; link.hidden = false;
      }
      return;
    }
    const applied = ['pending','rejected'].includes(data.seller_status);
    form.hidden = applied;
    document.getElementById('heading').textContent = applied ? 'Seller Application' : 'Complete Seller Profile';
    if (applied) {
      status.textContent = data.seller_status === 'pending'
        ? 'Your seller profile is complete and pending approval. We will contact you shortly. You can continue shopping with this account.'
        : 'Your seller application was not approved. Contact support for help. You can continue shopping.';
      document.getElementById('support').hidden = data.seller_status !== 'rejected';
      return;
    }
    const category = form.elements.shop_category;
    category.replaceChildren(new Option('Select category',''), ...data.categories.map(value => new Option(value === 'Chargers' ? 'Phone Accessories' : value, value)));
    for (const [key, value] of Object.entries(data.profile)) if (form.elements[key]) form.elements[key].value = value || '';
    status.textContent = 'Your existing account details are filled in. Complete the remaining fields for seller review.';
  }
  async function load() {
    retry.hidden = true;
    if (!localStorage.getItem('pm_token')) {status.textContent = 'Sign in to continue with your existing account.'; document.getElementById('signIn').hidden = false; return;}
    try {
      const user = JSON.parse(localStorage.getItem('pm_user') || '{}');
      if (user.role === 'seller') saveSession(await request('/api/auth/switch-role', {role:'buyer'}));
      await render(await request('/api/seller/onboarding'));
    } catch (error) {status.textContent = error.message; retry.hidden = false;}
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    busy = true; document.getElementById('submit').disabled = true;
    try {await render(await request('/api/seller/onboarding', Object.fromEntries(new FormData(form))));}
    catch (error) {status.textContent = error.message;}
    finally {busy = false; document.getElementById('submit').disabled = false;}
  });
  retry.onclick = load;
  load();
})();
