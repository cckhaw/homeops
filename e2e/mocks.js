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
