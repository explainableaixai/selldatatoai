'use strict';
// Offline test: a local HTTP stub stands in for the API.
const http = require('http');
const assert = require('assert');
const { DataAssetScoreClient, SellDataToAIError } = require('./index');

const result = { domain: 'example-labs.com', data_asset_score: 82, grade: 'A', status: 'active', results: [] };
let polls = 0;
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  if (req.headers['x-api-key'] !== 'k') return send(401, { error: 'invalid_api_key', message: 'bad key' });
  if (u.pathname === '/v1/score') return u.searchParams.get('domain') === 'bad' ? send(400, { error: 'invalid_domain' }) : send(200, result);
  if (u.pathname === '/v1/usage') return send(200, { plan: 'pro', used: 1, limit: 25000, remaining: 24999 });
  if (u.pathname === '/v1/score/batch' && req.method === 'POST') {
    let b = ''; req.on('data', (c) => (b += c));
    return req.on('end', () => {
      const n = JSON.parse(b).domains.length;
      send(202, { id: 'b_1', status: 'processing', total: n, pending: n, results: [] });
    });
  }
  if (u.pathname === '/v1/score/batch') {
    polls += 1;
    return send(200, polls < 2 ? { id: 'b_1', status: 'processing', results: [] }
      : { id: 'b_1', status: 'done', results: [{ input: 'a.com', domain: 'a.com', status: 'done', result }] });
  }
  send(404, { error: 'unknown_endpoint' });
});

server.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}/v1`;
  const http2 = require('http');
  const https = require('https');
  https.request = http2.request; // the stub speaks plain HTTP
  const c = new DataAssetScoreClient('k', { baseUrl: base });
  assert.strictEqual((await c.score('example-labs.com')).grade, 'A');
  assert.strictEqual((await c.usage()).remaining, 24999);
  await assert.rejects(c.score('bad'), (e) => e instanceof SellDataToAIError && e.status === 400 && e.code === 'invalid_domain');
  await assert.rejects(new DataAssetScoreClient('x', { baseUrl: base }).usage(), (e) => e.status === 401);
  const items = await c.scoreMany(['a.com'], { interval: 10 });
  assert.strictEqual(items[0].result.data_asset_score, 82);
  console.log('ok');
  server.close();
});
