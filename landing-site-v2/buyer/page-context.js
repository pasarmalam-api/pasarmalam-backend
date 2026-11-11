(function () {
  const copy={
    en:{order:'Open an order from your order list.',product:'Choose a product from the catalogue.',signIn:'Sign in to view this order.',orders:'View Orders',products:'Browse Products',login:'Sign In',failed:'Unable to load this page. Please try again.'},
    ms:{order:'Buka pesanan daripada senarai pesanan anda.',product:'Pilih produk daripada katalog.',signIn:'Log masuk untuk melihat pesanan ini.',orders:'Lihat Pesanan',products:'Lihat Produk',login:'Log Masuk',failed:'Halaman ini tidak dapat dimuatkan. Sila cuba lagi.'},
    zh:{order:'请从订单列表打开订单。',product:'请从商品目录选择商品。',signIn:'请登录以查看此订单。',orders:'查看订单',products:'浏览商品',login:'登录',failed:'无法加载此页面，请重试。'}
  };
  const t=()=>copy[localStorage.getItem('pasarmalam-lang')]||copy.ms;
  function show(container,message,href,label){
    const host=document.getElementById(container);if(!host)return;
    const p=document.createElement('p');p.textContent=message;p.setAttribute('role','status');
    const a=document.createElement('a');a.href=href;a.textContent=label;host.replaceChildren(p,a);
    document.querySelectorAll('#returnBtn,#trackBtn').forEach(button=>{button.disabled=true;});
  }
  window.PMPageContext={
    require(id,container,kind='order'){
      if(!/^[1-9]\d*$/.test(id||'')){show(container,t()[kind],kind==='product'?'category.html':'orders.html',kind==='product'?t().products:t().orders);return false;}
      if(kind==='order'&&!localStorage.getItem('pm_token')){show(container,t().signIn,'login.html?next='+encodeURIComponent(location.pathname.split('/').pop()+location.search),t().login);return false;}
      return true;
    },
    fail(container){show(container,t().failed,'orders.html',t().orders);}
  };
})();
