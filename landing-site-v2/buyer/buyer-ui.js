(function(){
  document.addEventListener('click',event=>{
    const target=event.target.closest('a,button');
    if(!target)return;
    const href=target.getAttribute('href'),action=target.getAttribute('onclick')||'';
    if(href!=='login.html'&&!/location\.href\s*=\s*['"]login\.html['"]/.test(action))return;
    const current=location.pathname.split('/').pop();
    if(!current||['login.html','signup.html','password-reset.html'].includes(current))return;
    event.preventDefault();event.stopImmediatePropagation();
    location.href='login.html?next='+encodeURIComponent(current+location.search);
  },true);
  function init(){
    const page=location.pathname.split('/').pop()||'index.html';
    document.querySelector('.bottom-nav')?.remove();
    const nav=document.createElement('nav');nav.className='buyer-navigation';nav.setAttribute('aria-label','Buyer navigation');
    const routes=[['index.html','Home'],['category.html','Categories'],['chat.html','Chat'],['orders.html','Orders'],['profile.html','Me']];
    const group={'product.html':'category.html','seller-store.html':'category.html','order-detail.html':'orders.html','receipt.html':'orders.html','order-confirmation.html':'orders.html','returns.html':'orders.html','login.html':'profile.html','signup.html':'profile.html','password-reset.html':'profile.html'};
    routes.forEach(([href,label])=>{const a=document.createElement('a');a.href=href;a.textContent=label;if((group[page]||page)===href)a.setAttribute('aria-current','page');nav.appendChild(a)});
    document.querySelector('header')?.after(nav);
    const cartLink=document.createElement('a');cartLink.href='cart.html';cartLink.className='buyer-cart-link';cartLink.textContent='Cart';
    if(page==='cart.html')cartLink.setAttribute('aria-current','page');
    if(document.body.classList.contains('buyer-home')){
      const seller=document.createElement('a');seller.href='become-seller.html';seller.className='buyer-seller-link';seller.textContent='Switch to Seller';
      document.querySelector('header .brand')?.appendChild(seller);
      return;
    }
    const bar=document.querySelector('header .bar');
    if(!bar)return;
    const actions=document.createElement('div');actions.className='buyer-header-actions';
    for(const child of [...bar.children])if(!child.classList.contains('brand'))actions.appendChild(child);
    const back=document.createElement('button');back.className='buyer-back';back.type='button';back.textContent='Back';
    back.onclick=()=>{if(history.length>1&&document.referrer.startsWith(location.origin+'/'))history.back();else location.href='index.html'};
    actions.prepend(back);bar.appendChild(actions);
    if(!actions.querySelector('[href="cart.html"],[onclick*="cart.html"]'))actions.appendChild(cartLink);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
