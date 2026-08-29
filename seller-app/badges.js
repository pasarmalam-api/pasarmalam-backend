(function(){
  const LANG_KEY="pasarmalam-lang";
  const labels={ms:"Bahasa: Melayu",en:"Language: English",zh:"语言：中文"};
  const dictionary={
    ms:{"Seller Centre":"Pusat Penjual","Dashboard":"Papan Pemuka","Sign In":"Log Masuk","Register Seller":"Daftar Penjual","Business Verification":"Pengesahan Perniagaan","Products":"Produk","Add Product":"Tambah Produk","AI Listing Helper":"Pembantu AI Listing","Orders":"Pesanan","Returns":"Pulangan","Messages":"Mesej","Logistics":"Logistik","Wallet":"Dompet","Campaigns":"Promosi","Reviews":"Ulasan","Performance":"Prestasi","Notifications":"Notifikasi","Support":"Sokongan","Settings":"Tetapan","Policies":"Polisi","Menu":"Menu","Close":"Tutup","Merchant Dashboard":"Papan Pemuka Penjual","Manage listings, orders, returns, chat, logistics and payouts.":"Urus listing, pesanan, pulangan, chat, logistik dan bayaran penjual.","Search product, category or shop":"Cari produk, kategori atau kedai","Register":"Daftar","AI Helper":"Pembantu AI","PasarMalam mobile app":"Aplikasi mudah alih PasarMalam","Install PasarMalam from Google Play.":"Pasang PasarMalam daripada Google Play.","Professional seller workspace for PasarMalam merchants":"Ruang kerja penjual profesional untuk peniaga PasarMalam","Track sales, publish products with photos, manage shipping, reply to buyers and handle refunds from one dashboard.":"Jejaki jualan, terbitkan produk dengan foto, urus penghantaran, balas pembeli dan kendalikan bayaran balik dalam satu papan pemuka.","Live Products":"Produk Aktif","Gross Sales":"Jualan Kasar","Store Rating":"Rating Kedai","Product Management":"Pengurusan Produk","Order Processing":"Proses Pesanan","Logistics / AWB":"Logistik / AWB","Campaign Tools":"Alat Promosi","Product Listings":"Listing Produk","Open Products":"Buka Produk","Wallet / Settlement":"Dompet / Settlement","Refresh":"Segar Semula","Orders To Handle":"Pesanan Untuk Diurus","Open Orders":"Buka Pesanan","Returns / Disputes":"Pulangan / Pertikaian","Open Returns":"Buka Pulangan","Buyer Messages":"Mesej Pembeli","Reply":"Balas","Logistics Rate":"Kadar Logistik","View":"Lihat"},
    en:{},
    zh:{"Seller Centre":"卖家中心","Dashboard":"仪表板","Sign In":"登录","Register Seller":"注册卖家","Business Verification":"商家验证","Products":"商品","Add Product":"添加商品","AI Listing Helper":"AI 商品助手","Orders":"订单","Returns":"退货","Messages":"消息","Logistics":"物流","Wallet":"钱包","Campaigns":"促销","Reviews":"评价","Performance":"表现","Notifications":"通知","Support":"客服","Settings":"设置","Policies":"政策","Menu":"菜单","Close":"关闭","Merchant Dashboard":"卖家仪表板","Manage listings, orders, returns, chat, logistics and payouts.":"管理商品、订单、退货、聊天、物流和卖家付款。","Search product, category or shop":"搜索商品、分类或店铺","Register":"注册","AI Helper":"AI 助手","PasarMalam mobile app":"PasarMalam 手机应用","Install PasarMalam from Google Play.":"从 Google Play 安装 PasarMalam。","Professional seller workspace for PasarMalam merchants":"PasarMalam 商家的专业卖家工作台","Track sales, publish products with photos, manage shipping, reply to buyers and handle refunds from one dashboard.":"在一个仪表板中跟踪销售、发布商品照片、管理配送、回复买家并处理退款。","Live Products":"在线商品","Gross Sales":"总销售额","Store Rating":"店铺评分","Product Management":"商品管理","Order Processing":"订单处理","Logistics / AWB":"物流 / AWB","Campaign Tools":"促销工具","Product Listings":"商品列表","Open Products":"打开商品","Wallet / Settlement":"钱包 / 结算","Refresh":"刷新","Orders To Handle":"待处理订单","Open Orders":"打开订单","Returns / Disputes":"退货 / 纠纷","Open Returns":"打开退货","Buyer Messages":"买家消息","Reply":"回复","Logistics Rate":"物流费率","View":"查看"}
  };
  Object.keys(dictionary.ms).forEach(key=>{dictionary.en[key]=key});
  Object.assign(dictionary.ms,{"Launch Commission Structure":"Struktur Komisen Pelancaran","No RM0.50 order fee during launch":"Tiada yuran pesanan RM0.50 semasa pelancaran","Seller Type":"Jenis Penjual","Commission":"Komisen","New seller first 30 days":"Penjual baharu 30 hari pertama","Basic seller after 30 days":"Penjual asas selepas 30 hari","Verified SSM seller":"Penjual SSM disahkan","High-volume seller":"Penjual volume tinggi","Fixed platform/order fee":"Yuran tetap platform/pesanan","3% negotiated":"3% boleh dirunding","RM0.00 for launch":"RM0.00 semasa pelancaran","Product":"Produk","Price":"Harga","Stock":"Stok","Status":"Status","Action":"Tindakan","New":"Baharu","Used":"Terpakai","Edit":"Edit","No orders yet.":"Belum ada pesanan.","No return requests.":"Belum ada permintaan pulangan.","No messages.":"Belum ada mesej.","No campaigns yet.":"Belum ada promosi.","No reviews yet.":"Belum ada ulasan.","Open":"Buka","Save":"Simpan","Send":"Hantar","Submit":"Hantar","Cancel":"Batal","Delete":"Padam"});
  Object.assign(dictionary.zh,{"Launch Commission Structure":"上线佣金结构","No RM0.50 order fee during launch":"上线期间无 RM0.50 订单费","Seller Type":"卖家类型","Commission":"佣金","New seller first 30 days":"新卖家前 30 天","Basic seller after 30 days":"30 天后普通卖家","Verified SSM seller":"已验证 SSM 卖家","High-volume seller":"高销量卖家","Fixed platform/order fee":"固定平台/订单费","3% negotiated":"3% 可协商","RM0.00 for launch":"上线期间 RM0.00","Product":"商品","Price":"价格","Stock":"库存","Status":"状态","Action":"操作","New":"新品","Used":"二手","Edit":"编辑","No orders yet.":"暂无订单。","No return requests.":"暂无退货请求。","No messages.":"暂无消息。","No campaigns yet.":"暂无促销。","No reviews yet.":"暂无评价。","Open":"打开","Save":"保存","Send":"发送","Submit":"提交","Cancel":"取消","Delete":"删除"});
  Object.keys(dictionary.ms).forEach(key=>{dictionary.en[key]=key});
  function currentLang(){const stored=localStorage.getItem(LANG_KEY);if(stored==="ms"||stored==="en"||stored==="zh")return stored;localStorage.setItem(LANG_KEY,"ms");return"ms"}
  function sourceMap(){const map={};[dictionary.ms,dictionary.en,dictionary.zh].forEach(group=>Object.entries(group).forEach(([key,value])=>{map[value]=key}));return map}
  function applyLanguage(){
    const lang=currentLang(),lookup=sourceMap();
    document.documentElement.lang=lang;
    document.querySelectorAll(".seller-lang-toggle").forEach(button=>{if(button.textContent!==labels[lang])button.textContent=labels[lang]});
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(node){if(!node.nodeValue.trim())return NodeFilter.FILTER_REJECT;if(node.parentElement&&["SCRIPT","STYLE","TEXTAREA"].includes(node.parentElement.tagName))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const raw=node.nodeValue.trim(),key=lookup[raw]||raw,next=(dictionary[lang]&&dictionary[lang][key])||raw;if(next!==raw)node.nodeValue=node.nodeValue.replace(raw,next)});
    document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(el=>{const raw=el.getAttribute("placeholder"),key=lookup[raw]||raw,next=(dictionary[lang]&&dictionary[lang][key])||raw;if(next!==raw)el.setAttribute("placeholder",next)});
  }
  function setupLanguage(){
    if(!document.querySelector(".seller-lang-toggle")){
      const button=document.createElement("button");
      button.type="button";
      button.className="seller-lang-toggle";
      button.textContent=labels[currentLang()];
      button.addEventListener("click",()=>{const lang=currentLang(),next=lang==="ms"?"en":lang==="en"?"zh":"ms";localStorage.setItem(LANG_KEY,next);applyLanguage()});
      const brand=document.querySelector("aside .brand");
      if(brand)brand.insertAdjacentElement("afterend",button);else document.body.prepend(button);
    }
    applyLanguage();
  }
  function setupMobileMenu(){
    const aside=document.querySelector("aside");
    const nav=aside&&aside.querySelector("nav");
    const brand=aside&&aside.querySelector(".brand");
    if(!aside||!nav||!brand||aside.querySelector(".seller-menu-toggle"))return;
    const button=document.createElement("button");
    button.type="button";
    button.className="seller-menu-toggle";
    button.setAttribute("aria-expanded","false");
    button.textContent="Menu";
    brand.insertAdjacentElement("afterend",button);
    const backdrop=document.createElement("div");
    backdrop.className="seller-menu-backdrop";
    aside.insertAdjacentElement("afterend",backdrop);
    const close=()=>{aside.classList.remove("seller-menu-open");document.body.classList.remove("seller-menu-locked");button.setAttribute("aria-expanded","false");button.textContent=(dictionary[currentLang()]||dictionary.ms).Menu||"Menu"};
    const open=()=>{aside.classList.add("seller-menu-open");document.body.classList.add("seller-menu-locked");button.setAttribute("aria-expanded","true");button.textContent=(dictionary[currentLang()]||dictionary.ms).Close||"Tutup"};
    button.addEventListener("click",()=>aside.classList.contains("seller-menu-open")?close():open());
    backdrop.addEventListener("click",close);
    nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));
    document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
    window.addEventListener("resize",()=>{if(window.innerWidth>980)close()});
  }
  function init(){setupLanguage();setupMobileMenu();setTimeout(applyLanguage,300)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
  const API="https://pasarmalam-backend.onrender.com";
  function token(){return localStorage.getItem("pm_token")||""}
  function add(href,count){
    document.querySelectorAll(`nav a[href="${href}"]`).forEach(a=>{
      let b=a.querySelector(".badge-count");if(!b){b=document.createElement("span");b.className="badge-count";a.appendChild(b)}
      b.textContent=count>99?"99+":count;b.classList.toggle("show",count>0);
    });
  }
  async function load(){
    try{
      if(!token())return;
      const r=await fetch(API+"/api/notifications",{headers:{Authorization:"Bearer "+token()}});
      const d=await r.json();const rows=(d.notifications||[]).filter(n=>!Number(n.read_at||0));
      const count=fn=>rows.filter(fn).length;
      add("notifications.html",rows.length);
      add("orders.html",count(n=>["order","payment"].includes(n.type)||String(n.target_url||"").includes("orders")));
      add("returns.html",count(n=>n.type==="return"||String(n.target_url||"").includes("returns")));
      add("messages.html",count(n=>n.type==="message"||String(n.target_url||"").includes("messages")));
      add("wallet.html",count(n=>n.type==="wallet"||String(n.target_url||"").includes("wallet")));
      add("support.html",count(n=>n.type==="support"||String(n.target_url||"").includes("support")));
    }catch(e){}
  }
  setTimeout(()=>{load();applyLanguage()},300);
  let languageTimer=0;
  new MutationObserver(()=>{clearTimeout(languageTimer);languageTimer=setTimeout(applyLanguage,120)}).observe(document.documentElement,{childList:true,subtree:true});
})();

