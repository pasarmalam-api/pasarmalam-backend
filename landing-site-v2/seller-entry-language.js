(function () {
  'use strict';
  const copy = {
    'Seller Centre':['Pusat Penjual','卖家中心'],
    'Seller Profile':['Profil Penjual','卖家资料'],
    'Register as a Seller':['Daftar sebagai Penjual','注册卖家账号'],
    'Continue with Buyer Account':['Teruskan dengan Akaun Pembeli','使用买家账号继续'],
    'Sign in to Seller Account':['Log Masuk Akaun Penjual','登录卖家账号'],
    'Register a new seller account, or continue with your existing buyer account.':['Daftar akaun penjual baharu atau teruskan dengan akaun pembeli sedia ada.','注册新的卖家账号，或使用现有买家账号继续。'],
    'Loading your account...':['Sedang memuatkan akaun anda...','正在加载您的账号...'],
    'Continue Shopping':['Teruskan Membeli-belah','继续购物'],
    'Back':['Kembali','返回'], 'Cart':['Troli','购物车'],
    'Sign In':['Log Masuk','登录'], 'Sign Up':['Daftar','注册'],
    'My Account':['Akaun Saya','我的账户'], 'Sign Out':['Log Keluar','退出'],
    'Complete Seller Profile':['Lengkapkan Profil Penjual','完善卖家资料'],
    'Seller Application':['Permohonan Penjual','卖家申请'],
    'Account Details':['Maklumat Akaun','账号资料'],
    'Full name':['Nama penuh','姓名'], 'Email':['Emel','电子邮箱'],
    'Phone number':['Nombor telefon','电话号码'],
    'Pickup / shop address':['Alamat pengambilan / kedai','取货或店铺地址'],
    'Shop Details':['Maklumat Kedai','店铺资料'],
    'Shop name':['Nama kedai','店铺名称'], 'Shop category':['Kategori kedai','店铺类别'],
    'Store type':['Jenis kedai','店铺类型'], 'Choose store type':['Pilih jenis kedai','选择店铺类型'],
    'Retail':['Runcit','零售'], 'Bulk / Wholesale':['Borong','批发'], 'Factory Direct':['Kilang Terus','工厂直销'],
    'Select category':['Pilih kategori','选择类别'],
    'Identity type':['Jenis pengenalan','证件类型'], 'Select identity type':['Pilih jenis pengenalan','选择证件类型'],
    'Identity number':['Nombor pengenalan','证件号码'],
    'MyKad':['MyKad','MyKad'], 'Passport':['Pasport','护照'], 'Business Owner ID':['Pengenalan Pemilik Perniagaan','企业负责人证件'],
    'Business type (optional)':['Jenis perniagaan (pilihan)','企业类型（选填）'],
    'Select business type':['Pilih jenis perniagaan','选择企业类型'],
    'Individual Seller':['Penjual Individu','个人卖家'], 'Sole Proprietor':['Pemilik Tunggal','独资企业'],
    'Partnership':['Perkongsian','合伙企业'], 'Private Limited / Sdn Bhd':['Syarikat Sendirian Berhad','私人有限公司 / Sdn Bhd'],
    'SSM number (optional)':['Nombor SSM (pilihan)','SSM 注册号（选填）'],
    'Payout Bank Account':['Akaun Bank Penerimaan Bayaran','收款银行账号'],
    'Bank name':['Nama bank','银行名称'], 'Account holder name':['Nama pemegang akaun','账户持有人姓名'],
    'Account number':['Nombor akaun','银行账号'], 'By submitting, you agree to the':['Dengan menghantar, anda bersetuju dengan','提交即表示您同意'],
    'Seller Agreement':['Perjanjian Penjual','卖家协议'], 'Contact Support':['Hubungi Sokongan','联系客服'],
    'Retry':['Cuba Lagi','重试'], 'Open Seller Centre':['Buka Pusat Penjual','打开卖家中心'],
    'Your existing account details are filled in. Complete the remaining fields for seller review.':['Maklumat akaun sedia ada telah diisi. Lengkapkan maklumat selebihnya untuk semakan penjual.','已填入您的现有账号资料。请补全其余资料以供卖家审核。'],
    'Your seller profile is complete and pending approval. We will contact you shortly. You can continue shopping with this account.':['Profil penjual anda lengkap dan sedang menunggu kelulusan. Kami akan menghubungi anda. Anda boleh terus membeli-belah dengan akaun ini.','您的卖家资料已提交，正在等待审核。我们将与您联系。您仍可使用此账号购物。'],
    'Your seller application was not approved. Contact support for help. You can continue shopping.':['Permohonan penjual anda tidak diluluskan. Hubungi sokongan untuk bantuan. Anda masih boleh membeli-belah.','您的卖家申请未获批准。请联系客服获取帮助。您仍可继续购物。'],
    'Your seller account is approved. Sign in with the same email on the main seller site.':['Akaun penjual anda diluluskan. Log masuk di laman penjual utama menggunakan emel yang sama.','您的卖家账号已获批准。请使用同一邮箱登录卖家网站。'],
    'Unable to load your account. Please retry.':['Akaun tidak dapat dimuatkan. Sila cuba lagi.','无法加载账号，请重试。'],
    'Seller access changed. Please refresh.':['Akses penjual telah berubah. Sila muat semula.','卖家权限已变更，请刷新页面。'],
    'Login required':['Sila log masuk','请先登录'],
    'Dashboard':['Papan Pemuka','仪表板'], 'Register Seller':['Daftar Penjual','注册卖家'],
    'Store Profile':['Profil Kedai','店铺资料'], 'Products':['Produk','商品'],
    'Orders':['Pesanan','订单'], 'Performance':['Prestasi','业绩'], 'Policies':['Polisi','政策'],
    'Menu':['Menu','菜单'], 'Close':['Tutup','关闭'], 'Switch to Buyer':['Tukar ke Pembeli','切换至买家'],
    'Enable Notifications':['Hidupkan Notifikasi','开启通知'],
    'Seller Registration':['Pendaftaran Penjual','卖家注册'],
    'Email OTP, compulsory identity, and payout bank details. Business registration can be completed later.':['Pengesahan emel, maklumat pengenalan dan akaun bank diperlukan. Pendaftaran perniagaan boleh dilengkapkan kemudian.','需要邮箱验证、身份证明及收款银行资料。企业注册资料可稍后补充。'],
    'Account Verification':['Pengesahan Akaun','账号验证'], 'Step 1':['Langkah 1','第 1 步'],
    'Owner full name':['Nama penuh pemilik','负责人姓名'], 'Phone number +60':['Nombor telefon +60','电话号码 +60'],
    'Send Email OTP':['Hantar Kod Pengesahan Emel','发送邮箱验证码'], 'Verify OTP':['Sahkan Kod','验证验证码'],
    '6-digit OTP':['Kod 6 digit','6 位验证码'], 'Password, min 8 chars':['Kata laluan, minimum 8 aksara','密码，至少 8 个字符'],
    'View':['Lihat','显示'], 'Hide':['Sembunyikan','隐藏'],
    'Identity Verification':['Pengesahan Pengenalan','身份验证'], 'Compulsory':['Wajib','必填'],
    'Shop / store name':['Nama kedai','店铺名称'],
    'Pickup/store location and seller address':['Alamat pengambilan / kedai dan penjual','取货或店铺地址及卖家地址'],
    'Business Registration':['Pendaftaran Perniagaan','企业注册资料'], 'Can add later':['Boleh ditambah kemudian','可稍后补充'],
    'SSM/business registration is optional at signup. Admin can request it later for higher limits, official store badge, or larger payouts.':['Pendaftaran SSM/perniagaan adalah pilihan semasa mendaftar. Pentadbir boleh memintanya kemudian bagi had lebih tinggi, lencana kedai rasmi atau bayaran lebih besar.','注册时可暂不提供 SSM 或企业注册资料。管理员可能在提高额度、申请官方店铺标识或较大金额结算时要求补充。'],
    'Business type optional':['Jenis perniagaan (pilihan)','企业类型（选填）'],
    'SSM / business registration number optional':['Nombor SSM / pendaftaran perniagaan (pilihan)','SSM 或企业注册号（选填）'],
    'Bank name, e.g. Maybank / CIMB / Affin':['Nama bank, contohnya Maybank / CIMB / Affin','银行名称，例如 Maybank / CIMB / Affin'],
    'Bank account number':['Nombor akaun bank','银行账号'],
    'This bank account is used to pay seller earnings after orders are completed and payout is approved.':['Akaun bank ini digunakan untuk membayar hasil jualan selepas pesanan selesai dan pembayaran diluluskan.','此银行账号用于在订单完成且付款获批后接收销售款项。'],
    'By submitting, seller agrees to the':['Dengan menghantar, penjual bersetuju dengan','提交即表示卖家同意'],
    'Seller Agreement, Commission Policy, Return/Refund Rules, and Payout Policy':['Perjanjian Penjual, Polisi Komisen, Peraturan Pulangan/Bayaran Balik dan Polisi Pembayaran','卖家协议、佣金政策、退货退款规则及结算政策'],
    'Submit Seller Application':['Hantar Permohonan Penjual','提交卖家申请'],
    'Email is required.':['Emel diperlukan.','请输入邮箱。'], 'Sending OTP...':['Sedang menghantar kod...','正在发送验证码...'],
    'OTP sent to email.':['Kod telah dihantar ke emel.','验证码已发送至邮箱。'],
    'OTP code is required.':['Kod pengesahan diperlukan.','请输入验证码。'], 'Verifying OTP...':['Sedang mengesahkan kod...','正在验证验证码...'],
    'Email verified. Continue seller application.':['Emel disahkan. Teruskan permohonan penjual.','邮箱已验证，请继续卖家申请。'],
    'Owner name is required.':['Nama pemilik diperlukan.','请输入负责人姓名。'], 'Phone number is required.':['Nombor telefon diperlukan.','请输入电话号码。'],
    'Please verify seller email OTP first.':['Sila sahkan kod emel penjual terlebih dahulu.','请先验证卖家邮箱验证码。'],
    'Password must be at least 8 characters.':['Kata laluan mestilah sekurang-kurangnya 8 aksara.','密码至少需要 8 个字符。'],
    'Choose your store type.':['Pilih jenis kedai anda.','请选择店铺类型。'], 'Choose your shop category.':['Pilih kategori kedai anda.','请选择店铺类别。'],
    'Shop name is required.':['Nama kedai diperlukan.','请输入店铺名称。'], 'Identity type is required.':['Jenis pengenalan diperlukan.','请选择证件类型。'],
    'Identity number is required.':['Nombor pengenalan diperlukan.','请输入证件号码。'], 'Seller address is required.':['Alamat penjual diperlukan.','请输入卖家地址。'],
    'Bank name is required.':['Nama bank diperlukan.','请输入银行名称。'], 'Bank account holder name is required.':['Nama pemegang akaun bank diperlukan.','请输入账户持有人姓名。'],
    'Bank account number is required.':['Nombor akaun bank diperlukan.','请输入银行账号。'],
    'Submitting seller application...':['Sedang menghantar permohonan penjual...','正在提交卖家申请...'], 'Request failed':['Permintaan gagal','请求失败'],
    'Phones':['Telefon','手机'], 'Chargers':['Aksesori Telefon','手机配件'], 'Phone Accessories':['Aksesori Telefon','手机配件'],
    'Electronics':['Elektronik','电子产品'], 'Car Parts':['Alat Ganti Kereta','汽车配件'], 'Hardware':['Perkakasan','五金'],
    'Stationery':['Alat Tulis','文具'], 'Toys':['Mainan','玩具'], 'Shoes':['Kasut','鞋类'], 'Clothes':['Pakaian','服装'],
    'Meals':['Hidangan','餐食'], 'Street Food':['Makanan Jalanan','街头美食'], 'Food':['Makanan','食品'],
    'Drinks':['Minuman','饮料'], 'Groceries':['Barangan Runcit','日用品'], 'Cosmetics':['Kosmetik','化妆品']
  };
  const reverse = new Map();
  Object.entries(copy).forEach(([key, values]) => {reverse.set(key,key); values.forEach(value => reverse.set(value,key));});
  function text(value, language) {
    const key = reverse.get(value) || value;
    return language === 'en' ? key : (copy[key]?.[language === 'zh' ? 1 : 0] || value);
  }
  if (typeof module !== 'undefined' && module.exports) {module.exports={copy,text};return;}
  const lang = () => ['ms','en','zh'].includes(localStorage.getItem('pasarmalam-lang')) ? localStorage.getItem('pasarmalam-lang') : 'ms';
  function apply() {
    const language=lang(); document.documentElement.lang=language;
    document.querySelectorAll('.buyer-lang-toggle,.seller-lang-toggle').forEach(button => {
      const label={ms:'Bahasa: Melayu',en:'Language: English',zh:'语言：中文'}[language];
      if(button.textContent!==label)button.textContent=label;
    });
    document.querySelectorAll('option').forEach(option => {
      // Keep submitted enum values stable while translating their labels.
      if(!option.hasAttribute('value'))option.setAttribute('value',option.value);
      const source=copy[option.value]?option.value:option.textContent.trim();
      const translated=text(source,language); if(option.textContent!==translated)option.textContent=translated;
    });
    document.querySelectorAll('[data-shop-category-text="label"]').forEach(el=>{const label=text('Shop category',language);if(el.textContent!==label)el.textContent=label;});
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode, parent=node.parentElement;
      if(!parent || parent.closest('script,style,textarea,option,.brand h1,.brand h2'))continue;
      const raw=node.nodeValue.trim(),translated=text(raw,language);
      if(raw&&translated!==raw)node.nodeValue=node.nodeValue.replace(raw,translated);
    }
    document.querySelectorAll('[placeholder]').forEach(el=>{const raw=el.getAttribute('placeholder'),translated=text(raw,language);if(raw!==translated)el.setAttribute('placeholder',translated);});
    const heading=document.getElementById('heading')||document.querySelector('header h2');
    if(heading)document.title=heading.textContent+' | PasarMalam';
  }
  window.PMSellerEntryLanguage={apply,text};
  if(location.pathname.endsWith('/become-seller.html')){
    const button=document.createElement('button');button.type='button';button.className='buyer-lang-toggle';
    button.onclick=()=>{const current=lang();localStorage.setItem('pasarmalam-lang',current==='ms'?'en':current==='en'?'zh':'ms');apply();};
    document.querySelector('header .bar').append(button);
  }
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply();});}).observe(document.body,{childList:true,characterData:true,subtree:true});
  window.addEventListener('storage',apply);
  apply();
})();
