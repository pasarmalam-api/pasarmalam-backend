const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('landing-site-v2/buyer/badges.js', 'utf8');
const functions = source.slice(source.indexOf('  function sourceMap()'), source.indexOf('  function applyLanguage()'));
const context = vm.createContext({});
vm.runInContext(`let translationCache=null;
const dictionary={en:{Stock:'Stock',Cart:'Cart','Search products':'Search products'},ms:{Stock:'Stok',Cart:'Troli','Search products':'Cari produk'},zh:{Stock:'\\u5e93\\u5b58',Cart:'\\u8d2d\\u7269\\u8f66','Search products':'\\u641c\\u7d22\\u5546\\u54c1'}};
function currentLang(){return 'ms'}
${functions}
globalThis.test={sourceMap,translateString,translateText};`, context);
const lookup = context.test.sourceMap();
for(let i=0;i<1000;i++) assert.equal(context.test.sourceMap(),lookup);
assert.equal(context.test.translateText('Cart 3','ms',lookup),'Troli 3');
assert.equal(context.test.translateText('Stok 99','en',lookup),'Stock 99');
assert.equal(context.test.translateText('Troli 3','en',lookup),'Cart 3');
assert.match(source,/languageObserver\?\.disconnect\(\)/);
assert.match(source,/finally\{languageObserver\?\.observe/);
assert.match(source,/dictionary\.ms\[en\]!==ms.*translationCache=null/);
const html=fs.readFileSync('landing-site-v2/buyer/index.html','utf8');
const load=html.slice(html.indexOf('    async function load(){'),html.indexOf('    async function addCart('));
assert.match(load,/loadProducts\(\)/);
assert.match(load,/\/api\/cart/);
assert.doesNotMatch(load,/\/api\/(orders|returns|messages|reviews|logistics)/);
assert.match(html,/decoding="async"/);
assert.match(html,/badges\.js\?v=market-home20261118/);
console.log('PASS: cached translation tables, observer isolation, translated counters and lean home requests.');
