(() => {
  if (new URLSearchParams(location.search).get('ai') !== 'draft') return;
  try {
    const draft=JSON.parse(sessionStorage.getItem('pm_ai_listing') || 'null');
    if(!draft || draft.owner!==(localStorage.getItem('pm_token')||'') || Date.now()-draft.created>3600000) return;
    document.getElementById('name').value=draft.name;
    document.getElementById('desc').value=draft.description;
    document.getElementById('variants').value=draft.variants;
    images.splice(0,images.length,...draft.images);
    renderProductPhotos(images);
    document.getElementById('out').textContent='AI draft: confirm product details, price, stock, condition and shipping before publishing.';
    sessionStorage.removeItem('pm_ai_listing');
  } catch { document.getElementById('out').textContent='Draft could not be loaded. Return to AI Listing Helper.'; }
})();
