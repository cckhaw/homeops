// Tiny stand-ins for outside services: Resend (port 4020, records mails to mails.json) and Cloudflare Turnstile (4030).
const http = require('http');
const fs = require('fs');
const out = process.argv[2] || '.';
const f = out + '/mails.json';
fs.writeFileSync(f, '[]');
http.createServer((req, res) => {
  let b = '';
  req.on('data', (d) => (b += d));
  req.on('end', () => {
    try { const all = JSON.parse(fs.readFileSync(f)); all.push(JSON.parse(b)); fs.writeFileSync(f, JSON.stringify(all)); } catch {}
    res.setHeader('content-type', 'application/json');
    res.end('{"id":"x"}');
  });
}).listen(4020);
http.createServer((q, r) => {
  let b = '';
  q.on('data', (d) => (b += d));
  q.on('end', () => { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ success: /response=good/.test(b) })); });
}).listen(4030);

// WhatsApp Cloud API (4040): records every request body in whatsapp.json.
const wa = out + '/whatsapp.json';
fs.writeFileSync(wa, '[]');
http.createServer((q, r) => {
  let b = '';
  q.on('data', (d) => (b += d));
  q.on('end', () => {
    let body = {};
    try { body = JSON.parse(b); const all = JSON.parse(fs.readFileSync(wa)); all.push({ url: q.url, auth: q.headers.authorization, ...body }); fs.writeFileSync(wa, JSON.stringify(all)); } catch {}
    const bad = String(body.to || '').endsWith('0000'); // numbers ending 0000 simulate a delivery failure
    r.statusCode = bad ? 400 : 200;
    r.setHeader('content-type', 'application/json');
    r.end(bad ? '{"error":{"message":"bad number"}}' : '{"messages":[{"id":"wamid.x"}]}');
  });
}).listen(4040);

// Push service (4050, HTTPS with a throw-away certificate): /push/ok → 201, /push/gone → 410. Counts in push.json.
try {
  const { execFileSync } = require('child_process');
  const key = out + '/push-key.pem', crt = out + '/push-cert.pem';
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', crt, '-subj', '/CN=localhost', '-days', '2'], { stdio: 'ignore' });
  const pushLog = out + '/push.json';
  fs.writeFileSync(pushLog, '[]');
  require('https').createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(crt) }, (q, r) => {
    const chunks = [];
    q.on('data', (d) => chunks.push(d));
    q.on('end', () => {
      try { const all = JSON.parse(fs.readFileSync(pushLog)); all.push({ path: q.url, bytes: Buffer.concat(chunks).length, ttl: q.headers.ttl, auth: String(q.headers.authorization || '').slice(0, 12) }); fs.writeFileSync(pushLog, JSON.stringify(all)); } catch {}
      r.statusCode = q.url.includes('gone') ? 410 : 201;
      r.end();
    });
  }).listen(4050);
} catch (e) {
  console.error('push mock not started', e.message);
}
