(() => {
  const words = {
    ms: ['Kedai dibuka', 'Kedai ditutup', 'Kedai ditutup. Sila pesan apabila penjual dibuka semula.'],
    en: ['Shop open', 'Shop closed', 'Shop is closed. Please order when the seller reopens.'],
    zh: ['\u8425\u4e1a\u4e2d', '\u5df2\u6253\u70ca', '\u5e97\u94fa\u5df2\u6253\u70ca\uff0c\u8bf7\u5728\u91cd\u65b0\u8425\u4e1a\u540e\u4e0b\u5355\u3002']
  };
  const t = () => words[localStorage.getItem('pasarmalam-lang')] || words.ms;
  window.PMShop = {
    closed: p => p?.shop_open === false,
    message: () => t()[2],
    badge: p => {
      const closed = p?.shop_open === false;
      if (!closed && !/^(food|street food|meals|drinks|makanan|makanan jalanan|hidangan|minuman)$/i.test(p?.category || '')) return '';
      return `<p class="pm-shop-status" style="font-size:13px;font-weight:600;color:${closed ? '#a42c38' : '#167343'}">${t()[closed ? 1 : 0]}</p>`;
    }
  };
})();
