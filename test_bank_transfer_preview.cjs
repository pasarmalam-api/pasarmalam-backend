const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve('landing-site-v2');
let paymentStatus = 'unpaid';
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8768');
  if (url.pathname === '/api/payments/bank-transfer/notify') {
    paymentStatus = 'pending_review';
    res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ok: true}));
  }
  if (url.pathname === '/api/payments/bank-transfer') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({order: {id: 123, total: 1000, payment_reference: 'DEMO-NOT-FOR-PAYMENT',
      payment_status: paymentStatus, order_status: 'pending_payment'},
      bank: {name: 'Public Bank Berhad (preview)', account_name: 'DEMO - DO NOT TRANSFER', account_number: 'DEMO'}}));
  }
  const file = path.resolve(root, '.' + url.pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end();
  }
  if (file.endsWith('.js') || file.endsWith('.html')) {
    let content = fs.readFileSync(file, 'utf8').replaceAll('https://pasarmalam-backend.onrender.com', 'http://127.0.0.1:8768');
    if (file.endsWith('.html')) content = content.replace('<head>', '<head><script>localStorage.setItem("pm_token","local-preview-only")</script>');
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/html');
    return res.end(content);
  }
  res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream');
  res.end(fs.readFileSync(file));
}).listen(8768, '127.0.0.1', () => console.log('Demo preview: http://127.0.0.1:8768/buyer/bank-transfer.html?id=123'));
