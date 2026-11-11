(() => {
  const form = document.getElementById('recoveryForm');
  const email = document.getElementById('email');
  const button = document.getElementById('sendReset');
  const status = document.getElementById('status');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled || !form.reportValidity()) return;
    button.disabled = true;
    status.textContent = 'Sending reset link...';
    try {
      const response = await fetch('https://pasarmalam-backend.onrender.com/api/admin/email-reset-request', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: email.value.trim()})
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error('Unable to send the reset link. Please try again or contact your administrator.');
      status.textContent = 'If this email belongs to an admin account, a reset link has been sent. Check your inbox and spam folder.';
    } catch (error) {
      status.textContent = error.message || 'Unable to connect. Please try again.';
    } finally {
      button.disabled = false;
    }
  });
})();
