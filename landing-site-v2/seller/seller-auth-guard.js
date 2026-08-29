(function(){
  const publicPages=new Set(["index.html","login.html","register.html","policies.html"]);
  const page=(location.pathname.split("/").pop()||"index.html").toLowerCase();
  if(publicPages.has(page))return;

  function getStored(key){
    try{return window.localStorage&&window.localStorage.getItem(key)}catch(e){return""}
  }
  const LANG_KEY="pasarmalam-lang";
  const lang=(()=>{const stored=getStored(LANG_KEY);return stored==="en"||stored==="zh"?stored:"ms"})();
  const copy={
    ms:{
      logo:"PM",
      brand:"PasarMalam",
      title:"Log masuk penjual diperlukan",
      body:"Sila log masuk sebelum membuka pesanan, produk, pulangan, dompet, mesej, logistik atau tetapan penjual.",
      button:"Log Masuk"
    },
    en:{
      logo:"PM",
      brand:"PasarMalam",
      title:"Seller sign-in required",
      body:"Please sign in before opening seller orders, products, returns, wallet, messages, logistics or settings.",
      button:"Sign In"
    },
    zh:{
      logo:"PM",
      brand:"PasarMalam",
      title:"需要卖家登录",
      body:"请先登录，然后再打开卖家订单、商品、退货、钱包、消息、物流或设置。",
      button:"登录"
    }
  }[lang];

  let user={};
  try{user=JSON.parse(getStored("pm_user")||"{}")}catch(e){user={}}
  const token=getStored("pm_token")||"";
  const isSeller=Boolean(token)&&(!user.role||user.role==="seller"||user.role==="admin");
  if(isSeller)return;

  window.PM_SELLER_AUTH_REQUIRED=true;
  const loginUrl="login.html?next="+encodeURIComponent(page);
  const originalFetch=window.fetch;
  window.fetch=function(input,init){
    const target=String((input&&input.url)||input||"");
    if(target.includes("pasarmalam-backend.onrender.com")){
      return Promise.reject(new Error(copy.title));
    }
    return originalFetch.call(this,input,init);
  };

  function showLocked(){
    document.documentElement.lang=lang;
    document.body.innerHTML='<main class="auth-lock" role="main"><div class="logo">'+copy.logo+'</div><h1>'+copy.brand+'</h1><h2>'+copy.title+'</h2><p>'+copy.body+'</p><button type="button" id="sellerLoginButton">'+copy.button+'</button></main>';
    document.getElementById("sellerLoginButton").addEventListener("click",()=>{location.href=loginUrl});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",showLocked);
  else showLocked();
})();
