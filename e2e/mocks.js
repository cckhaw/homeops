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

// Anthropic Messages API (4060): answers receipt and nameplate scans. Records requests in anthropic.json.
const an = out + '/anthropic.json';
fs.writeFileSync(an, '[]');
http.createServer((q, r) => {
  let b = '';
  q.on('data', (d) => (b += d));
  q.on('end', () => {
    let body = {};
    try { body = JSON.parse(b); } catch {}
    const prompt = JSON.stringify(body.messages || []);
    const label = /rating plate/.test(prompt);
    try { const all = JSON.parse(fs.readFileSync(an)); all.push({ url: q.url, key: q.headers['x-api-key'], mode: label ? 'label' : 'receipt' }); fs.writeFileSync(an, JSON.stringify(all)); } catch {}
    const unreadable = /UNREADABLE/.test(process.env.MOCK_AI || '') ;
    const result = label
      ? { name: 'Inverter air conditioner', category: 'Air Conditioner', make: 'Daikin', model: 'Model: FTKM25VAVMV', serialNumber: 'S/N G123456', manufactureDate: '2024-05' }
      : { name: 'Fridge', category: 'Refrigerator', make: 'LG', model: 'GN-B392', serialNumber: null, purchaseDate: '2026-01-15', warrantyMonths: 24, vendor: 'Courts', total: 1299 };
    r.setHeader('content-type', 'application/json');
    r.end(JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', model: body.model || 'test', content: [{ type: 'text', text: unreadable ? 'sorry, cannot read' : JSON.stringify(result) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }));
  });
}).listen(4060);

// Telegram Bot API (4070): records calls in telegram.json. Chats whose id ends in 666 behave as if they blocked the bot.
const tg = out + '/telegram.json';
fs.writeFileSync(tg, '[]');
let tgWebhook = '';
http.createServer((q, r) => {
  let b = '';
  q.on('data', (d) => (b += d));
  q.on('end', () => {
    let body = {};
    try { body = JSON.parse(b); } catch {}
    const method = (q.url || '').split('/').pop();
    try { const all = JSON.parse(fs.readFileSync(tg)); all.push({ method, ...body }); fs.writeFileSync(tg, JSON.stringify(all)); } catch {}
    r.setHeader('content-type', 'application/json');
    if (method === 'sendMessage' && String(body.chat_id).endsWith('666')) { r.statusCode = 403; return r.end('{"ok":false,"error_code":403,"description":"Forbidden: bot was blocked by the user"}'); }
    if (method === 'setWebhook') tgWebhook = body.url || '';
    if (method === 'getWebhookInfo') return r.end(JSON.stringify({ ok: true, result: { url: tgWebhook, pending_update_count: 0 } }));
    r.end('{"ok":true,"result":true}');
  });
}).listen(4070);
