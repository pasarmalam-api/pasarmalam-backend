(function(){
  "use strict";
  const KEY="pasarmalam-lang";
  const order=["ms","en","zh"];
  const names={ms:"Bahasa: Melayu",en:"Language: English",zh:"语言：中文"};
  const dict={
    ms:{
      brand_subtitle:"Pasaran Malaysia",language_button:"Bahasa: Melayu",nav_buyer:"Pembeli",nav_seller:"Penjual",nav_policies:"Polisi",nav_contact:"Hubungi",
      home_hero_text:"Beli makanan, telefon, elektronik, pakaian, mainan, perkakasan dan barangan baharu atau terpakai dengan perlindungan pembeli.",
      home_shop:"Beli Sekarang",home_seller:"Jadi Penjual",home_buyer_title:"Aplikasi Pembeli",home_buyer_text:"Cari produk, tambah ke troli, bayar, chat, simpan kegemaran, semak pesanan dan mohon pulangan.",
      home_seller_title:"Pusat Penjual",home_seller_text:"Daftar, tambah produk, muat naik foto, urus pesanan, promosi, pulangan dan dompet penjual.",
      home_protect_title:"Perlindungan Pembeli",home_protect_text:"Peraturan jelas untuk bayaran, escrow, penghantaran, pulangan, tanggungjawab penjual dan semakan pertikaian.",
      home_local_title:"Dibina untuk jual beli Malaysia",home_local_1:"Label keadaan untuk barang baharu dan terpakai.",home_local_2:"Harga tetap atau boleh runding untuk gaya pasar malam.",home_local_3:"Ambil sendiri, Lalamove Instant dan Lalamove Regular.",home_local_4:"Kategori makanan, telefon, elektronik, alat ganti, pakaian, kasut, mainan dan hardware.",
      home_safe_title:"Keselamatan marketplace",home_safe_1:"OTP emel untuk akaun pembeli dan penjual.",home_safe_2:"Butiran identiti dan bank untuk bayaran penjual.",home_safe_3:"Pengesahan SSM boleh dilengkapkan kemudian.",home_safe_4:"Peraturan escrow, pulangan dan bayaran balik.",
      home_order_title:"Cara Pesanan Berjalan",home_step_1:"1. Cari",home_step_1_text:"Pembeli mencari dan memilih produk.",home_step_2:"2. Bayar",home_step_2_text:"Bayaran menunggu pengesahan gateway.",home_step_3:"3. Hantar",home_step_3_text:"Penjual kemas kini status pembungkusan dan penghantaran.",home_step_4:"4. Selesai",home_step_4_text:"Admin luluskan payout selepas semakan.",footer_text:"PasarMalam marketplace Malaysia."
    },
    en:{
      brand_subtitle:"Malaysia marketplace",language_button:"Language: English",nav_buyer:"Buyer",nav_seller:"Seller",nav_policies:"Policies",nav_contact:"Contact",
      home_hero_text:"Buy food, phones, electronics, clothes, toys, hardware and new or used items with buyer protection.",
      home_shop:"Shop Now",home_seller:"Become a Seller",home_buyer_title:"Buyer App",home_buyer_text:"Search products, add to cart, pay, chat, save favourites, track orders and request returns.",
      home_seller_title:"Seller Centre",home_seller_text:"Register, add products, upload photos, manage orders, campaigns, returns and seller wallet.",
      home_protect_title:"Buyer Protection",home_protect_text:"Clear rules for payment, escrow, delivery, returns, seller responsibility and dispute review.",
      home_local_title:"Built for Malaysia marketplace selling",home_local_1:"Condition labels for new and used items.",home_local_2:"Fixed or negotiable prices for pasar malam style selling.",home_local_3:"Pickup, Lalamove Instant and Lalamove Regular.",home_local_4:"Categories for food, phones, electronics, car parts, clothes, shoes, toys and hardware.",
      home_safe_title:"Marketplace safety",home_safe_1:"Email OTP for buyer and seller accounts.",home_safe_2:"Identity and bank details for seller payouts.",home_safe_3:"SSM verification can be completed later.",home_safe_4:"Escrow, return and refund rules.",
      home_order_title:"How Orders Work",home_step_1:"1. Search",home_step_1_text:"Buyers search and choose products.",home_step_2:"2. Pay",home_step_2_text:"Payment waits for gateway confirmation.",home_step_3:"3. Deliver",home_step_3_text:"Sellers update packing and delivery status.",home_step_4:"4. Complete",home_step_4_text:"Admin approves payout after review.",footer_text:"PasarMalam Malaysia marketplace."
    },
    zh:{
      brand_subtitle:"马来西亚市场",language_button:"语言：中文",nav_buyer:"买家",nav_seller:"卖家",nav_policies:"政策",nav_contact:"联系",
      home_hero_text:"购买食品、手机、电子产品、服装、玩具、五金以及全新或二手商品，并享有买家保障。",
      home_shop:"立即购买",home_seller:"成为卖家",home_buyer_title:"买家应用",home_buyer_text:"搜索产品、加入购物车、付款、聊天、收藏、追踪订单并申请退货。",
      home_seller_title:"卖家中心",home_seller_text:"注册、添加产品、上传照片、管理订单、促销、退货和卖家钱包。",
      home_protect_title:"买家保障",home_protect_text:"清晰的付款、托管、配送、退货、卖家责任和争议审核规则。",
      home_local_title:"为马来西亚买卖而建",home_local_1:"支持全新和二手商品状态标签。",home_local_2:"支持固定价格或议价。",home_local_3:"支持自取、Lalamove 即时和普通配送。",home_local_4:"覆盖食品、手机、电子产品、配件、服装、鞋、玩具和五金类别。",
      home_safe_title:"市场安全",home_safe_1:"买家和卖家账号使用邮箱 OTP。",home_safe_2:"卖家收款需要身份和银行资料。",home_safe_3:"SSM 验证可稍后完成。",home_safe_4:"托管、退货和退款规则。",
      home_order_title:"订单流程",home_step_1:"1. 搜索",home_step_1_text:"买家搜索并选择产品。",home_step_2:"2. 付款",home_step_2_text:"付款等待网关确认。",home_step_3:"3. 配送",home_step_3_text:"卖家更新打包和配送状态。",home_step_4:"4. 完成",home_step_4_text:"管理员审核后批准付款。",footer_text:"PasarMalam 马来西亚市场。"
    }
  };
  function getLang(){
    let saved;
    try{saved=localStorage.getItem(KEY)}catch(e){}
    return dict[saved]?saved:"ms";
  }
  function setLang(lang){
    if(!dict[lang])lang="ms";
    try{localStorage.setItem(KEY,lang)}catch(e){}
    document.documentElement.lang=lang==="zh"?"zh-Hans":lang;
    document.querySelectorAll("[data-i18n]").forEach(el=>{
      const key=el.getAttribute("data-i18n");
      if(dict[lang][key])el.textContent=dict[lang][key];
    });
    document.querySelectorAll("[data-lang-toggle]").forEach(btn=>{btn.textContent=names[lang]||names.ms;});
  }
  document.addEventListener("DOMContentLoaded",()=>{
    setLang(getLang());
    document.querySelectorAll("[data-lang-toggle]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const current=getLang();
        const next=order[(order.indexOf(current)+1)%order.length];
        setLang(next);
      });
    });
  });
})();
