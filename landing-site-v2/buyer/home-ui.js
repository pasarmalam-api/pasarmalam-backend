(function () {
  function init() {
    if (!document.body.classList.contains('buyer-home') || document.body.classList.contains('home-clean')) return;
    const bar = document.querySelector('header .bar');
    const account = document.querySelector('.buyer-account-bar');
    const nav = document.querySelector('.buyer-navigation');
    const language = document.getElementById('langToggle');
    const cart = document.getElementById('cartButton');
    const search = document.getElementById('searchForm');
    if (!bar || !account || !nav || !language || !cart || !search) return;
    const strings = {
      ms: {account:'Akaun Saya', close:'Tutup', language:'Bahasa', search:'Cari produk', nav:['Laman Utama','Kategori','Chat','Pesanan','Saya'], bulk:'Borong', factory:'Kilang Terus', minimum:'Min.', units:'unit', perUnit:'Harga seunit', factoryPhoto:'Jualan Kilang'},
      en: {account:'My Account', close:'Close', language:'Language', search:'Search products', nav:['Home','Categories','Chat','Orders','Me'], bulk:'Wholesale', factory:'Factory Direct', minimum:'MOQ', units:'units', perUnit:'Price per unit', factoryPhoto:'Factory Sales'},
      zh: {account:'我的账户', close:'关闭', language:'语言', search:'搜索商品', nav:['首页','分类','聊天','订单','我'], bulk:'批发', factory:'工厂直供', minimum:'起订量', units:'件', perUnit:'单件价格', factoryPhoto:'工厂直销'}
    };
    const locale = () => localStorage.getItem('pasarmalam-lang') || 'ms';
    const labels = () => strings[locale()] || strings.ms;
    const marketplaceLabels = {
      ms: {heading:'Pilihan untuk anda', promo:'Beli terus dari penjual.', types:'Runcit \u00b7 Borong \u00b7 Kilang', save:'Simpan produk', add:'Tambah ke troli', sold:'terjual', filter:'Jenis pesanan'},
      en: {heading:'Discover for you', promo:'Shop your way.', types:'Retail \u00b7 Wholesale \u00b7 Factory', save:'Save product', add:'Add to cart', sold:'sold', filter:'Order type'},
      zh: {heading:'\u4e3a\u4f60\u7cbe\u9009', promo:'\u4ece\u5546\u5bb6\u5230\u60a8\u624b\u4e2d', types:'\u96f6\u552e\u3001\u6279\u53d1\u4e0e\u5de5\u5382\u76f4\u9500', save:'\u6536\u85cf\u5546\u54c1', add:'\u52a0\u5165\u8d2d\u7269\u8f66', sold:'\u5df2\u552e', filter:'\u8ba2\u5355\u7c7b\u578b'}
    };
    const marketplaceText = () => marketplaceLabels[locale()] || marketplaceLabels.ms;
    const icon = name => {
      const img = document.createElement('img');
      img.src = 'icons/' + name + '.svg'; img.alt = ''; img.width = 20; img.height = 20;
      return img;
    };
    const tools = document.createElement('div'); tools.className = 'home-header-tools';
    const select = document.createElement('select'); select.id = 'homeLanguage';
    for (const [value, text] of [['ms','BM'],['en','EN'],['zh','中文']]) select.add(new Option(text, value));
    select.onchange = () => {
      const next = select.value;
      for (let i = 0; i < 3 && locale() !== next; i++) language.click();
      syncLabels();
    };
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'home-account-toggle';
    toggle.setAttribute('aria-haspopup','dialog'); toggle.setAttribute('aria-controls','homeAccountDialog');
    toggle.setAttribute('aria-expanded','false'); toggle.append(icon('user-round'));
    tools.append(select, toggle); bar.append(tools);

    const dialog = document.createElement('dialog'); dialog.id = 'homeAccountDialog'; dialog.className = 'home-account-dialog';
    dialog.setAttribute('aria-labelledby','homeAccountTitle');
    const dialogHead = document.createElement('div'); dialogHead.className = 'home-dialog-heading';
    const title = document.createElement('h2'); title.id = 'homeAccountTitle';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'home-dialog-close'; close.append(icon('x'));
    close.onclick = () => dialog.close(); dialogHead.append(title, close);
    const legacyTools = language.parentElement;
    const searchRow = document.createElement('div'); searchRow.className = 'home-search-row';
    search.parentElement.before(searchRow); searchRow.append(search, cart);
    dialog.append(dialogHead, account, language);
    const orders = document.getElementById('ordersButton'); if (orders) dialog.append(orders);
    if (!legacyTools.children.length) legacyTools.remove();
    document.body.append(dialog);
    toggle.onclick = () => { dialog.showModal(); toggle.setAttribute('aria-expanded','true'); };
    dialog.addEventListener('close', () => { toggle.setAttribute('aria-expanded','false'); toggle.focus(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

    const filter = document.getElementById('sellingFilter');
    const filterRow = filter?.closest('.head'), headingRow = filterRow?.nextElementSibling;
    if (headingRow?.querySelector('h3')) {
      headingRow.classList.add('home-product-heading'); headingRow.append(filter.closest('label')); filterRow.remove();
    }
    const categorySection = document.getElementById('cats')?.closest('section');
    categorySection?.classList.add('home-category-strip');
    const categoryIcons = {'All':'layout-grid','Phones':'smartphone','Chargers':'cable','Electronics':'headphones','Car Parts':'car','Hardware':'wrench','Stationery':'notebook-pen','Fashion':'shirt','Food':'shopping-basket','Street Food':'utensils'};
    function decorateCategories() {
      document.querySelectorAll('#cats .cat').forEach(button => {
        const name = categoryIcons[button.dataset.category] || 'package';
        button.dataset.icon = name;
        button.style.setProperty('--category-icon', `url("icons/${name}.svg")`);
        button.title = button.textContent;
      });
    }
    const hero = document.querySelector('main .hero');
    const promo = document.createElement('div'); promo.className = 'home-market-promo';
    const promoCopy = document.createElement('div'); promoCopy.className = 'home-promo-copy';
    promoCopy.dataset.homeLocalized = 'true';
    const promoTitle = document.createElement('h2');
    const promoText = document.createElement('p');
    const promoPhotos = document.createElement('div'); promoPhotos.className = 'home-promo-products';
    promoCopy.append(promoTitle, promoText); promo.append(promoCopy, promoPhotos); hero?.append(promo);
    let promoSignature = '';
    function decoratePromo() {
      const cards = [...document.querySelectorAll('#products .card')].filter(card => card.querySelector('.photo img')).slice(0, 2);
      const signature = cards.map(card => card.querySelector('.photo').getAttribute('href')).join('|');
      if (signature === promoSignature) return;
      promoSignature = signature;
      promoPhotos.replaceChildren(...cards.map(card => {
        const link = document.createElement('a'); link.href = card.querySelector('.photo').getAttribute('href');
        const image = card.querySelector('.photo img').cloneNode(); image.loading = 'eager';
        link.title = image.alt; link.append(image); return link;
      }));
    }
    const navIcons = ['house','layout-grid','message-circle','receipt-text','user-round'];
    function decorateNav() {
      [...nav.querySelectorAll('a')].forEach((link, index) => {
        if (!link.querySelector('img')) {
          const text = document.createElement('span'); text.textContent = link.textContent;
          const badges = [...link.querySelectorAll('.pm-badge')];
          link.replaceChildren(icon(navIcons[index] || 'house'), text, ...badges);
        }
        const label = labels().nav[index];
        if (label && link.querySelector('span').textContent !== label) link.querySelector('span').textContent = label;
      });
    }
    function decorateProducts() {
      const empty = document.querySelector('#products>.panel .muted');
      if (empty) {
        empty.dataset.homeLocalized = 'true';
        const emptyWords = {ms:'Tiada produk untuk pilihan ini.',en:'No products match this selection.',zh:'\u6682\u65e0\u7b26\u5408\u6b64\u7b5b\u9009\u6761\u4ef6\u7684\u5546\u54c1\u3002'};
        const nextEmpty = emptyWords[locale()] || emptyWords.ms;
        if (empty.textContent !== nextEmpty) empty.textContent = nextEmpty;
      }
      document.querySelectorAll('#products .card').forEach(card => {
        const photo = card.querySelector('.photo'), name = card.querySelector('.name');
        if (photo && name && !name.querySelector('a')) {
          const link = document.createElement('a'); link.href = photo.getAttribute('href'); link.textContent = name.textContent;
          name.replaceChildren(link);
        }
        for (const [selector, label] of [['.buy', marketplaceText().add],['.heart',marketplaceText().save]]) {
          const button = card.querySelector(selector);
          if (button) { button.title = label; button.setAttribute('aria-label', `${label}: ${name?.textContent || ''}`); }
        }
        const sold = card.querySelector('.price .muted');
        const status = card.querySelector('.pm-shop-status');
        if (status) {
          status.dataset.homeLocalized = 'true';
          const statusWords = {ms:['Kedai dibuka','Kedai ditutup'],en:['Shop open','Shop closed'],zh:['\u8425\u4e1a\u4e2d','\u5df2\u6253\u70ca']};
          const nextStatus = (statusWords[locale()] || statusWords.ms)[card.querySelector('.buy')?.disabled ? 1 : 0];
          if (status.textContent !== nextStatus) status.textContent = nextStatus;
        }
        if (sold) {
          sold.dataset.homeLocalized = 'true';
          const quantity = sold.textContent.match(/\d+/)?.[0];
          sold.dataset.homeSold = quantity || '0';
          const next = quantity == null ? '' : `${quantity} ${marketplaceText().sold}`;
          if (sold.textContent !== next) sold.textContent = next;
        }
      });
      document.querySelectorAll('#products .selling-type').forEach(badge => {
        const match = badge.textContent.match(/\bMOQ\s+(\d+)/i);
        if (!badge.dataset.homeMinimum && match) {
          badge.dataset.homeMinimum = match[1];
          badge.dataset.homeMode = /factory|kilang|工厂/i.test(badge.textContent) ? 'factory' : 'bulk';
        }
        if (!badge.dataset.homeMinimum) return;
        const text = `${labels()[badge.dataset.homeMode]} · ${labels().minimum} ${badge.dataset.homeMinimum} ${labels().units} · ${labels().perUnit}`;
        if (badge.textContent !== text) badge.textContent = text;
      });
      document.querySelectorAll('#products .factory-photo-label').forEach(badge => {
        if (badge.textContent !== labels().factoryPhoto) badge.textContent = labels().factoryPhoto;
      });
      decoratePromo();
    }
    function syncCart() {
      const text = cart.textContent.trim(); cart.dataset.count = (text.match(/\d+\s*$/) || ['0'])[0].trim();
      cart.setAttribute('aria-label', text); cart.title = text;
    }
    const searchButton = document.getElementById('searchButton');
    function syncSearch() { searchButton.setAttribute('aria-label', labels().search); searchButton.title = labels().search; }
    function syncLabels() {
      select.value = locale(); select.setAttribute('aria-label', labels().language); select.title = labels().language;
      toggle.setAttribute('aria-label', labels().account); toggle.title = labels().account;
      if (title.textContent !== labels().account) title.textContent = labels().account;
      close.setAttribute('aria-label', labels().close); close.title = labels().close;
      document.getElementById('search').placeholder = labels().search;
      promoTitle.textContent = marketplaceText().promo; promoText.textContent = marketplaceText().types;
      if (headingRow?.querySelector('h3')) headingRow.querySelector('h3').textContent = marketplaceText().heading;
      filter?.setAttribute('aria-label',marketplaceText().filter);
      syncSearch(); decorateNav(); decorateProducts();
    }
    new MutationObserver(decorateNav).observe(nav, {childList:true,subtree:true});
    new MutationObserver(syncCart).observe(cart, {childList:true,subtree:true,characterData:true});
    new MutationObserver(syncLabels).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});
    new MutationObserver(syncSearch).observe(searchButton, {childList:true});
    new MutationObserver(decorateProducts).observe(document.getElementById('products'), {childList:true,subtree:true});
    new MutationObserver(decorateCategories).observe(document.getElementById('cats'), {childList:true,subtree:true});
    window.addEventListener('pm-language-change', () => queueMicrotask(syncLabels));
    document.body.classList.add('home-clean'); syncLabels(); syncCart(); decorateCategories();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
