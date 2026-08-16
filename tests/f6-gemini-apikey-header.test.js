'use strict';
// tests/f6-gemini-apikey-header.test.js — Regression test utk F6 (audit
// keamanan 2026-08): API key Gemini SEBELUMNYA dikirim lewat query string
// (?key=...) di callAIProviderRaw() (ai-chat.js) -- berisiko bocor lewat
// access log server/proxy, browser history, dan header Referer. Diverifikasi
// lewat dokumentasi resmi Google (ai.google.dev/api, ai.google.dev/api/
// generate-content) bahwa endpoint generateContent (non-streaming, persis
// yang dipakai fungsi ini) mendukung & merekomendasikan header
// `x-goog-api-key` sbg cara standar saat ini.
//
// FIX: URL fetch() Gemini TIDAK lagi menyisipkan apiKey (tidak ada lagi
// `?key=`), API key sekarang dikirim lewat header `x-goog-api-key`. Endpoint/
// model/body request tidak berubah.
//
// Test ini load fungsi ASLI callAIProviderRaw() lewat loadSource() (bukan
// re-implementasi), suntik fetch() palsu yang MEREKAM url & options yang
// diterima, lalu assert bentuknya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, fetchImpl) {
  return loadSource(
    ['ai-chat.js'],
    {
      D,
      fetch: fetchImpl,
      escapeHtml: (s) => String(s),
      save: () => {},
    },
    ['callAIProviderRaw'],
  );
}

function fakeFetchOk(record) {
  return async (url, opts) => {
    record.url = url;
    record.opts = opts;
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'halo' }] } }] }),
    };
  };
}

test('callAIProviderRaw() [gemini] — API key TIDAK ada di URL (tidak ada ?key=)', async () => {
  const D = { profile: { apiKey: 'RAHASIA123', apiProvider: 'gemini' } };
  const record = {};
  const ctx = makeCtx(D, fakeFetchOk(record));
  const r = await ctx.callAIProviderRaw('system', [{ role: 'user', content: 'hai' }]);
  assert.equal(r.ok, true);
  assert.ok(record.url.includes('generativelanguage.googleapis.com'), 'endpoint tetap sama');
  assert.ok(!record.url.includes('key='), 'URL tidak boleh lagi mengandung API key di query string');
  assert.ok(!record.url.includes('RAHASIA123'), 'API key tidak boleh muncul di URL sama sekali');
});

test('callAIProviderRaw() [gemini] — API key dikirim lewat header x-goog-api-key', async () => {
  const D = { profile: { apiKey: 'RAHASIA123', apiProvider: 'gemini' } };
  const record = {};
  const ctx = makeCtx(D, fakeFetchOk(record));
  await ctx.callAIProviderRaw('system', [{ role: 'user', content: 'hai' }]);
  assert.equal(record.opts.headers['x-goog-api-key'], 'RAHASIA123');
  assert.equal(record.opts.headers['Content-Type'], 'application/json');
});

test('callAIProviderRaw() [claude] — jalur provider lain (Claude) tidak berubah, tetap pakai header x-api-key', async () => {
  const D = { profile: { apiKey: 'RAHASIA-CLAUDE', apiProvider: 'claude' } };
  const record = {};
  const ctx = makeCtx(D, async (url, opts) => {
    record.url = url; record.opts = opts;
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'halo' }] }) };
  });
  const r = await ctx.callAIProviderRaw('system', [{ role: 'user', content: 'hai' }]);
  assert.equal(r.ok, true);
  assert.equal(record.opts.headers['x-api-key'], 'RAHASIA-CLAUDE');
  assert.ok(!record.url.includes('RAHASIA-CLAUDE'));
});
