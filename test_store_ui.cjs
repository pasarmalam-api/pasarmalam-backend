const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync('landing-site-v2/'+p,'utf8');
for(const p of ['store-types.js','buyer/buyer-ui.js','seller/seller-session.js','seller/seller-shops.js','seller/seller-actions.js'])new vm.Script(read(p),{filename:p});
for(const dir of ['buyer','seller'])for(const f of fs.readdirSync('landing-site-v2/'+dir).filter(f=>f.endsWith('.html'))){
 for(const m of read(dir+'/'+f).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(m[1].trim())new vm.Script(m[1],{filename:dir+'/'+f});
}
assert.match(read('seller/register.html'),/store_type:\$\("storeType"\).value/);
assert.match(read('buyer/become-seller.html'),/store-types.js/);
assert.match(read('seller/seller-shops.js'),/store_type:el\('newShopType'\).value/);
assert.match(read('seller/seller-session.js'),/accountItems.append\(switchBuyer\)/);
assert.doesNotMatch(read('seller/seller-actions.js'),/Add Factory Direct Product/);
assert.doesNotMatch(read('seller/products.html'),/Add Factory Direct Product/);
assert.doesNotMatch(read('buyer/index.html'),/href="category.html\?selling_mode=factory"/);
console.log('PASS: frontend syntax, signup store type payload, onboarding, new shops, account menu and duplicate-action removal');
