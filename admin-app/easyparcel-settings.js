(function () {
  const status = document.getElementById('easyparcelStatus');
  const connectButton = document.getElementById('easyparcelConnect');
  const refreshButton = document.getElementById('easyparcelRefresh');
  async function refresh() {
    connectButton.disabled = true;
    refreshButton.disabled = true;
    try {
      const data = await api('/api/admin/easyparcel/status');
      status.textContent = !data.configured ? 'EasyParcel credentials are missing in Render.' :
        data.connected ? (data.access_token_expired ? 'Authorization expired. Reconnect EasyParcel.' : 'Authorized. Demo/live account selection has not yet been verified. Booking disabled.') : 'Not connected.';
      connectButton.disabled = !data.configured;
      connectButton.textContent = data.connected ? 'Reconnect EasyParcel' : 'Connect EasyParcel';
    } catch (error) { status.textContent = error.message; }
    finally { refreshButton.disabled = false; }
  }
  connectButton.onclick = async () => {
    connectButton.disabled = true;
    try {
      const data = await api('/api/admin/easyparcel/connect', {method:'POST', body:'{}'});
      const url = new URL(data.authorization_url);
      if (url.origin !== new URL(API).origin || url.pathname !== '/api/integrations/easyparcel/authorize') throw new Error('Invalid connection link.');
      location.assign(url.href);
    } catch (error) { status.textContent = error.message; connectButton.disabled = false; }
  };
  refreshButton.onclick = refresh;
  refresh();
})();
