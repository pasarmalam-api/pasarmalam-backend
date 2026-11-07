const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const PMSelling = require('./landing-site-v2/selling-types.js');
const read = file => fs.readFileSync('landing-site-v2/' + file, 'utf8');

for (const file of ['buyer/index.html', 'buyer/product.html', 'buyer/category.html', 'buyer/checkout.html', 'buyer/cart.html', 'buyer/orders.html', 'buyer/order-detail.html', 'buyer/bank-transfer.html', 'buyer/seller-store.html', 'seller/add-product.html', 'seller/edit-product.html', 'seller/products.html', 'seller/orders.html', 'seller/order-detail.html', 'seller/wallet.html']) {
  const html = read(file);
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (match[1].trim()) new vm.Script(match[1], {filename: file});
}
for (const file of ['selling-types.js', 'buyer/checkout-bank-transfer.js', 'buyer/checkout-delivery.js', 'buyer/catalogue-search.js', 'buyer/buyer-shopping.js', 'buyer/bank-transfer.js']) new vm.Script(read(file), {filename:file});

for (const file of ['seller/add-product.html', 'seller/edit-product.html']) {
  const html = read(file), input={value:1};
  const handler = html.match(/id="sellingMode" onchange="([^"]+)"/)[1];
  vm.runInNewContext(`(function(){${handler}}).call({value:'factory'})`, {PMSelling, minimumOrder:input});
  assert.equal(input.min, 500);assert.equal(input.value, 500);assert.equal(input.disabled, false);
  input.value=1000;PMSelling.editor('factory',input,false);assert.equal(input.value,1000);
  PMSelling.editor('bulk',input);assert.equal(input.value,10);
  PMSelling.editor('retail',input);assert.equal(input.value,1);assert.equal(input.disabled,true);
}

const factory={id:1,name:'Factory cable',shop:'Factory',category:'Electronics',selling_mode:'factory',minimum_order:1000,stock:3000,price:2,condition:'New',price_mode:'Fixed'};
const retail={...factory,id:2,name:'Retail cable',selling_mode:'retail',minimum_order:1};
assert.match(PMSelling.badge(factory), /Factory Direct.*MOQ 1000/);
assert.match(PMSelling.photoBadge(factory), /Factory Sales/);
assert.equal(PMSelling.photoBadge(retail), '');
assert.equal(PMSelling.photoBadge({...factory,selling_mode:'bulk'}), '');
assert.equal(PMSelling.minimum({...factory,minimum_order:1}),500);
const home=read('buyer/index.html');
const from=home.indexOf('    function filteredProducts()'),to=home.indexOf('    function openDetail',from);
const fields={value:''};
const ctx=vm.createContext({PMSelling,apiProducts:[factory,retail],sellingFilter:{value:'factory'},search:fields,minPrice:fields,maxPrice:fields,ratingFilter:{value:'0'},active:'All',conditionFilter:{value:'All'},shippingFilter:{value:'All'},PMCatalogue:{mixShops:rows=>rows},PMShop:{badge:()=>'',closed:()=>false},products:{},imgFor:()=>'',money:n=>'RM'+n,tr:k=>k,encodeURIComponent});
vm.runInContext(home.slice(from,to),ctx);
assert.equal(ctx.filteredProducts().length,1);ctx.drawProducts();
assert.match(ctx.products.innerHTML,/Factory Direct/);assert.match(ctx.products.innerHTML,/MOQ 1000/);assert.doesNotMatch(ctx.products.innerHTML,/Retail cable/);
ctx.sellingFilter.value='';assert.equal(ctx.filteredProducts().length,2);

const product=read('buyer/product.html'),status={textContent:''},qty={value:1000};
const purchase=vm.createContext({PMSelling,currentProduct:factory,PMShop:{closed:()=>false},document:{getElementById:id=>id==='qty'?qty:status},location:{},variant:{value:'Blue'},encodeURIComponent});
vm.runInContext(product.slice(product.indexOf('    function selectedQty'),product.indexOf('    async function load()')),purchase);
purchase.buyNow();assert.match(purchase.location.href,/checkout.html\?product_id=1&quantity=1000&variant=Blue/);
qty.value=999;purchase.location.href='unchanged';purchase.buyNow();assert.equal(purchase.location.href,'unchanged');assert.match(status.textContent,/1000 units/);
assert.match(read('buyer/catalogue-search.js'), /selling_mode.*selling_mode/s);
assert.doesNotMatch(read('seller/products.html'), /Add Factory Direct Product/);
console.log('Factory seller controls, buyer filtering, MOQ badges, Buy Now navigation and changed-script syntax passed');
