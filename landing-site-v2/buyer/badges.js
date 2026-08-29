(function(){
  const API="https://pasarmalam-backend.onrender.com";
  const LANG_KEY="pasarmalam-lang";
  const SELLER_URL="https://www.pasarmalamapp.com/seller/";
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
  Object.assign(dictionary.zh,{
    "phones":"\u7535\u8bdd","hardware":"\u4e94\u91d1","stationery":"\u6587\u5177","street food":"\u8857\u5934\u7f8e\u98df","free shipping":"\u514d\u8fd0\u8d39",
    "Phone":"\u7535\u8bdd","Phones":"\u7535\u8bdd","Chargers":"\u5145\u7535\u5668","Electronics":"\u7535\u5b50\u4ea7\u54c1","Car Parts":"\u6c7d\u8f66\u914d\u4ef6","Hardware":"\u4e94\u91d1","Stationery":"\u6587\u5177","Toys":"\u73a9\u5177","Shoes":"\u978b","Clothes":"\u670d\u88c5","Meals":"\u9910\u98df","Street Food":"\u8857\u5934\u7f8e\u98df","Food":"\u98df\u54c1","Drinks":"\u996e\u6599",
    "Your Cart":"\u6211\u7684\u8d2d\u7269\u8f66","Platform Voucher":"\u5e73\u53f0\u4f18\u60e0\u5238","Use Voucher":"\u4f7f\u7528\u4f18\u60e0\u5238","PM Coins":"PM \u91d1\u5e01","Delivery Address":"\u914d\u9001\u5730\u5740","Full delivery address":"\u5b8c\u6574\u914d\u9001\u5730\u5740","Contact":"\u8054\u7cfb","Email for receipt":"\u6536\u636e\u7535\u90ae","Phone number":"\u7535\u8bdd\u53f7\u7801","Shipping & Payment":"\u914d\u9001\u4e0e\u4ed8\u6b3e","Select payment method":"\u9009\u62e9\u4ed8\u6b3e\u65b9\u5f0f","Cash Pickup":"\u53d6\u8d27\u4ed8\u73b0","Apply Voucher":"\u4f7f\u7528\u4f18\u60e0\u5238","Buyer Protection":"\u4e70\u5bb6\u4fdd\u969c","Order Summary":"\u8ba2\u5355\u6458\u8981","Pay Now":"\u7acb\u5373\u4ed8\u6b3e",
    "Product Detail":"\u5546\u54c1\u8be6\u60c5","Preferred Seller":"\u4f18\u9009\u5356\u5bb6","Stock":"\u5e93\u5b58","Protection":"\u4fdd\u969c","Escrow until complete":"\u5b8c\u6210\u524d\u6258\u7ba1","Seller:":"\u5356\u5bb6\uff1a","Warranty:":"\u4fdd\u4fee\uff1a","Return rule:":"\u9000\u8d27\u89c4\u5219\uff1a","Buy Now":"\u7acb\u5373\u8d2d\u4e70","Chat Seller":"\u8054\u7cfb\u5356\u5bb6",
    "Request Return, Refund or Change Goods":"\u7533\u8bf7\u9000\u8d27\u3001\u9000\u6b3e\u6216\u6362\u8d27","Refund Only":"\u4ec5\u9000\u6b3e","Change Goods":"\u6362\u8d27","Reason, damaged/wrong item, evidence note":"\u539f\u56e0\u3001\u635f\u574f/\u9519\u8bef\u5546\u54c1\u3001\u8bc1\u636e\u8bf4\u660e","Upload Evidence Photo":"\u4e0a\u4f20\u8bc1\u636e\u7167\u7247","Requests":"\u7533\u8bf7","Loading...":"\u52a0\u8f7d\u4e2d...","Submit":"\u63d0\u4ea4","Order Detail":"\u8ba2\u5355\u8be6\u60c5","Tracking Flow":"\u8ddf\u8e2a\u6d41\u7a0b","Escrow release countdown":"\u6258\u7ba1\u91ca\u653e\u5012\u8ba1\u65f6","Request Return / Refund":"\u7533\u8bf7\u9000\u8d27 / \u9000\u6b3e",
    "Seller Store":"\u5356\u5bb6\u5e97\u94fa","View Store Products":"\u67e5\u770b\u5e97\u94fa\u5546\u54c1","Search Goods by Photo":"\u7528\u7167\u7247\u641c\u7d22\u5546\u54c1","Matches":"\u5339\u914d\u7ed3\u679c","Choose from device":"\u4ece\u8bbe\u5907\u9009\u62e9","Take a photo":"\u62cd\u7167","Search":"\u641c\u7d22","Optional keyword: phone, toy, meal, hardware":"\u53ef\u9009\u5173\u952e\u8bcd\uff1a\u7535\u8bdd\u3001\u73a9\u5177\u3001\u9910\u98df\u3001\u4e94\u91d1"
  });
  Object.assign(dictionary.ms,{
    "phones":"telefon","hardware":"perkakasan","stationery":"alat tulis","street food":"makanan jalanan","free shipping":"penghantaran percuma",
    "Phone":"Telefon","Phones":"Telefon","Chargers":"Pengecas","Electronics":"Elektronik","Car Parts":"Alat Ganti Kereta","Hardware":"Perkakasan","Stationery":"Alat Tulis","Toys":"Mainan","Shoes":"Kasut","Clothes":"Pakaian","Meals":"Hidangan","Street Food":"Makanan Jalanan","Food":"Makanan","Drinks":"Minuman",
    "Your Cart":"Troli Anda","Platform Voucher":"Voucher Platform","Use Voucher":"Guna Voucher","PM Coins":"Syiling PM","Checkout":"Bayar","Delivery Address":"Alamat Penghantaran","Full delivery address":"Alamat penghantaran penuh","Contact":"Hubungi","Email for receipt":"Emel untuk resit","Phone number":"Nombor telefon","Shipping & Payment":"Penghantaran & Bayaran","Select payment method":"Pilih kaedah bayaran","Cash Pickup":"Tunai Semasa Ambil","Apply Voucher":"Guna Voucher","Buyer Protection":"Perlindungan Pembeli","Order Summary":"Ringkasan Pesanan","Pay Now":"Bayar Sekarang",
    "Product Detail":"Butiran Produk","Preferred Seller":"Penjual Pilihan","Stock":"Stok","Voucher":"Voucher","Protection":"Perlindungan","Escrow until complete":"Escrow sehingga selesai","Seller:":"Penjual:","Warranty:":"Waranti:","Return rule:":"Peraturan pulangan:","Add to cart":"Tambah troli","Buy Now":"Beli Sekarang","Chat Seller":"Chat Penjual",
    "Request Return, Refund or Change Goods":"Mohon Pulangan, Bayaran Balik atau Tukar Barang","Refund Only":"Bayaran Balik Sahaja","Change Goods":"Tukar Barang","Reason, damaged/wrong item, evidence note":"Sebab, barang rosak/salah, nota bukti","Upload Evidence Photo":"Muat Naik Foto Bukti","Requests":"Permintaan","Loading...":"Memuatkan...","Submit":"Hantar","Order Detail":"Butiran Pesanan","Tracking Flow":"Aliran Penjejakan","Escrow release countdown":"Kiraan pelepasan escrow","Request Return / Refund":"Mohon Pulangan / Bayaran Balik",
    "Seller Store":"Kedai Penjual","View Store Products":"Lihat Produk Kedai","Search Goods by Photo":"Cari Barang Dengan Foto","Matches":"Padanan","Choose from device":"Pilih dari peranti","Take a photo":"Ambil foto","Search":"Cari","Optional keyword: phone, toy, meal, hardware":"Kata kunci pilihan: telefon, mainan, makanan, perkakasan"
  });
  Object.assign(dictionary.ms,{
    "Wishlist / Favorites":"Senarai Hajat","My Vouchers":"Voucher Saya","Vouchers & Free Shipping":"Voucher & Penghantaran Percuma","RM5 off above RM50, applied when eligible.":"RM5 diskaun untuk belian melebihi RM50, digunakan jika layak.","Earn coins after order is completed.":"Dapat syiling selepas pesanan selesai.","coins":"syiling","Remove":"Buang","Total:":"Jumlah:","Unit":"Unit","Subtotal":"Subtotal","Stock":"Stok","Notifications":"Notifikasi","Product":"Produk","product":"produk","Buyer-Seller Chat":"Chat Pembeli-Penjual","You":"Anda","Seller notification reply":"Balasan penjual","Buyer message about product":"Mesej pembeli tentang produk","message":"mesej","reply product is available":"balasan: produk tersedia","Product is available":"Produk tersedia","Shipping Options":"Pilihan Penghantaran","Logistics Rate":"Kadar Logistik","From":"Dari","pending_payment":"bayaran belum selesai","pending":"belum selesai","paid":"dibayar","unpaid":"belum dibayar","placed":"dibuat","completed":"selesai","released":"dilepaskan","Released":"Dilepaskan","Holding":"Ditahan","Pending":"Belum Selesai","Escrow Pending":"Escrow Belum Selesai","Escrow Released":"Escrow Dilepaskan","Escrow Holding":"Escrow Ditahan","Tracking":"Tracking","Return deadline":"Tarikh akhir pulangan","Escrow release":"Pelepasan escrow","View Detail":"Lihat Butiran","Confirmation":"Pengesahan","Receipt":"Resit","Return/Refund":"Pulangan/Refund","View evidence photo":"Lihat foto bukti","Refund completed. This case is closed.":"Refund selesai. Kes ini ditutup.","Requested":"Diminta","Refunded":"Telah direfund","closed":"ditutup","open":"dibuka","wrong item":"barang salah","refund":"refund","return request":"permintaan pulangan","evidence":"bukti","Expired":"Tamat tempoh","Buyer protection":"Perlindungan pembeli","buyer protection":"perlindungan pembeli","Shop by type":"Pilih kategori","Blue":"Biru","Gateway orders stay pending until Billplz confirms payment. Paid orders are held in escrow until delivered/completed.":"Pesanan gateway kekal belum selesai sehingga Billplz mengesahkan bayaran. Pesanan berbayar disimpan dalam escrow sehingga diterima/selesai.","Please sign in as buyer before checkout.":"Sila log masuk sebagai pembeli sebelum bayar.","Sign In":"Log Masuk","Standard Rider":"Lalamove Biasa","Express Rider":"Lalamove Segera","Bulky Item":"Barang Besar","Seller Own Fleet":"Penghantaran Penjual"
  });
  Object.assign(dictionary.zh,{
    "phones":"手机","hardware":"五金","stationery":"文具","street food":"街头美食","free shipping":"免运费",
    "Phone":"手机","Phones":"手机","Chargers":"充电器","Electronics":"电子产品","Car Parts":"汽车零件","Hardware":"五金","Stationery":"文具","Toys":"玩具","Shoes":"鞋","Clothes":"服装","Meals":"餐食","Street Food":"街头美食","Food":"食品","Drinks":"饮料",
    "Your Cart":"我的购物车","Platform Voucher":"平台优惠券","Use Voucher":"使用优惠券","PM Coins":"PM 积分","Delivery Address":"配送地址","Full delivery address":"完整配送地址","Contact":"联系","Email for receipt":"收据电邮","Phone number":"电话号码","Shipping & Payment":"配送与付款","Select payment method":"选择付款方式","Cash Pickup":"自取现金","Apply Voucher":"使用优惠券","Buyer Protection":"买家保障","Order Summary":"订单摘要","Pay Now":"立即付款",
    "Product Detail":"商品详情","Preferred Seller":"优选卖家","Stock":"库存","Protection":"保障","Escrow until complete":"完成前托管","Seller:":"卖家：","Warranty:":"保修：","Return rule:":"退货规则：","Buy Now":"立即购买","Chat Seller":"联系卖家",
    "Request Return, Refund or Change Goods":"申请退货、退款或换货","Refund Only":"仅退款","Change Goods":"换货","Reason, damaged/wrong item, evidence note":"原因、损坏/错误商品、证据说明","Upload Evidence Photo":"上传证据照片","Requests":"申请","Loading...":"加载中...","Submit":"提交","Order Detail":"订单详情","Tracking Flow":"物流流程","Escrow release countdown":"托管释放倒计时","Request Return / Refund":"申请退货 / 退款",
    "Seller Store":"卖家店铺","View Store Products":"查看店铺商品","Search Goods by Photo":"用照片搜索商品","Matches":"匹配结果","Choose from device":"从设备选择","Take a photo":"拍照","Search":"搜索","Optional keyword: phone, toy, meal, hardware":"可选关键词：手机、玩具、餐食、五金"
  });
  Object.keys(dictionary.ms).forEach(key=>{dictionary.en[key]=key});
  Object.assign(dictionary.zh,{
    "phones":"\u7535\u8bdd","hardware":"\u4e94\u91d1","stationery":"\u6587\u5177","street food":"\u8857\u5934\u7f8e\u98df","free shipping":"\u514d\u8fd0\u8d39",
    "Phone":"\u7535\u8bdd","Phones":"\u7535\u8bdd","Chargers":"\u5145\u7535\u5668","Electronics":"\u7535\u5b50\u4ea7\u54c1","Car Parts":"\u6c7d\u8f66\u914d\u4ef6","Hardware":"\u4e94\u91d1","Stationery":"\u6587\u5177","Toys":"\u73a9\u5177","Shoes":"\u978b","Clothes":"\u670d\u88c5","Meals":"\u9910\u98df","Street Food":"\u8857\u5934\u7f8e\u98df","Food":"\u98df\u54c1","Drinks":"\u996e\u6599",
    "Your Cart":"\u6211\u7684\u8d2d\u7269\u8f66","Platform Voucher":"\u5e73\u53f0\u4f18\u60e0\u5238","Use Voucher":"\u4f7f\u7528\u4f18\u60e0\u5238","PM Coins":"PM \u91d1\u5e01","Delivery Address":"\u914d\u9001\u5730\u5740","Full delivery address":"\u5b8c\u6574\u914d\u9001\u5730\u5740","Contact":"\u8054\u7cfb","Email for receipt":"\u6536\u636e\u7535\u90ae","Phone number":"\u7535\u8bdd\u53f7\u7801","Shipping & Payment":"\u914d\u9001\u4e0e\u4ed8\u6b3e","Select payment method":"\u9009\u62e9\u4ed8\u6b3e\u65b9\u5f0f","Cash Pickup":"\u53d6\u8d27\u4ed8\u73b0","Apply Voucher":"\u4f7f\u7528\u4f18\u60e0\u5238","Buyer Protection":"\u4e70\u5bb6\u4fdd\u969c","Order Summary":"\u8ba2\u5355\u6458\u8981","Pay Now":"\u7acb\u5373\u4ed8\u6b3e",
    "Product Detail":"\u5546\u54c1\u8be6\u60c5","Preferred Seller":"\u4f18\u9009\u5356\u5bb6","Stock":"\u5e93\u5b58","Protection":"\u4fdd\u969c","Escrow until complete":"\u5b8c\u6210\u524d\u6258\u7ba1","Seller:":"\u5356\u5bb6\uff1a","Warranty:":"\u4fdd\u4fee\uff1a","Return rule:":"\u9000\u8d27\u89c4\u5219\uff1a","Buy Now":"\u7acb\u5373\u8d2d\u4e70","Chat Seller":"\u8054\u7cfb\u5356\u5bb6",
    "Request Return, Refund or Change Goods":"\u7533\u8bf7\u9000\u8d27\u3001\u9000\u6b3e\u6216\u6362\u8d27","Refund Only":"\u4ec5\u9000\u6b3e","Change Goods":"\u6362\u8d27","Reason, damaged/wrong item, evidence note":"\u539f\u56e0\u3001\u635f\u574f/\u9519\u8bef\u5546\u54c1\u3001\u8bc1\u636e\u8bf4\u660e","Upload Evidence Photo":"\u4e0a\u4f20\u8bc1\u636e\u7167\u7247","Requests":"\u7533\u8bf7","Loading...":"\u52a0\u8f7d\u4e2d...","Submit":"\u63d0\u4ea4","Order Detail":"\u8ba2\u5355\u8be6\u60c5","Tracking Flow":"\u8ddf\u8e2a\u6d41\u7a0b","Escrow release countdown":"\u6258\u7ba1\u91ca\u653e\u5012\u8ba1\u65f6","Request Return / Refund":"\u7533\u8bf7\u9000\u8d27 / \u9000\u6b3e",
    "Seller Store":"\u5356\u5bb6\u5e97\u94fa","View Store Products":"\u67e5\u770b\u5e97\u94fa\u5546\u54c1","Search Goods by Photo":"\u7528\u7167\u7247\u641c\u7d22\u5546\u54c1","Matches":"\u5339\u914d\u7ed3\u679c","Choose from device":"\u4ece\u8bbe\u5907\u9009\u62e9","Take a photo":"\u62cd\u7167","Search":"\u641c\u7d22","Optional keyword: phone, toy, meal, hardware":"\u53ef\u9009\u5173\u952e\u8bcd\uff1a\u7535\u8bdd\u3001\u73a9\u5177\u3001\u9910\u98df\u3001\u4e94\u91d1"
  });
  const css=".pm-badge{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:999px;background:#f6c85f;color:#182236;padding:0 6px;font-size:12px;font-weight:900;margin-left:5px}.pm-badge.hide{display:none}.pm-seller-switch{position:fixed;right:22px;bottom:22px;z-index:30;border:0;border-radius:999px;background:linear-gradient(135deg,#0f9f8f,#6d5dfc);color:#fff;box-shadow:0 10px 26px #0003;min-height:44px;padding:0 15px;font-weight:900;font-size:13px}.pm-policy-link{position:fixed;left:22px;bottom:22px;z-index:30;border:1px solid #dbe4ea;border-radius:999px;background:#fff;color:#0f9f8f;box-shadow:0 10px 26px #0002;min-height:38px;padding:0 13px;font-weight:900;font-size:12px;display:inline-flex;align-items:center;text-decoration:none}.buyer-lang-toggle{border:1px solid #dbe4ea;border-radius:999px;background:#fff;color:#0f9f8f;font-weight:900;font-size:12px;min-height:34px;padding:0 10px}.pm-seller-switch:hover,.pm-policy-link:hover{filter:brightness(.98)}@media(max-width:760px){.pm-mobile-links{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 8px 0}.pm-mobile-links .pm-seller-switch,.pm-mobile-links .pm-policy-link{position:static;left:auto;right:auto;bottom:auto;z-index:1;box-shadow:none;width:100%;justify-content:center;min-height:42px;border-radius:8px}.pm-mobile-links .pm-policy-link{border:1px solid #dbe4ea}.pm-mobile-links .pm-seller-switch{border:0}}";
  const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
  function token(){return localStorage.getItem("pm_token")||""}
  function currentLang(){const stored=localStorage.getItem(LANG_KEY);if(stored==="ms"||stored==="en"||stored==="zh")return stored;localStorage.setItem(LANG_KEY,"ms");return"ms"}
  function sourceMap(){const map={};[dictionary.ms,dictionary.en,dictionary.zh].forEach(group=>Object.entries(group).forEach(([key,value])=>{map[value]=key}));return map}
  function cleanVisibleText(value){
    return String(value||"")
      .replace(/\b(Cloudinary|Postgres|Auth Seller|Voucher Test|Test Item|System test|Automated return|Buyer Bad|Seller Test|Bad Product|demo|test|should-fail|notification test|button live test)\b/gi,"")
      .replace(/\b\d{5,}\b/g,"")
      .replace(/\s{2,}/g," ")
      .trim();
  }
  function translateString(value){
    const raw=cleanVisibleText(value);
    if(!raw)return raw;
    const lookup=sourceMap(),lang=currentLang(),key=lookup[raw]||raw;
    return (dictionary[lang]&&dictionary[lang][key])||raw;
  }
  function translateText(value,lang,lookup){
    let text=cleanVisibleText(value);
    const key=lookup[text]||text;
    text=(dictionary[lang]&&dictionary[lang][key])||text;
    const phrases=Object.keys(dictionary.ms).sort((a,b)=>b.length-a.length);
    phrases.forEach(phrase=>{
      if(phrase.length<5)return;
      const translated=(dictionary[lang]&&dictionary[lang][phrase])||phrase;
      if(translated!==phrase)text=text.split(phrase).join(translated);
    });
    if(lang==="ms"){
      text=text
        .replace(/\bpaid\b/g,"dibayar")
        .replace(/\bopen\b/g,"dibuka")
        .replace(/\bBlue\b/g,"Biru")
        .replace(/\bRefund\b/g,"Bayaran Balik")
        .replace(/\bOrder\b/g,"Pesanan")
        .replace(/\bExpired\b/g,"Tamat tempoh");
    }
    return cleanVisibleText(text).replace(/Ambil Hantariri/g,"Ambil Sendiri");
  }
  function applyLanguage(){
    const lang=currentLang(),lookup=sourceMap();
    document.documentElement.lang=lang;
    document.querySelectorAll("#langToggle,.buyer-lang-toggle").forEach(button=>{button.textContent=labels[lang]});
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(node){if(!node.nodeValue.trim())return NodeFilter.FILTER_REJECT;if(node.parentElement&&["SCRIPT","STYLE","TEXTAREA"].includes(node.parentElement.tagName))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const raw=node.nodeValue.trim(),next=translateText(raw,lang,lookup);if(next!==raw)node.nodeValue=node.nodeValue.replace(raw,next)});
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
