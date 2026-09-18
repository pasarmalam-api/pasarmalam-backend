(function () {
  'use strict';
  const categories = ['Phones','Chargers','Electronics','Car Parts','Hardware','Stationery','Toys','Shoes','Clothes','Meals','Street Food','Food','Drinks','Groceries'];
  const labels = {
    en: ['Phones','Phone Accessories','Electronics','Car Parts','Hardware','Stationery','Toys','Shoes','Clothes','Meals','Street Food','Food','Drinks','Groceries'],
    ms: ['Telefon','Aksesori Telefon','Elektronik','Alat Ganti Kereta','Perkakasan','Alat Tulis','Mainan','Kasut','Pakaian','Hidangan','Makanan Jalanan','Makanan','Minuman','Barangan Runcit'],
    zh: ['手机','手机配件','电子产品','汽车配件','五金','文具','玩具','鞋子','服装','餐食','街头美食','食品','饮料','杂货']
  };
  const copy = {
    en: {label:'Shop category', choose:'Select category', settings:'Shop Settings', save:'Save category', retry:'Retry', missing:'Choose your shop category in Settings.', failed:'Unable to load shop category.', saved:'Shop category saved.', confirm:'Move all existing products into the selected category?', warning:'All existing products will move to the selected category.'},
    ms: {label:'Kategori kedai', choose:'Pilih kategori', settings:'Tetapan Kedai', save:'Simpan kategori', retry:'Cuba lagi', missing:'Pilih kategori kedai dalam Tetapan.', failed:'Kategori kedai tidak dapat dimuatkan.', saved:'Kategori kedai disimpan.', confirm:'Pindahkan semua produk sedia ada ke kategori yang dipilih?', warning:'Semua produk sedia ada akan dipindahkan ke kategori yang dipilih.'},
    zh: {label:'店铺类别', choose:'选择类别', settings:'店铺设置', save:'保存类别', retry:'重试', missing:'请在设置中选择店铺类别。', failed:'无法加载店铺类别。', saved:'店铺类别已保存。', confirm:'将所有现有商品移至所选类别？', warning:'所有现有商品将移至所选类别。'}
  };
  const page = location.pathname.split('/').pop();
  const signup = page === 'register.html', settings = page === 'settings.html';
  let selected = '', loaded = false, busy = false, select, status, save, retry;
  const lang = () => localStorage.getItem('pasarmalam-lang') || 'ms';
  const t = key => (copy[lang()] || copy.en)[key];
  let readyResolve;
  const ready = new Promise(resolve => { readyResolve = resolve; });
  async function request(options) {
    const response = await fetch('https://pasarmalam-backend.onrender.com/api/seller/category', {
      ...options, headers: {'Content-Type':'application/json', Authorization:'Bearer ' + (localStorage.getItem('pm_token') || '')},
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || t('failed'));
    return data;
  }
  function translate() {
    document.querySelectorAll('[data-shop-category-text]').forEach(el => {
      el.textContent = t(el.dataset.shopCategoryText);
    });
    if (!select) return;
    Array.from(select.options).forEach(option => {
      const index = categories.indexOf(option.value);
      option.textContent = index < 0 ? t('choose') : (labels[lang()] || labels.en)[index];
    });
  }
  function options(values, value) {
    select.replaceChildren(...values.map(category => new Option(category, category)));
    select.value = value;
    translate();
  }
  async function load() {
    loaded = false; select.disabled = true; retry.hidden = true;
    if (save) save.disabled = true;
    status.textContent = '';
    try {
      const data = await request();
      selected = data.shop_category || '';
      loaded = true;
      options(settings ? ['', ...categories] : [selected], selected);
      select.disabled = !settings;
      if (save) save.disabled = false;
      if (!selected && !settings) status.textContent = t('missing');
    } catch (error) {
      status.textContent = t('failed');
      retry.hidden = false;
    } finally { readyResolve(); }
  }
  async function persist() {
    if (busy || !loaded) return false;
    const chosen = select.value;
    if (!categories.includes(chosen)) { status.textContent = t('choose'); return false; }
    if (chosen === selected) return true;
    if (!confirm(t('confirm'))) { select.value = selected; return false; }
    busy = true; save.disabled = true; select.disabled = true;
    try {
      const data = await request({method:'POST',body:JSON.stringify({
        shop_category:chosen, previous_category:selected, move_products:true
      })});
      selected = data.shop_category;
      try {
        const user = JSON.parse(localStorage.getItem('pm_user') || '{}');
        user.shop_category = selected;
        localStorage.setItem('pm_user', JSON.stringify(user));
      } catch (_) {}
      status.textContent = t('saved');
      window.dispatchEvent(new Event('seller-data-changed'));
      return true;
    } catch (error) {
      status.textContent = error.message;
      select.value = selected;
      retry.hidden = false;
      return false;
    } finally { busy = false; select.disabled = false; save.disabled = false; }
  }
  function init() {
    select = document.getElementById(signup || settings ? 'shopCategory' : 'category');
    if (!select) { readyResolve(); return; }
    if (signup) { options(['', ...categories], ''); readyResolve(); return; }
    const area = document.getElementById('shopCategoryControls');
    status = area.querySelector('[role=status]');
    retry = area.querySelector('[data-category-retry]');
    retry.onclick = load;
    save = area.querySelector('[data-category-save]');
    if (save) save.onclick = persist;
    load();
  }
  window.PMShopCategory = {
    ready,
    persist,
    async require() {
      await ready;
      if (!loaded || !categories.includes(selected)) throw new Error(t('missing'));
      return selected;
    }
  };
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('click', event => {
    if (event.target.closest('.seller-lang-toggle')) setTimeout(translate, 0);
  });
  window.addEventListener('storage', translate);
})();
