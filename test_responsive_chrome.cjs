const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('landing-site-v2/workspace-ui.css', 'utf8');
const responsive = css.slice(css.indexOf('/* Phone chrome grows'));
assert.match(responsive, /\.app>aside\{position:static!important;height:auto!important/);
assert.match(responsive, /\.app>aside nav\{position:static!important;inset:auto!important/);
assert.match(responsive, /\.app header\{position:static!important;top:auto!important/);
assert.match(responsive, /max-height:50dvh/);
assert.match(responsive, /max-height:500px/);
assert.match(responsive, /overflow-wrap:anywhere/);
assert.match(responsive, /body\.seller-menu-locked\{overflow:auto!important\}/);
assert.match(responsive, /body\.seller-menu-locked \.app \.seller-menu-backdrop/);
const android = fs.readFileSync('../android-pasarmalam/app/src/main/java/com/pasarmalam/app/MainActivity.java', 'utf8');
assert.match(android, /setOnApplyWindowInsetsListener/);
for (const type of ['systemBars', 'displayCutout', 'ime']) {
  assert.ok(android.includes(`WindowInsets.Type.${type}()`));
}
assert.match(android, /return WindowInsets.CONSUMED/);
assert.match(android, /content\.setFitsSystemWindows\(true\)/);
console.log('PASS: adaptive phone chrome, short landscape fallback and Android system/keyboard insets.');
