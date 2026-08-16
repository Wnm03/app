'use strict';
// tests/s633-titipan-linkasset-toggle-collapsed.test.js — Sesi 633
// (lanjutan ringan S631/S632): sejak S631 nama holding sudah bisa
// diklik LANGSUNG utk atur porsi aset yang SUDAH tertaut
// (openAssetPorsiDirect()). Dropdown "Pilih Aset" + tombol "⚖️ Atur
// Porsi Aset" jadi HANYA perlu utk kasus TAUTKAN ASET BARU -- sekarang
// dibungkus <details class="titipan-linkasset-toggle"> collapsed-by-
// default (pola sama S632), label "+ Tautkan Aset Baru". id
// select/onchange/data-owner-id TIDAK diubah -- test ini murni
// memastikan 0 regresi ke elemen yang sudah ada + toggle collapse-nya
// muncul benar.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeElement(id) {
  let _innerHTML = '';
  const el = { id, className: '', style: {}, textContent: '', value: '' };
  Object.defineProperty(el, 'innerHTML', {
    get() { return _innerHTML; },
    set(html) { _innerHTML = String(html); },
  });
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); } };
}

function baseD(investments, assets) {
  return {
    investments: investments || [], investmentTx: [], investmentWatchlist: [],
    assets: assets || [], debts: [], accounts: [], transactions: [],
    titipanCommitments: [], titipanReturns: [], investmentCustodians: [],
  };
}

function makeCtx(D, dom) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D, document: dom,
      uid: (() => { let n = 0; return () => 'u' + (n += 1); })(), save: () => {},
      escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

test('1. dropdown "Pilih Aset" + tombol "Atur Porsi Aset" dibungkus <details class="titipan-linkasset-toggle">, summary "+ Tautkan Aset Baru"', () => {
  const D = baseD([
    { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /<details class="titipan-linkasset-toggle[^"]*">\s*<summary[^>]*>\+ Tautkan Aset Baru<\/summary>/);
});

test('2. id "titipanAssetPick_0"/onchange/data-owner-id TETAP ada persis di dalam toggle baru -- 0 regresi ke elemen lama', () => {
  const D = baseD([
    { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /id="titipanAssetPick_0"/);
  assert.match(html, /data-owner-id="budi"/);
  assert.match(html, /onchange="DanaTitipanPortfolioPresenter\.onAssetPickChange\(this\)"/);
  assert.match(html, /data-action="DanaTitipanCommitmentUI\.openAssetPorsi"/);
});

test('3. klik nama holding (openAssetPorsiDirect, S631) TETAP jalan normal walau dropdown "Tautkan Aset Baru" sekarang dibungkus toggle terpisah', () => {
  const D = baseD([
    { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /data-action="DanaTitipanCommitmentUI\.openAssetPorsiDirect"/);
  assert.match(html, /data-args="\["h:h1"\]"/);
});
