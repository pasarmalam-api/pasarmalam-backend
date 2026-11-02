const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const PMSelling=require('./landing-site-v2/selling-types.js');
const read=p=>fs.readFileSync('landing-site-v2/'+p,'utf8');
for(const file of ['seller/seller-actions.js','buyer/buyer-shopping.js'])new vm.Script(read(file),{filename:file});
for(const file of ['seller/index.html','seller/product-published.html','seller/add-product.html']){
  for(const m of read(file).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(m[1].trim())new vm.Script(m[1],{filename:file});
}
function node(){return {value:'',children:[],events:{},classList:{remove(){},toggle(){}},append(n){this.children.push(n)},after(n){this.next=n},addEventListener(n,f){this.events[n]=f}}}
const productLink=node(),filter=node(),rows=node(),toolbar=node();
const document={createElement:()=>node(),getElementById:id=>({sellingFilter:filter,rows}[id]),
  querySelector:s=>s==='nav a[href="products.html"]'?productLink:s==='.toolbar'?toolbar:null};
const location={pathname:'/seller/products.html',search:'?selling_mode=factory',href:'https://qa.test/seller/products.html?selling_mode=factory'};
let updated;
const window={draw(){rows.children=[]}};
const source=read('seller/seller-actions.js');
vm.runInNewContext(source.slice(0,source.indexOf("  if(page==='settings.html')"))+'})();',
  {document,location,window,URL,URLSearchParams,history:{replaceState(a,b,url){updated=url}}});
assert.equal(productLink.next.href,'products.html?selling_mode=factory');
assert.equal(filter.value,'factory');
assert.match(rows.children[0].children[0].textContent,/No Factory Direct products/);
filter.value='bulk';filter.events.change();assert.equal(updated.searchParams.get('selling_mode'),'bulk');
filter.value='';filter.events.change();assert.equal(updated.searchParams.has('selling_mode'),false);
assert.match(read('seller/add-product.html'),/product-published.html\?selling_mode=/);
const published=read('seller/product-published.html');
assert.match(published,/another'\).href='add-product.html\?selling_mode='/);
assert.match(published,/products'\).href='products.html\?selling_mode='/);
const shopping=read('buyer/buyer-shopping.js');
const checkout=shopping.slice(shopping.indexOf('  goCheckout=function'),shopping.indexOf("  for(const name of ['changeQty'"));
const item={id:1,product_id:901,selling_mode:'factory',minimum_order:1,quantity:499,stock:2000};
const ctx={cart:[item],selected:1,location:{href:'unchanged'},token:()=>true,minimum:PMSelling.minimum,URLSearchParams};
vm.runInNewContext(checkout,ctx);ctx.goCheckout();assert.equal(ctx.location.href,'unchanged');
item.quantity=500;ctx.goCheckout();assert.match(ctx.location.href,/quantity=500/);
console.log('Factory navigation, empty state, URL filter persistence, publish-return links and legacy cart floor passed');
