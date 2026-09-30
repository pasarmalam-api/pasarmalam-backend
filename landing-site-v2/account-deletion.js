(() => {
  const API = 'https://pasarmalam-backend.onrender.com';
  const form = document.getElementById('deletion-form');
  const credentials = document.getElementById('deletion-credentials');
  const message = document.getElementById('deletion-status');
  const button = document.getElementById('submit-deletion');
  let authenticated = false;
  async function api(method, body) {
    const headers = {'Content-Type': 'application/json'};
    const token = localStorage.getItem('pm_token');
    if (token) headers.Authorization = 'Bearer ' + token;
    const response = await fetch(API + '/api/account/deletion', {
      method, headers, ...(body ? {body: JSON.stringify(body)} : {})
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to submit. Please try again.');
    return result;
  }
  function show(request) {
    form.hidden = true;
    message.textContent = `Request #${request.id} received. Status: ${request.status}. ` +
      `Deletion is due by ${new Date(request.due_at * 1000).toLocaleDateString()}. ` +
      'You do not need to email us to start this request. We will email confirmation when deletion is completed. This receipt does not mean your account has already been deleted.';
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true;
    message.textContent = 'Submitting your deletion request...';
    try {
      const data = {confirm: document.getElementById('confirm-deletion').checked};
      if (!authenticated) {
        data.email = document.getElementById('deletion-email').value.trim();
        data.password = document.getElementById('deletion-password').value;
      }
      show((await api('POST', data)).request);
    } catch (error) {
      message.textContent = error.message;
      credentials.hidden = false;
      authenticated = false;
      credentials.querySelectorAll('input').forEach(input => input.required = true);
    } finally {
      document.getElementById('deletion-password').value = '';
      button.disabled = false;
    }
  });
  api('GET').then(result => {
    authenticated = true;
    credentials.hidden = true;
    credentials.querySelectorAll('input').forEach(input => input.required = false);
    if (result.request) show(result.request);
  }).catch(() => {
    credentials.hidden = false;
    credentials.querySelectorAll('input').forEach(input => input.required = true);
  });
})();
