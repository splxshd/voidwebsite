const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const port = process.env.PORT || 4173;
const rootDir = __dirname;

const ownerEmail = (process.env.OWNER_EMAIL || 'owner@temorpay.com').toLowerCase();
const ownerPassword = process.env.OWNER_PASSWORD || 'temor123';
const activeTokens = new Set();

const invoices = [
  { id: 'INV-1048', product: 'Pro Access', amountLtc: 0.34, detection: 'Automatic', status: 'Paid', updated: '2 min ago', orderId: 'ORD-8812' },
  { id: 'INV-1047', product: 'Starter Access', amountLtc: 0.11, detection: 'Manual TXID', status: 'Reviewing', updated: '4 min ago', orderId: 'ORD-8811', txid: null },
  { id: 'INV-1046', product: 'Enterprise', amountLtc: 1.22, detection: 'Automatic', status: 'Expired', updated: '10 min ago', orderId: 'ORD-8810' },
];

const deliveryQueue = [
  { orderId: 'ORD-8812', email: 'buyer1@email.com', product: 'Pro Access', status: 'Sent', retries: 0 },
  { orderId: 'ORD-8811', email: 'buyer2@email.com', product: 'Starter Access', status: 'Queued', retries: 0 },
  { orderId: 'ORD-8810', email: 'buyer3@email.com', product: 'Enterprise', status: 'Failed', retries: 1 },
];

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) reject(new Error('Request body too large'));
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
      return undefined;
    });
    req.on('error', reject);
  });
}

function getToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function requireAuth(req, res) {
  const token = getToken(req);
  if (!token || !activeTokens.has(token)) {
    json(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return true;
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(rootDir, path.normalize(cleanPath));
  if (!filePath.startsWith(rootDir)) {
    json(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      json(res, 404, { error: 'Not found' });
      return;
    }

    const ext = path.extname(filePath);
    const mime = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    }[ext] || 'text/plain';

    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const body = await readBody(req);
    const email = (body.email || '').toLowerCase();

    if (email !== ownerEmail || body.password !== ownerPassword) {
      return json(res, 401, { error: 'Invalid credentials' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    activeTokens.add(token);
    return json(res, 200, { token, owner: { email: ownerEmail } });
  }

  if (req.method === 'GET' && pathname === '/api/delivery/queue') {
    if (!requireAuth(req, res)) return;
    return json(res, 200, { items: deliveryQueue });
  }

  if (req.method === 'POST' && pathname.startsWith('/api/delivery/retry/')) {
    if (!requireAuth(req, res)) return;
    const orderId = pathname.split('/').pop();
    const item = deliveryQueue.find((entry) => entry.orderId === orderId);
    if (!item) return json(res, 404, { error: 'Order not found in queue' });

    item.retries += 1;
    item.status = 'Queued';
    return json(res, 200, { message: 'Delivery retry queued', item });
  }

  if (req.method === 'POST' && pathname.startsWith('/api/invoices/') && pathname.endsWith('/confirm')) {
    if (!requireAuth(req, res)) return;
    const id = pathname.split('/')[3];
    const body = await readBody(req);
    const invoice = invoices.find((entry) => entry.id === id);
    if (!invoice) return json(res, 404, { error: 'Invoice not found' });

    invoice.status = 'Confirmed';
    invoice.detection = body.txid ? 'Manual TXID' : invoice.detection;
    invoice.txid = body.txid || invoice.txid || null;
    invoice.updated = 'just now';

    const queueItem = deliveryQueue.find((entry) => entry.orderId === invoice.orderId);
    if (queueItem && queueItem.status !== 'Sent') queueItem.status = 'Queued';

    return json(res, 200, { message: 'Invoice confirmed', invoice });
  }

  if (req.method === 'POST' && pathname === '/api/webhooks/ltc') {
    const body = await readBody(req);
    if (!body.invoiceId) return json(res, 400, { error: 'invoiceId is required' });

    const invoice = invoices.find((entry) => entry.id === body.invoiceId);
    if (!invoice) return json(res, 404, { error: 'Invoice not found' });

    const confirmations = Number(body.confirmations || 0);
    invoice.status = confirmations >= 1 ? 'Paid' : 'Pending Confirmations';
    invoice.detection = 'Automatic';
    invoice.txid = body.txid || invoice.txid || null;
    invoice.updated = 'just now';

    const queueItem = deliveryQueue.find((entry) => entry.orderId === invoice.orderId);
    if (queueItem && confirmations >= 1) queueItem.status = 'Queued';

    return json(res, 200, { ok: true, invoice });
  }

  if (req.method === 'GET' && pathname === '/api/invoices') {
    if (!requireAuth(req, res)) return;
    return json(res, 200, { items: invoices });
  }

  serveStatic(req, res, pathname);
  return undefined;
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Temor server listening on http://localhost:${port}`);
});
