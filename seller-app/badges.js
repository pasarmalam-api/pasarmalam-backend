(function(){
  const LANG_KEY="pasarmalam-lang";
  const labels={ms:"Bahasa: Melayu",en:"Language: English",zh:"\u8bed\u8a00\uff1a\u4e2d\u6587"};
  const dictionary={
    ms:{"Seller Centre":"Pusat Penjual","Dashboard":"Papan Pemuka","Sign In":"Log Masuk","Register Seller":"Daftar Penjual","Business Verification":"Pengesahan Perniagaan","Products":"Produk","Add Product":"Tambah Produk","AI Listing Helper":"Pembantu AI Listing","Orders":"Pesanan","Returns":"Pulangan","Messages":"Mesej","Logistics":"Logistik","Wallet":"Dompet","Campaigns":"Promosi","Reviews":"Ulasan","Performance":"Prestasi","Notifications":"Notifikasi","Support":"Sokongan","Settings":"Tetapan","Policies":"Polisi","Menu":"Menu","Close":"Tutup","Merchant Dashboard":"Papan Pemuka Penjual","Manage listings, orders, returns, chat, logistics and payouts.":"Urus listing, pesanan, pulangan, chat, logistik dan bayaran penjual.","Search product, category or shop":"Cari produk, kategori atau kedai","Register":"Daftar","AI Helper":"Pembantu AI","PasarMalam mobile app":"Aplikasi mudah alih PasarMalam","Install PasarMalam from Google Play.":"Pasang PasarMalam daripada Google Play.","Professional seller workspace for PasarMalam merchants":"Ruang kerja penjual profesional untuk peniaga PasarMalam","Track sales, publish products with photos, manage shipping, reply to buyers and handle refunds from one dashboard.":"Jejaki jualan, terbitkan produk dengan foto, urus penghantaran, balas pembeli dan kendalikan bayaran balik dalam satu papan pemuka.","Live Products":"Produk Aktif","Gross Sales":"Jualan Kasar","Store Rating":"Rating Kedai","Product Management":"Pengurusan Produk","Order Processing":"Proses Pesanan","Logistics / AWB":"Logistik / AWB","Campaign Tools":"Alat Promosi","Product Listings":"Listing Produk","Open Products":"Buka Produk","Wallet / Settlement":"Dompet / Settlement","Refresh":"Segar Semula","Orders To Handle":"Pesanan Untuk Diurus","Open Orders":"Buka Pesanan","Returns / Disputes":"Pulangan / Pertikaian","Open Returns":"Buka Pulangan","Buyer Messages":"Mesej Pembeli","Reply":"Balas","Logistics Rate":"Kadar Logistik","View":"Lihat"},
    en:{},
    zh:{"Menu":"\u83dc\u5355","Close":"\u5173\u95ed","Register":"\u6ce8\u518c","AI Listing Helper":"AI \u5546\u54c1\u52a9\u624b","AI Helper":"AI \u52a9\u624b","PasarMalam mobile app":"PasarMalam \u624b\u673a\u5e94\u7528","Install PasarMalam from Google Play.":"\u4ece Google Play \u5b89\u88c5 PasarMalam\u3002","Professional seller workspace for PasarMalam merchants":"PasarMalam \u5546\u5bb6\u4e13\u7528\u5356\u5bb6\u5de5\u4f5c\u53f0","Track sales, publish products with photos, manage shipping, reply to buyers and handle refunds from one dashboard.":"\u5728\u4e00\u4e2a\u4eea\u8868\u677f\u8ddf\u8e2a\u9500\u552e\u3001\u53d1\u5e03\u5546\u54c1\u3001\u7ba1\u7406\u914d\u9001\u3001\u56de\u590d\u4e70\u5bb6\u548c\u5904\u7406\u9000\u6b3e\u3002","Live Products":"\u5728\u552e\u5546\u54c1","Gross Sales":"\u603b\u9500\u552e\u989d","Store Rating":"\u5e97\u94fa\u8bc4\u5206","Product Management":"\u5546\u54c1\u7ba1\u7406","Order Processing":"\u8ba2\u5355\u5904\u7406","Logistics / AWB":"\u7269\u6d41 / AWB","Campaign Tools":"\u4fc3\u9500\u5de5\u5177","Product Listings":"\u5546\u54c1\u5217\u8868","Open Products":"\u6253\u5f00\u5546\u54c1","Wallet / Settlement":"\u94b1\u5305 / \u7ed3\u7b97","Refresh":"\u5237\u65b0","Orders To Handle":"\u5f85\u5904\u7406\u8ba2\u5355","Open Orders":"\u6253\u5f00\u8ba2\u5355","Returns / Disputes":"\u9000\u8d27 / \u7ea0\u7eb7","Open Returns":"\u6253\u5f00\u9000\u8d27","Buyer Messages":"\u4e70\u5bb6\u6d88\u606f","Reply":"\u56de\u590d","Logistics Rate":"\u7269\u6d41\u8d39\u7387","View":"\u67e5\u770b"}
  };
  Object.keys(dictionary.ms).forEach(key=>{dictionary.en[key]=key});
  Object.assign(dictionary.ms,{"Launch Commission Structure":"Struktur Komisen Pelancaran","No RM0.50 order fee during launch":"Tiada yuran pesanan RM0.50 semasa pelancaran","Seller Type":"Jenis Penjual","Commission":"Komisen","New seller first 30 days":"Penjual baharu 30 hari pertama","Basic seller after 30 days":"Penjual asas selepas 30 hari","Verified SSM seller":"Penjual SSM disahkan","High-volume seller":"Penjual volume tinggi","Fixed platform/order fee":"Yuran tetap platform/pesanan","3% negotiated":"3% boleh dirunding","RM0.00 for launch":"RM0.00 semasa pelancaran","Product":"Produk","Price":"Harga","Stock":"Stok","Status":"Status","Action":"Tindakan","New":"Baharu","Used":"Terpakai","Edit":"Edit","No orders yet.":"Belum ada pesanan.","No return requests.":"Belum ada permintaan pulangan.","No messages.":"Belum ada mesej.","No campaigns yet.":"Belum ada promosi.","No reviews yet.":"Belum ada ulasan.","Open":"Buka","Save":"Simpan","Send":"Hantar","Submit":"Hantar","Cancel":"Batal","Delete":"Padam"});
  Object.assign(dictionary.zh,{"Launch Commission Structure":"\u4e0a\u7ebf\u4f63\u91d1\u7ed3\u6784","No RM0.50 order fee during launch":"\u4e0a\u7ebf\u671f\u95f4\u65e0 RM0.50 \u8ba2\u5355\u8d39","Seller Type":"\u5356\u5bb6\u7c7b\u578b","Commission":"\u4f63\u91d1","New seller first 30 days":"\u65b0\u5356\u5bb6\u9996 30 \u5929","Basic seller after 30 days":"30 \u5929\u540e\u57fa\u672c\u5356\u5bb6","Verified SSM seller":"\u5df2\u9a8c\u8bc1 SSM \u5356\u5bb6","High-volume seller":"\u9ad8\u9500\u91cf\u5356\u5bb6","Fixed platform/order fee":"\u56fa\u5b9a\u5e73\u53f0/\u8ba2\u5355\u8d39","3% negotiated":"3% \u53ef\u534f\u5546","RM0.00 for launch":"\u4e0a\u7ebf\u671f\u95f4 RM0.00","Product":"\u5546\u54c1","Price":"\u4ef7\u683c","Stock":"\u5e93\u5b58","Status":"\u72b6\u6001","Action":"\u64cd\u4f5c","New":"\u65b0\u54c1","Used":"\u4e8c\u624b","Edit":"\u7f16\u8f91","No orders yet.":"\u6682\u65e0\u8ba2\u5355\u3002","No return requests.":"\u6682\u65e0\u9000\u8d27\u7533\u8bf7\u3002","No messages.":"\u6682\u65e0\u6d88\u606f\u3002","No campaigns yet.":"\u6682\u65e0\u4fc3\u9500\u3002","No reviews yet.":"\u6682\u65e0\u8bc4\u4ef7\u3002","Open":"\u6253\u5f00","Save":"\u4fdd\u5b58","Send":"\u53d1\u9001","Submit":"\u63d0\u4ea4","Cancel":"\u53d6\u6d88","Delete":"\u5220\u9664"});
  Object.assign(dictionary.ms,{"Store Profile":"Profil Kedai","Seller Sign In":"Log Masuk Penjual","Login with your registered seller email.":"Log masuk dengan emel penjual berdaftar.","Approved sellers only":"Penjual diluluskan sahaja","Email":"Emel","Password":"Kata laluan","New Seller?":"Penjual baharu?","Admin approval required":"Kelulusan admin diperlukan","Seller Registration":"Pendaftaran Penjual","Email OTP, compulsory identity, and payout bank details. Business registration can be completed later.":"OTP emel, identiti wajib dan butiran bank payout. Pendaftaran perniagaan boleh dilengkapkan kemudian.","Account Verification":"Pengesahan Akaun","Step 1":"Langkah 1","Send Email OTP":"Hantar OTP Emel","Verify OTP":"Sahkan OTP","Identity Verification":"Pengesahan Identiti","Compulsory":"Wajib","Manage stock, variants, images, weight and pricing.":"Urus stok, variasi, imej, berat dan harga.","Listing Quality":"Kualiti Listing","Missing Dimensions":"Dimensi Tidak Lengkap","Low Stock":"Stok Rendah","Preferred Eligible":"Layak Preferred","Listing Tasks":"Tugas Listing","Unpaid":"Belum Dibayar","To Pack":"Perlu Dibungkus","Payment pending":"Bayaran belum selesai","Waiting for gateway confirmation.":"Menunggu pengesahan gateway.","Returns / Refund / Change Goods":"Pulangan / Refund / Tukar Barang","Refunded":"Telah Direfund","Dispute":"Pertikaian","Case closed.":"Kes ditutup.","Use Lalamove Instant or Lalamove Regular for now.":"Gunakan Lalamove Segera atau Lalamove Biasa buat masa ini.","Wallet / Payout":"Dompet / Payout","Seller earnings, settlement and launch commission policy.":"Pendapatan penjual, settlement dan polisi komisen pelancaran.","Gross Completed Sales":"Jualan Selesai Kasar","Platform Commission":"Komisen Platform","Seller Earnings":"Pendapatan Penjual","Pending Payout":"Payout Belum Selesai","Voucher Usage":"Penggunaan Voucher","Campaign Eligible":"Layak Promosi","Ads Conversion":"Penukaran Iklan","Free Shipping":"Penghantaran Percuma","Campaign Checklist":"Senarai Semak Promosi","Seller Performance":"Prestasi Penjual","Improvement Tasks":"Tugas Penambahbaikan","Keep response rate above 90%.":"Kekalkan kadar respons melebihi 90%.","Open Ticket":"Buka Tiket","Category":"Kategori","Payout":"Payout","Order":"Pesanan","Product Listing":"Listing Produk","Technical":"Teknikal","Priority":"Keutamaan","Store Settings":"Tetapan Kedai","Payout Profile":"Profil Payout","Blocked":"Disekat","Identity":"Identiti","Missing":"Tidak Lengkap","Bank Match":"Padanan Bank","Shop name":"Nama kedai","Phone":"Telefon","Pickup address":"Alamat pickup","Seller Agreement & Commission Policy":"Perjanjian Penjual & Polisi Komisen","Operational rules for PasarMalam merchants.":"Peraturan operasi untuk peniaga PasarMalam.","Seller Agreement":"Perjanjian Penjual"});
  Object.assign(dictionary.zh,{"Seller Centre":"\u5356\u5bb6\u4e2d\u5fc3","Dashboard":"\u4eea\u8868\u677f","Sign In":"\u767b\u5f55","Register Seller":"\u6ce8\u518c\u5356\u5bb6","Business Verification":"\u5546\u5bb6\u9a8c\u8bc1","Products":"\u5546\u54c1","Add Product":"\u6dfb\u52a0\u5546\u54c1","Orders":"\u8ba2\u5355","Returns":"\u9000\u8d27","Messages":"\u6d88\u606f","Logistics":"\u7269\u6d41","Wallet":"\u94b1\u5305","Campaigns":"\u4fc3\u9500","Reviews":"\u8bc4\u4ef7","Performance":"\u8868\u73b0","Notifications":"\u901a\u77e5","Support":"\u652f\u6301","Settings":"\u8bbe\u7f6e","Policies":"\u653f\u7b56","Launch Commission Structure":"\u4e0a\u7ebf\u4f63\u91d1\u7ed3\u6784","Seller Type":"\u5356\u5bb6\u7c7b\u578b","Commission":"\u4f63\u91d1","Product":"\u5546\u54c1","Price":"\u4ef7\u683c","Stock":"\u5e93\u5b58","Status":"\u72b6\u6001","Action":"\u64cd\u4f5c","New":"\u65b0\u54c1","Used":"\u4e8c\u624b","Edit":"\u7f16\u8f91","Open":"\u6253\u5f00","Save":"\u4fdd\u5b58","Send":"\u53d1\u9001","Submit":"\u63d0\u4ea4","Cancel":"\u53d6\u6d88","Delete":"\u5220\u9664","Store Profile":"\u5e97\u94fa\u8d44\u6599","Seller Sign In":"\u5356\u5bb6\u767b\u5f55","Email":"\u7535\u90ae","Password":"\u5bc6\u7801","Seller Registration":"\u5356\u5bb6\u6ce8\u518c","Account Verification":"\u8d26\u6237\u9a8c\u8bc1","Send Email OTP":"\u53d1\u9001\u7535\u90ae OTP","Verify OTP":"\u9a8c\u8bc1 OTP","Store Settings":"\u5e97\u94fa\u8bbe\u7f6e","Wallet / Payout":"\u94b1\u5305 / \u63d0\u6b3e","Seller Performance":"\u5356\u5bb6\u8868\u73b0","Open Ticket":"\u521b\u5efa\u5de5\u5355","Category":"\u5206\u7c7b","Priority":"\u4f18\u5148\u7ea7"});
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





