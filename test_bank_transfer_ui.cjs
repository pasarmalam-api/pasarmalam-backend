const {chromium} = require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve('landing-site-v2');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end();
  }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({channel: 'msedge', headless: true});
    const context = await browser.newContext();
    const origin = 'http://127.0.0.1:' + server.address().port;
    await context.addInitScript(() => {
      localStorage.setItem('pm_token', 'test');
      localStorage.setItem('pm_user', JSON.stringify({id: 1, role: 'buyer', name: 'Buyer', address: 'Pickup', phone: '01123456789'}));
      localStorage.setItem('pasarmalam-lang', 'en');
    });
    let status = 'unpaid', submitted;
    await context.route('https://pasarmalam-backend.onrender.com/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/notify')) {
        submitted = route.request().postDataJSON(); status = 'pending_review';
        return route.fulfill({json: {ok: true}});
      }
      if (url.pathname === '/api/payments/bank-transfer') return route.fulfill({json: {
        order: {id: 123, total: 1000, payment_reference: 'PM-BULK-123-AABBCC', payment_status: status, order_status: 'pending_payment'},
        bank: {name: 'Public Bank Berhad', account_name: 'TANITOOLUWA VENTURES', account_number: '3248827222'}
      }});
      return route.fulfill({json: {products: [{id: 1, price: 100, stock: 30, minimum_order: 10, selling_mode: 'bulk', name: 'Wholesale goods', shop: 'Demo', seller_id: 2, category: 'Electronics'}], cart: [{product_id: 1, quantity: 10}], branches: [], campaigns: [], notifications: [], is_open: true}});
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/buyer/checkout.html');
    await page.locator('option[value="Bank Transfer"]').waitFor({state: 'attached'});
    await page.locator('#payment').selectOption('Bank Transfer');
    await page.waitForFunction(() => document.getElementById('pay').textContent.includes('bank transfer'));
    await page.goto(origin + '/buyer/bank-transfer.html?id=123');
    await page.getByText('RM1000.00', {exact: true}).waitFor();
    fs.mkdirSync('release-zips/bank-transfer-review', {recursive: true});
    for (const [name, width] of [['desktop', 1280], ['mobile', 390]]) {
      await page.setViewportSize({width, height: 900});
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({path: 'release-zips/bank-transfer-review/' + name + '.png', fullPage: true});
    }
    await page.getByLabel('Your bank transaction reference').fill('BANK-TEST-123');
    await page.getByRole('button', {name: 'Submit for Review'}).click();
    await page.getByText(/Awaiting admin bank confirmation/).waitFor();
    assert.deepStrictEqual(submitted, {order_id: 123, sender_reference: 'BANK-TEST-123'});
    assert.deepStrictEqual(errors, []);
    console.log('Bulk checkout option, review submission and desktop/mobile layout passed');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
