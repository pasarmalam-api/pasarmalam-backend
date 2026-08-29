(function(){
  const API="https://pasarmalam-backend.onrender.com";
  const LANG_KEY="pasarmalam-lang";
  const SELLER_URL="https://www.pasarmalamapp.com/seller.html";
  const labels={ms:"Bahasa: Melayu",en:"Language: English",zh:"\u8bed\u8a00\uff1a\u4e2d\u6587"};
  const dictionary={
    ms:{
      "Home":"Laman Utama","Sell":"Jual","Seller":"Penjual","Buyer":"Pembeli","Categories":"Kategori","Vouchers":"Voucher","Photo Search":"Carian Foto","AI Assistant":"Pembantu AI","Cart":"Troli","Checkout":"Bayar","Orders":"Pesanan","Shipping":"Penghantaran","Payment":"Bayaran","Return / Refund":"Pulangan / Refund","Wishlist":"Senarai Hajat","Chat":"Chat","Privacy & Terms":"Privasi & Terma","Policies":"Polisi","Me":"Saya","Support":"Sokongan","Profile":"Profil","Buyer App":"Aplikasi Pembeli","Buyer Sign In":"Log Masuk Pembeli","Buyer Profile":"Profil Pembeli","Create Account":"Daftar Akaun","Reset Password":"Tetap Semula Kata Laluan","Login":"Log Masuk","Logout":"Log Keluar","Save Profile":"Simpan Profil","Open Policies":"Buka Polisi","Contact Support":"Hubungi Sokongan","Switch to Seller":"Tukar ke Penjual","Switch to Seller Centre":"Tukar ke Pusat Penjual","Open App":"Buka Aplikasi","SELLER":"PENJUAL","Get PasarMalam":"Muat Turun PasarMalam","Install the marketplace app from Google Play.":"Pasang aplikasi marketplace daripada Google Play.","Quick Actions":"Tindakan Pantas","Open each buyer flow on its own page":"Buka setiap aliran pembeli di halaman berasingan","Browse":"Cari Produk","Returns":"Pulangan","Buyer Account":"Akaun Pembeli","Sign in with email":"Log masuk dengan emel","Sign up with email OTP":"Daftar dengan OTP emel","Open Sign In":"Buka Log Masuk","Search Filters":"Penapis Carian","Location":"Lokasi","Min RM":"Min RM","Max RM":"Maks RM","All":"Semua","New":"Baharu","Used":"Terpakai","Any rating":"Sebarang rating","4 star up":"4 bintang ke atas","5 star":"5 bintang","In-Store Pickup":"Ambil Sendiri","Lalamove Regular":"Lalamove Biasa","Lalamove Instant":"Lalamove Segera","Search by Photo":"Cari dengan Foto","Search by photo":"Cari dengan foto","Open search and filters":"Buka carian dan penapis","Daily Discover":"Cadangan Harian","Product detail, variants, warranty, reviews":"Butiran produk, variasi, waranti, ulasan","Add to cart":"Tambah troli","Fixed price":"Harga tetap","Negotiable price":"Harga boleh nego","sold":"terjual","No orders yet":"Belum ada pesanan","No return request":"Belum ada permintaan pulangan","No messages":"Belum ada mesej","Added to wishlist":"Ditambah ke senarai hajat","Send":"Hantar","Submit Review":"Hantar Ulasan","Review title":"Tajuk ulasan","Write review":"Tulis ulasan","Cart is empty":"Troli kosong","Delivery address":"Alamat penghantaran","Confirm Payment":"Sahkan Bayaran","Order Tracking":"Penjejakan Pesanan","Placed":"Dibuat","Paid":"Dibayar","Packed":"Dibungkus","Shipped":"Dihantar","Delivered":"Diterima","Completed":"Selesai"
    },
    en:{},
    zh:{
      "Home":"\u9996\u9875","Sell":"\u5356","Seller":"\u5356\u5bb6","Buyer":"\u4e70\u5bb6","Categories":"\u5206\u7c7b","Vouchers":"\u4f18\u60e0\u5238","Photo Search":"\u7167\u7247\u641c\u7d22","AI Assistant":"AI \u52a9\u624b","Cart":"\u8d2d\u7269\u8f66","Checkout":"\u7ed3\u8d26","Orders":"\u8ba2\u5355","Shipping":"\u914d\u9001","Payment":"\u4ed8\u6b3e","Return / Refund":"\u9000\u8d27 / \u9000\u6b3e","Wishlist":"\u6536\u85cf","Chat":"\u804a\u5929","Privacy & Terms":"\u9690\u79c1\u4e0e\u6761\u6b3e","Policies":"\u653f\u7b56","Me":"\u6211","Support":"\u652f\u6301","Profile":"\u4e2a\u4eba\u8d44\u6599","Buyer App":"\u4e70\u5bb6\u5e94\u7528","Buyer Sign In":"\u4e70\u5bb6\u767b\u5f55","Buyer Profile":"\u4e70\u5bb6\u8d44\u6599","Create Account":"\u521b\u5efa\u8d26\u6237","Reset Password":"\u91cd\u7f6e\u5bc6\u7801","Login":"\u767b\u5f55","Logout":"\u9000\u51fa","Save Profile":"\u4fdd\u5b58\u8d44\u6599","Open Policies":"\u6253\u5f00\u653f\u7b56","Contact Support":"\u8054\u7cfb\u652f\u6301","Switch to Seller":"\u5207\u6362\u5230\u5356\u5bb6","Switch to Seller Centre":"\u5207\u6362\u5230\u5356\u5bb6\u4e2d\u5fc3","Open App":"\u6253\u5f00\u5e94\u7528","SELLER":"\u5356\u5bb6","Get PasarMalam":"\u4e0b\u8f7d PasarMalam","Install the marketplace app from Google Play.":"\u4ece Google Play \u5b89\u88c5\u5e02\u96c6\u5e94\u7528\u3002","Quick Actions":"\u5feb\u6377\u64cd\u4f5c","Open each buyer flow on its own page":"\u5728\u72ec\u7acb\u9875\u9762\u6253\u5f00\u6bcf\u4e2a\u4e70\u5bb6\u6d41\u7a0b","Browse":"\u6d4f\u89c8","Returns":"\u9000\u8d27","Buyer Account":"\u4e70\u5bb6\u8d26\u6237","Sign in with email":"\u7528\u7535\u90ae\u767b\u5f55","Sign up with email OTP":"\u7528\u7535\u90ae OTP \u6ce8\u518c","Open Sign In":"\u6253\u5f00\u767b\u5f55","Search Filters":"\u641c\u7d22\u7b5b\u9009","Location":"\u4f4d\u7f6e","Min RM":"\u6700\u4f4e RM","Max RM":"\u6700\u9ad8 RM","All":"\u5168\u90e8","New":"\u65b0\u54c1","Used":"\u4e8c\u624b","Any rating":"\u4efb\u4f55\u8bc4\u5206","4 star up":"4 \u661f\u4ee5\u4e0a","5 star":"5 \u661f","In-Store Pickup":"\u81ea\u53d6","Lalamove Regular":"Lalamove \u666e\u901a","Lalamove Instant":"Lalamove \u5373\u65f6","Search by Photo":"\u7528\u7167\u7247\u641c\u7d22","Search by photo":"\u7528\u7167\u7247\u641c\u7d22","Open search and filters":"\u6253\u5f00\u641c\u7d22\u548c\u7b5b\u9009","Daily Discover":"\u6bcf\u65e5\u53d1\u73b0","Product detail, variants, warranty, reviews":"\u5546\u54c1\u8be6\u60c5\u3001\u89c4\u683c\u3001\u4fdd\u4fee\u3001\u8bc4\u4ef7","Add to cart":"\u52a0\u5165\u8d2d\u7269\u8f66","Fixed price":"\u56fa\u5b9a\u4ef7","Negotiable price":"\u53ef\u8bae\u4ef7","sold":"\u5df2\u552e","No orders yet":"\u6682\u65e0\u8ba2\u5355","No return request":"\u6682\u65e0\u9000\u8d27\u7533\u8bf7","No messages":"\u6682\u65e0\u6d88\u606f","Added to wishlist":"\u5df2\u52a0\u5165\u6536\u85cf","Send":"\u53d1\u9001","Submit Review":"\u63d0\u4ea4\u8bc4\u4ef7","Review title":"\u8bc4\u4ef7\u6807\u9898","Write review":"\u5199\u8bc4\u4ef7","Cart is empty":"\u8d2d\u7269\u8f66\u4e3a\u7a7a","Delivery address":"\u914d\u9001\u5730\u5740","Confirm Payment":"\u786e\u8ba4\u4ed8\u6b3e","Order Tracking":"\u8ba2\u5355\u8ddf\u8e2a","Placed":"\u5df2\u4e0b\u5355","Paid":"\u5df2\u4ed8\u6b3e","Packed":"\u5df2\u6253\u5305","Shipped":"\u5df2\u53d1\u8d27","Delivered":"\u5df2\u9001\u8fbe","Completed":"\u5df2\u5b8c\u6210"
    }
  };
  Object.keys(dictionary.ms).forEach(key=>{dictionary.en[key]=key});
  const css=".pm-badge{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:999px;background:#f6c85f;color:#182236;padding:0 6px;font-size:12px;font-weight:900;margin-left:5px}.pm-badge.hide{display:none}.pm-seller-switch{position:fixed;right:22px;bottom:22px;z-index:30;border:0;border-radius:999px;background:linear-gradient(135deg,#0f9f8f,#6d5dfc);color:#fff;box-shadow:0 10px 26px #0003;min-height:44px;padding:0 15px;font-weight:900;font-size:13px}.pm-policy-link{position:fixed;left:22px;bottom:22px;z-index:30;border:1px solid #dbe4ea;border-radius:999px;background:#fff;color:#0f9f8f;box-shadow:0 10px 26px #0002;min-height:38px;padding:0 13px;font-weight:900;font-size:12px;display:inline-flex;align-items:center;text-decoration:none}.buyer-lang-toggle{border:1px solid #dbe4ea;border-radius:999px;background:#fff;color:#0f9f8f;font-weight:900;font-size:12px;min-height:34px;padding:0 10px}.pm-seller-switch:hover,.pm-policy-link:hover{filter:brightness(.98)}@media(max-width:760px){.pm-mobile-links{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 8px 0}.pm-mobile-links .pm-seller-switch,.pm-mobile-links .pm-policy-link{position:static;left:auto;right:auto;bottom:auto;z-index:1;box-shadow:none;width:100%;justify-content:center;min-height:42px;border-radius:8px}.pm-mobile-links .pm-policy-link{border:1px solid #dbe4ea}.pm-mobile-links .pm-seller-switch{border:0}}";
  const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
  function token(){return localStorage.getItem("pm_token")||""}
  function currentLang(){const stored=localStorage.getItem(LANG_KEY);if(stored==="ms"||stored==="en"||stored==="zh")return stored;localStorage.setItem(LANG_KEY,"ms");return"ms"}
  function sourceMap(){const map={};[dictionary.ms,dictionary.en,dictionary.zh].forEach(group=>Object.entries(group).forEach(([key,value])=>{map[value]=key}));return map}
  function translateString(value){
    const raw=String(value||"").trim();
    if(!raw)return raw;
    const lookup=sourceMap(),lang=currentLang(),key=lookup[raw]||raw;
    return (dictionary[lang]&&dictionary[lang][key])||raw;
  }
  function applyLanguage(){
    const lang=currentLang(),lookup=sourceMap();
    document.documentElement.lang=lang;
    document.querySelectorAll("#langToggle,.buyer-lang-toggle").forEach(button=>{button.textContent=labels[lang]});
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(node){if(!node.nodeValue.trim())return NodeFilter.FILTER_REJECT;if(node.parentElement&&["SCRIPT","STYLE","TEXTAREA"].includes(node.parentElement.tagName))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const raw=node.nodeValue.trim(),key=lookup[raw]||raw,next=(dictionary[lang]&&dictionary[lang][key])||raw;if(next!==raw)node.nodeValue=node.nodeValue.replace(raw,next)});
    document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(el=>{const raw=el.getAttribute("placeholder"),key=lookup[raw]||raw,next=(dictionary[lang]&&dictionary[lang][key])||raw;if(next!==raw)el.setAttribute("placeholder",next)});
  }
  function ensureLanguageButton(){
    const existing=document.querySelector("#langToggle,.buyer-lang-toggle");
    if(existing){existing.onclick=cycleLanguage;return}
    const button=document.createElement("button");
    button.type="button";button.className="buyer-lang-toggle";button.onclick=cycleLanguage;
    const brand=document.querySelector(".brand");
    if(brand&&brand.parentElement)brand.parentElement.appendChild(button);else document.body.prepend(button);
  }
  function cycleLanguage(){
    const lang=currentLang(),next=lang==="ms"?"en":lang==="en"?"zh":"ms";
    localStorage.setItem(LANG_KEY,next);
    if(window.currentLang!==undefined)window.currentLang=next;
    if(typeof window.pmRefreshBuyerLanguage==="function")window.pmRefreshBuyerLanguage(next);
    applyLanguage();
  }
  function addSellerSwitch(){
    if(document.querySelector(".pm-seller-switch"))return;
    const holder=mobileHolder();
    const btn=document.createElement("button");
    btn.type="button";btn.className="pm-seller-switch";btn.textContent=translateString("Switch to Seller");
    btn.onclick=()=>{location.href=SELLER_URL};
    holder.appendChild(btn);
  }
  function addPolicyLink(){
    if(document.querySelector(".pm-policy-link"))return;
    const holder=mobileHolder();
    const link=document.createElement("a");
    link.className="pm-policy-link";link.href="policies.html";link.textContent=translateString("Policies");
    holder.appendChild(link);
  }
  function mobileHolder(){
    if(window.matchMedia("(max-width:760px)").matches){
      let holder=document.querySelector(".pm-mobile-links");
      if(!holder){
        holder=document.createElement("div");
        holder.className="pm-mobile-links";
        const nav=document.querySelector(".bottom-nav");
        if(nav&&nav.parentNode)nav.parentNode.insertBefore(holder,nav);
        else document.body.appendChild(holder);
      }
      return holder;
    }
    return document.body;
  }
  function add(target,count){
    document.querySelectorAll(target).forEach(el=>{
      let b=el.querySelector(".pm-badge");if(!b){b=document.createElement("span");b.className="pm-badge";el.appendChild(b)}
      b.textContent=count>99?"99+":count;b.classList.toggle("hide",!count);
    });
  }
  async function load(){
    try{
      if(!token())return;
      const r=await fetch(API+"/api/notifications",{headers:{Authorization:"Bearer "+token()}});
      const d=await r.json();const rows=(d.notifications||[]).filter(n=>!Number(n.read_at||0));
      const count=fn=>rows.filter(fn).length;
      add('a[href="notifications.html"],button[onclick*="notifications.html"]',rows.length);
      add('button[onclick*="orders.html"],a[href="orders.html"]',count(n=>["order","payment"].includes(n.type)||String(n.target_url||"").includes("orders")));
      add('button[onclick*="returns.html"],a[href="returns.html"]',count(n=>n.type==="return"||String(n.target_url||"").includes("returns")));
      add('button[onclick*="chat.html"],a[href="chat.html"]',count(n=>n.type==="message"||String(n.target_url||"").includes("chat")));
      add('button[onclick*="support.html"],a[href="support.html"]',count(n=>n.type==="support"||String(n.target_url||"").includes("support")));
    }catch(e){}
  }
  function init(){ensureLanguageButton();addSellerSwitch();addPolicyLink();applyLanguage();setTimeout(()=>{load();applyLanguage()},300)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
  let languageTimer=0;
  new MutationObserver(()=>{clearTimeout(languageTimer);languageTimer=setTimeout(applyLanguage,120)}).observe(document.documentElement,{childList:true,subtree:true});
})();
