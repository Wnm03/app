'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
// S2319: version-agnostic — cache name dibaca dari sw.js, tidak di-hardcode per build bump.
const CUR = (swSource.match(/CACHE_NAME\s*=\s*'([^']+)'/) || [])[1];

function makeHarness({ oldCaches = [], fetchImpl } = {}) {
  const listeners = {};
  const cacheData = new Map();
  const cacheOps = [];
  const cacheObj = (name) => ({
    addAll: async (urls) => { cacheOps.push(['addAll', name, urls]); cacheData.set(name, new Map(urls.map(u => [u, { ok: true, url: u }]))); },
    put: async (req, res) => { cacheOps.push(['put', name, typeof req === 'string' ? req : req.url]); if (!cacheData.has(name)) cacheData.set(name, new Map()); cacheData.get(name).set(typeof req === 'string' ? req : req.url, res); },
  });
  for (const n of oldCaches) cacheData.set(n, new Map());
  const context = {
    console,
    URL,
    Response,
    self: {
      location: { origin: 'https://example.test' },
      addEventListener: (type, fn) => { listeners[type] = fn; },
      skipWaiting: () => { cacheOps.push(['skipWaiting']); },
      clients: { claim: async () => { cacheOps.push(['clients.claim']); } },
    },
    caches: {
      open: async (name) => cacheObj(name),
      keys: async () => [...cacheData.keys()],
      delete: async (name) => { cacheOps.push(['delete', name]); return cacheData.delete(name); },
      match: async (req) => {
        const raw = typeof req === 'string' ? req : req.url;
        const key = raw === './index.html' ? raw : raw;
        for (const m of cacheData.values()) { if (m.has(key)) return m.get(key); if (raw.endsWith('/index.html') && m.has('./index.html')) return m.get('./index.html'); } 
        return undefined;
      },
    },
    fetch: fetchImpl || (async (req) => new Response('fresh:' + (typeof req === 'string' ? req : req.url), { status: 200 })),
  };
  vm.runInNewContext(swSource, context, { filename: 'sw.js' });
  return { listeners, cacheData, cacheOps };
}

test('S2275: SW install precaches current cache and requests activation', async () => {
  const h = makeHarness();
  let waited;
  h.listeners.install({ waitUntil: p => { waited = p; } });
  assert.ok(waited);
  await waited;
  assert.ok(h.cacheOps.some(x => x[0] === 'skipWaiting'));
  assert.ok(h.cacheOps.some(x => x[0] === 'addAll' && x[1] === CUR));
});

test('S2275: activate removes stale cache versions and claims clients', async () => {
  const h = makeHarness({ oldCaches: ['kw-cache-v2209', CUR, 'other-cache'] });
  let waited;
  h.listeners.activate({ waitUntil: p => { waited = p; } });
  await waited;
  assert.deepEqual(h.cacheOps.filter(x => x[0] === 'delete').map(x => x[1]).sort(), ['kw-cache-v2209']);
  assert.ok(h.cacheOps.some(x => x[0] === 'clients.claim'));
});

test('S2275: static asset fetch is network-first and refreshes SW cache', async () => {
  const h = makeHarness({ fetchImpl: async (req, opts) => {
    assert.equal(opts.cache, 'no-cache');
    return new Response('new bundle', { status: 200 });
  }});
  let responsePromise;
  h.listeners.fetch({
    request: { method: 'GET', url: 'https://example.test/app-bundle-b.min.js', mode: 'no-cors', headers: { get: () => '' } },
    respondWith: p => { responsePromise = p; },
  });
  const response = await responsePromise;
  assert.equal(response.status, 200);
  assert.ok(h.cacheOps.some(x => x[0] === 'put' && x[1] === CUR));
});

test('S2275: navigation prefers fresh network, then cached shell on offline/HTTP error', async () => {
  const h = makeHarness({ fetchImpl: async () => { throw new Error('offline'); } });
  h.cacheData.set(CUR, new Map([['./index.html', new Response('cached shell', { status: 200 })]]));
  let responsePromise;
  h.listeners.fetch({
    request: { method: 'GET', url: 'https://example.test/index.html', mode: 'navigate', headers: { get: name => name === 'accept' ? 'text/html' : '' } },
    respondWith: p => { responsePromise = p; },
  });
  const response = await responsePromise;
  assert.equal(response.status, 200);
});

test('S2275: offline static asset falls back to cached asset, not stale cache when online', async () => {
  const h = makeHarness({ fetchImpl: async () => { throw new Error('offline'); } });
  h.cacheData.set(CUR, new Map([['https://example.test/app-bundle-b.min.js', new Response('cached bundle', { status: 200 })]]));
  let responsePromise;
  h.listeners.fetch({
    request: { method: 'GET', url: 'https://example.test/app-bundle-b.min.js', mode: 'no-cors', headers: { get: () => '' } },
    respondWith: p => { responsePromise = p; },
  });
  const response = await responsePromise;
  assert.equal(response.status, 200);
});
