'use strict';

const https = require('https');
const { URL } = require('url');

const VERSION = '1.0.0';
const DEFAULT_BASE = 'https://www.selldatatoai.com/api/v1';
const USER_AGENT = `selldatatoai-node/${VERSION} (+https://www.selldatatoai.com)`;
const BATCH_MAX = 100;

class SellDataToAIError extends Error {
  constructor(status, code, message, body) {
    super(message || code || `HTTP ${status}`);
    this.name = 'SellDataToAIError';
    this.status = status;
    this.code = code || null;
    this.body = body || null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class DataAssetScoreClient {
  /**
   * @param {string} apiKey  key from your selldatatoai.com dashboard
   * @param {{baseUrl?: string, timeout?: number}} [options]
   */
  constructor(apiKey, options = {}) {
    if (!apiKey) throw new Error('An API key is required. Plans: https://www.selldatatoai.com/pricing/');
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE).replace(/\/+$/, '');
    this.timeout = options.timeout || 60000;
  }

  _request(method, path, query, body) {
    const url = new URL(this.baseUrl + path);
    if (query) Object.keys(query).forEach((k) => url.searchParams.set(k, query[k]));
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'X-API-Key': this.apiKey, 'User-Agent': USER_AGENT, Accept: 'application/json' };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    return new Promise((resolve, reject) => {
      const req = https.request(url, { method, headers, timeout: this.timeout }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data = null;
          try { data = JSON.parse(text); } catch (e) { data = null; }
          if (res.statusCode >= 200 && res.statusCode < 300 && data) return resolve(data);
          const code = data && data.error ? data.error : null;
          const msg = data && data.message ? data.message : `HTTP ${res.statusCode}`;
          reject(new SellDataToAIError(res.statusCode, code, msg, data || text));
        });
      });
      req.on('timeout', () => req.destroy(new SellDataToAIError(0, 'timeout', `No answer within ${this.timeout} ms`)));
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  /** Score one company domain. Full URLs are accepted. */
  score(domain) {
    if (!domain) return Promise.reject(new Error('domain is required'));
    return this._request('GET', '/score', { domain: String(domain).trim() });
  }

  /** Submit up to 100 domains. Resolves with the batch object (id, status, results...). */
  submitBatch(domains) {
    if (!Array.isArray(domains) || domains.length === 0) return Promise.reject(new Error('domains must be a non-empty array'));
    if (domains.length > BATCH_MAX) return Promise.reject(new Error(`A batch takes at most ${BATCH_MAX} domains`));
    return this._request('POST', '/score/batch', null, { domains });
  }

  /** Poll a batch. Polling does not use lookups. */
  getBatch(id) {
    return this._request('GET', '/score/batch', { id });
  }

  /** Wait until a batch is done. */
  async waitForBatch(id, { interval = 5000, maxWait = 300000 } = {}) {
    const start = Date.now();
    for (;;) {
      const b = await this.getBatch(id);
      if (b.status === 'done') return b;
      if (Date.now() - start > maxWait) throw new SellDataToAIError(0, 'batch_timeout', `Batch ${id} still processing after ${maxWait} ms`, b);
      await sleep(interval);
    }
  }

  /**
   * Score any number of domains: splits into batches of 100, runs them one after another
   * and returns the result items in input order.
   */
  async scoreMany(domains, opts = {}) {
    const out = [];
    for (let i = 0; i < domains.length; i += BATCH_MAX) {
      const sent = await this.submitBatch(domains.slice(i, i + BATCH_MAX));
      const done = sent.status === 'done' ? sent : await this.waitForBatch(sent.id, opts);
      out.push(...done.results);
      if (typeof opts.onBatch === 'function') opts.onBatch(done);
    }
    return out;
  }

  /** Plan, lookups used this month and lookups remaining. */
  usage() {
    return this._request('GET', '/usage');
  }
}

module.exports = { DataAssetScoreClient, SellDataToAIError, VERSION, BATCH_MAX };
