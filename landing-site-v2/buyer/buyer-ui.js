(function(){
  function init(){
    if(document.body.classList.contains('buyer-home'))return;
    const bar=document.querySelector('header .bar');
    if(!bar)return;
    const actions=document.createElement('div');actions.className='buyer-header-actions';
    for(const child of [...bar.children])if(!child.classList.contains('brand'))actions.appendChild(child);
    const back=document.createElement('button');back.className='buyer-back';back.type='button';back.textContent='Back';
    back.onclick=()=>{if(history.length>1&&document.referrer.startsWith(location.origin+'/'))history.back();else location.href='index.html'};
    actions.prepend(back);bar.appendChild(actions);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
