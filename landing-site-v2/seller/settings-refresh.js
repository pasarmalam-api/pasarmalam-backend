(function () {
  'use strict';
  const buttons = Array.from(document.querySelectorAll('button[onclick="saveProfile()"], button[onclick="savePayoutProfile()"], button[onclick="save()"], button[onclick="submitVerification()"]'));
  const fields = Array.from(document.querySelectorAll('input, textarea, #identityType, #businessType'));
  const status = document.getElementById('profileStatus') || document.getElementById('out');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'soft';
  retry.textContent = 'Retry loading settings';
  retry.hidden = true;
  status.after(retry);
  async function refresh() {
    retry.hidden = true;
    buttons.concat(fields).forEach(el => { el.disabled = true; });
    status.textContent = 'Loading saved settings...';
    try {
      const response = await fetch('https://pasarmalam-backend.onrender.com/api/seller/profile', {
        headers: {Authorization: 'Bearer ' + (localStorage.getItem('pm_token') || '')},
        signal: AbortSignal.timeout(15000)
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Unable to load saved settings.');
      if (!data.user) throw new Error('Unable to load saved settings.');
      localStorage.setItem('pm_user', JSON.stringify({...user(), ...data.user}));
      if (typeof loadSaved === 'function') loadSaved();
      else load();
      status.textContent = '';
      buttons.concat(fields).forEach(el => { el.disabled = false; });
    } catch (error) {
      status.textContent = error.message;
      retry.hidden = false;
    }
  }
  retry.onclick = refresh;
  refresh();
})();
