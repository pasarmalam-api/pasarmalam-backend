(function(){
  const base='https://pasarmalam-backend.onrender.com';
  const page=location.pathname.split('/').pop()||'index.html';
  const publicPages=new Set(['index.html','login.html','register.html','thank-you.html','policies.html']);
  function user(){try{return JSON.parse(localStorage.getItem('pm_user')||'{}')}catch(e){return {}}}
  function signedIn(){return Boolean(localStorage.getItem('pm_token'))&&user().role==='seller'}
  function escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  window.PMSellerSession={signedIn,escape};
  const originalFetch=window.fetch;
  let expired=false;
  window.fetch=async function(input,options){
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    let settings=options;
    if(url.origin===base){
      const headers=new Headers(options&&options.headers||input.headers||{});
      if(signedIn()&&!headers.has('Authorization'))headers.set('Authorization','Bearer '+localStorage.getItem('pm_token'));
      settings={...options,headers};
    }
    const response=await originalFetch.call(this,input,settings);
    if(url.origin===base&&response.ok&&settings?.method&&settings.method!=='GET')window.dispatchEvent(new Event('seller-data-changed'));
    const loginRequired=url.origin===base&&(response.status===401||(response.status===403&&(await response.clone().json().catch(()=>({}))).error==='Login required'));
    if(loginRequired&&signedIn()&&!expired){
      expired=true;localStorage.removeItem('pm_token');localStorage.removeItem('pm_user');
      location.replace('login.html?next='+encodeURIComponent(page));
    }
    return response;
  };
  function init(){
    const active=signedIn();
    document.querySelectorAll('a[href],button[onclick]').forEach(el=>{
      const target=el.getAttribute('href')||el.getAttribute('onclick')||'';
      if(/(?:login|register)\.html/.test(target)&&active)el.hidden=true;
    });
    if(page==='login.html'){
      const login=document.querySelector('main .two');if(login)login.hidden=active;
      const password=document.getElementById('currentPassword');if(password)password.closest('section').hidden=!active;
      if(active){const heading=document.querySelector('header h2');if(heading)heading.textContent='Settings';const subtitle=document.querySelector('header .top span');if(subtitle)subtitle.textContent=''}
    }
    const nav=document.querySelector('aside nav');
    if(active&&nav){
      const password=document.createElement('a');password.href='login.html';password.textContent='Change Password';nav.append(password);
      const logout=document.createElement('button');logout.className='soft';logout.type='button';logout.textContent='Sign Out';
      logout.onclick=()=>{localStorage.removeItem('pm_token');localStorage.removeItem('pm_user');location.replace('login.html')};nav.append(logout);
    }
    if(!publicPages.has(page)&&!active)return;
    document.querySelectorAll('table').forEach(table=>{const wrap=document.createElement('div');wrap.className='seller-table-scroll';table.before(wrap);wrap.append(table)});
  }
  document.addEventListener('DOMContentLoaded',init);
})();
