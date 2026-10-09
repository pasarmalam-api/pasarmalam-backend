(function(){
  function destination(){
    const next=new URLSearchParams(location.search).get('next')||'index.html';
    return /^[a-z-]+\.html(?:\?[^#]*)?$/.test(next)&&!/^(login|signup|password-reset)\.html/.test(next)?next:'index.html';
  }
  window.pmAuthDestination=destination;
  window.pmSignOut=function(){
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_user');
    localStorage.removeItem('pm_last_checkout');
    window.location.replace('index.html');
  };
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
    if(['login.html','signup.html'].includes(page)){
      const next=encodeURIComponent(destination());
      document.querySelectorAll('a[href="login.html"],a[href="signup.html"]').forEach(a=>a.href=a.getAttribute('href')+'?next='+next);
      document.querySelectorAll('button[onclick]').forEach(button=>{
        if(button.getAttribute('onclick')==="location.href='login.html'")button.onclick=()=>location.href='login.html?next='+next;
      });
    }
    document.querySelector('.bottom-nav')?.remove();
    const nav=document.createElement('nav');nav.className='buyer-navigation';nav.setAttribute('aria-label','Buyer navigation');
    const routes=[['index.html','Home'],['category.html','Categories'],['chat.html','Chat'],['orders.html','Orders'],['profile.html','Me']];
    const group={'product.html':'category.html','seller-store.html':'category.html','order-detail.html':'orders.html','receipt.html':'orders.html','order-confirmation.html':'orders.html','returns.html':'orders.html','login.html':'profile.html','signup.html':'profile.html','password-reset.html':'profile.html'};
    routes.forEach(([href,label])=>{const a=document.createElement('a');a.href=href;a.textContent=label;if((group[page]||page)===href)a.setAttribute('aria-current','page');nav.appendChild(a)});
    document.querySelector('header')?.after(nav);
    const account=document.createElement('nav');account.className='buyer-account-bar';account.setAttribute('aria-label','Account access');
    document.querySelector('header .bar')?.before(account);
    let accountState='';
    function updateAccount(){
      const signedIn=!!localStorage.getItem('pm_token');
      const lang=localStorage.getItem('pasarmalam-lang')||'ms';
      const state=String(signedIn)+':'+lang;
      if(accountState===state)return;
      accountState=state;
      const labels=lang==='ms'?['Log Masuk','Daftar','Akaun Saya','Log Keluar']:lang==='zh'?['\u767b\u5f55','\u6ce8\u518c','\u6211\u7684\u8d26\u6237','\u9000\u51fa']:['Sign In','Sign Up','My Account','Sign Out'];
      account.replaceChildren();
      const home=document.createElement('a');home.href='index.html';home.textContent='PasarMalam';home.className='account-home';account.append(home);
      const target=['login.html','signup.html','password-reset.html'].includes(page)?destination():page+location.search;
      const link=document.createElement('a');link.href=signedIn?'profile.html':'login.html?next='+encodeURIComponent(target);link.textContent=labels[signedIn?2:0];account.append(link);
      const action=document.createElement(signedIn?'button':'a');action.textContent=labels[signedIn?3:1];
      if(signedIn){action.type='button';action.onclick=window.pmSignOut;}else action.href='signup.html?next='+encodeURIComponent(target);
      account.append(action);
      const me=nav.querySelector('a[href="profile.html"],a[data-account-nav]');
      if(me){me.dataset.accountNav='true';me.href=signedIn?'profile.html':'login.html?next=profile.html';me.textContent=signedIn?'Me':labels[0];}
    }
    updateAccount();
    const initialToken=localStorage.getItem('pm_token');
    window.addEventListener('pageshow',()=>{
      if(localStorage.getItem('pm_token')!==initialToken){window.location.reload();return;}
      updateAccount();
    });
    window.addEventListener('storage',event=>{if(['pm_token','pm_user',null].includes(event.key))window.location.reload();});
    new MutationObserver(updateAccount).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    if(document.body.matches('.buyer-home,.buyer-product')){
      const main=document.querySelector('main');
      const moveExtras=()=>document.querySelectorAll('body>.pm-mobile-links,body>.pm-notify-enable').forEach(el=>main?.appendChild(el));
      moveExtras();
      new MutationObserver(moveExtras).observe(document.body,{childList:true});
    }
    const cartLink=document.createElement('a');cartLink.href='cart.html';cartLink.className='buyer-cart-link';cartLink.textContent='Cart';
    if(page==='cart.html')cartLink.setAttribute('aria-current','page');
    if(document.body.classList.contains('buyer-home')){
      document.querySelector('#search')?.setAttribute('placeholder','Search products');
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
