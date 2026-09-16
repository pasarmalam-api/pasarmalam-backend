const { chromium } = require('C:/Users/yongd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve('landing-site-v2/seller');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext();
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'seller.test') return route.abort();
      const file = path.join(root, url.pathname);
      if (!file.startsWith(root) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      const contentType = { '.jpg': 'image/jpeg', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] || 'text/html';
      return route.fulfill({ contentType, body: fs.readFileSync(file) });
    });
    const page = await context.newPage();
    const pages = fs.readdirSync(root).filter(file => file.endsWith('.html'));
    for (const file of pages) {
      const html = fs.readFileSync(path.join(root, file), 'utf8');
      assert(!html.includes('<div class="logo">PM</div>'), file);
      assert(html.includes('href="seller-logo.jpg"'), file + ' favicon');
    }
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('https://seller.test/login.html');
      await page.locator('img.logo').waitFor();
      await page.waitForFunction(() => document.querySelector('img.logo')?.naturalWidth > 0);
      const logo = await page.locator('img.logo').evaluate(img => ({ width: img.naturalWidth, fit: getComputedStyle(img).objectFit, box: img.getBoundingClientRect().width }));
      assert(logo.width > 0 && logo.box > 0 && logo.fit === 'contain');
      fs.mkdirSync('../outputs/seller-logo', { recursive: true });
      await page.screenshot({ path: '../outputs/seller-logo/' + width + '.png', fullPage: true });
    }
    console.log('PASS seller logo references across ' + pages.length + ' pages; image renders uncropped on mobile and desktop');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
