'use strict';
// tests/s632-titipan-detail-grid-collapsed.test.js — Sesi 632 (lanjutan
// ringan dari audit S631 rekomendasi #2: 8-baris grid detail per-owner
// di kartu Dana Titipan terlalu panjang di layar HP -- ringkasan
// Pokok→Kini→gain SUDAH ada di <summary> kartu owner). FIX: grid detail
// dibungkus <details class="titipan-detail-toggle"> collapsed-by-
// default, pola sama <details> lain di file ini (0 CSS/JS baru, 0
// rumus/data diubah -- murni markup pembungkus).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeElement(id) {
  let _innerHTML = '';
  const el = { id, className: '', style: {}, textContent: '' };
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

test('1. grid detail (Pokok Dikomit dst) dibungkus <details class="titipan-detail-toggle">, summary "Detail lengkap"', () => {
  const D = baseD([
    { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /<details class="titipan-detail-toggle[^"]*">\s*<summary[^>]*>Detail lengkap<\/summary>/);
  assert.match(html, /Pokok Dikomit/);
  assert.match(html, /Pokok Belum Dikembalikan/);
});

test('2. ringkasan Pokok/Kini/gain di <summary> kartu owner TETAP ada di luar <details> detail (selalu kelihatan tanpa expand)', () => {
  const D = baseD([
    { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  const ownerSummaryIdx = html.indexOf('titipan-summary-sticky');
  const detailToggleIdx = html.indexOf('titipan-detail-toggle');
  assert.ok(ownerSummaryIdx > -1 && detailToggleIdx > -1);
  assert.ok(ownerSummaryIdx < detailToggleIdx, 'summary kartu owner harus di LUAR/SEBELUM <details> pembungkus grid detail');
});

test('3. 0 regresi: data grid detail (angka Pokok Dikomit/Sudah Dikembalikan/dst) tetap sama isinya, cuma dibungkus toggle', () => {
  const D = baseD([
    { id: 'h1', name: 'Majoris', unit: 100, avgPrice: 1000, currentPrice: 1100, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.titipanCommitments = [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 500000 }];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Rp 500000/);
});
