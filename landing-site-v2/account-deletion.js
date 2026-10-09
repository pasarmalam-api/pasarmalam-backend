(() => {
  const API = 'https://pasarmalam-backend.onrender.com';
  const form = document.getElementById('deletion-form');
  const credentials = document.getElementById('deletion-credentials');
  const message = document.getElementById('deletion-status');
  const button = document.getElementById('submit-deletion');
  let authenticated = false;
  let submitting = false;
  button.disabled = true;
  message.textContent = 'Checking your account...';
  async function api(method, body) {
    const headers = {'Content-Type': 'application/json'};
    const token = localStorage.getItem('pm_token');
    if (token) headers.Authorization = 'Bearer ' + token;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    let response, result;
    try {
      response = await fetch(API + '/api/account/deletion', {
        method, headers, signal: controller.signal, ...(body ? {body: JSON.stringify(body)} : {})
      });
      result = await response.json();
    } catch (error) {
      throw new Error(controller.signal.aborted
        ? 'The connection timed out. Please retry. If your request was received, the same receipt will be returned.'
        : 'Unable to reach the service. Check your connection and try again.');
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new Error(result.error || 'Unable to submit. Please try again.');
    return result;
  }
  function show(request) {
    if (!request || !request.id) throw new Error('No receipt received. Please retry to confirm your request.');
    form.hidden = true;
    message.textContent = `Request #${request.id} received. Status: ${request.status}. ` +
      `Deletion is due by ${new Date(request.due_at * 1000).toLocaleDateString()}. ` +
      'You do not need to email us to start this request. We will email confirmation when deletion is completed. This receipt does not mean your account has already been deleted.';
    message.tabIndex = -1;
    message.focus();
    message.scrollIntoView({block: 'center'});
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || button.disabled || !form.reportValidity()) return;
    submitting = true;
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
      credentials.disabled = false;
      authenticated = false;
      credentials.querySelectorAll('input').forEach(input => input.required = true);
    } finally {
      document.getElementById('deletion-password').value = '';
      button.disabled = false;
      submitting = false;
    }
  });
  api('GET').then(result => {
    authenticated = true;
    credentials.hidden = true;
    credentials.disabled = true;
    credentials.querySelectorAll('input').forEach(input => input.required = false);
    message.textContent = '';
    if (result.request) show(result.request);
  }).catch(() => {
    credentials.hidden = false;
    credentials.disabled = false;
    message.textContent = 'Enter your registered email and password to submit your request online.';
    credentials.querySelectorAll('input').forEach(input => input.required = true);
  }).finally(() => { button.disabled = false; });
})();
