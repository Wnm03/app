'use strict';
// tests/s541-titipan-custodian-group-subtotal.test.js — Sesi S541 (item
// ringan #1 dari catatan lanjutan Design Lock S540, "Subtotal per grup").
// Header grup kustodian (`titipan-custodian-group`, S540-D) sebelumnya
// cuma nama + jumlah instrumen. Sesi ini tambah subtotal pokok teralokasi
// → nilai kini ±gain di baris summary, dijumlah dari `hh.allocatedPrincipal`/
// `hh.currentValue`/`hh.gain` yang SUDAH ada di dalam grup (hasil
// `DanaTitipanPortfolioAPI.build()`, TIDAK diubah sesi ini) — 0 rumus
// finansial baru. `_groupHoldingsByCustodian()` (S540-D) TIDAK diubah.

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

function makeCtx(D, dom) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/shared/custodian-registry.js',
      'modules/asset/investasi.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D, document: dom,
      uid: (() => { let n = 0; return () => 'u' + (n += 1); })(), save: () => {},
      escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'CustodianRegistry', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter'],
  );
}

function baseD(investments, assets) {
  return {
    investments: investments || [], investmentTx: [], investmentWatchlist: [],
    assets: assets || [], debts: [], accounts: [], transactions: [],
    titipanCommitments: [], titipanReturns: [], investmentCustodians: [],
  };
}

test('1. _groupSubtotal(): jumlah allocatedPrincipal/currentValue/gain dari items apa adanya (0 rumus baru)', () => {
  const D = baseD();
  const ctx = makeCtx(D, makeStatefulDom());
  const items = [
    { allocatedPrincipal: 100000, currentValue: 110000, gain: 10000 },
    { allocatedPrincipal: 50000, currentValue: 45000, gain: -5000 },
  ];
  const sub = ctx.DanaTitipanPortfolioPresenter._groupSubtotal(items);
  assert.equal(sub.allocatedPrincipal, 150000);
  assert.equal(sub.currentValue, 155000);
  assert.equal(sub.gain, 5000);
});

test('2. _groupSubtotal(): array kosong -> 0/0/0, 0 crash', () => {
  const D = baseD();
  const ctx = makeCtx(D, makeStatefulDom());
  const sub = ctx.DanaTitipanPortfolioPresenter._groupSubtotal([]);
  assert.equal(sub.allocatedPrincipal, 0);
  assert.equal(sub.currentValue, 0);
  assert.equal(sub.gain, 0);
});

test('3. renderInto(): summary grup kustodian tampilkan subtotal pokok->kini gabungan 2 holding', () => {
  const D = baseD([
    { id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h2', name: 'Schroder Dana Prestasi', unit: 10, avgPrice: 5000, currentPrice: 5500, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = [{ id: 'cust1', name: 'Majoris' }];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  // h1: pokok 100*1000=100000 -> kini 100*1100=110000 (gain 10000)
  // h2: pokok 10*5000=50000 -> kini 10*5500=55000 (gain 5000)
  // subtotal grup: pokok 150000 -> kini 165000 (gain 15000)
  assert.match(html, /Majoris \(2\)/);
  assert.match(html, /Rp 150000/);
  assert.match(html, /Rp 165000/);
  assert.match(html, /\+Rp 15000/);
});

test('4. renderInto(): grup 1 instrumen -> subtotal sama persis nilai instrumen itu', () => {
  const D = baseD([
    { id: 'h1', name: 'BNI AM Dana Likuid', unit: 10, avgPrice: 5000, currentPrice: 4800, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = [{ id: 'cust1', name: 'Bibit' }];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  // pokok 10*5000=50000 -> kini 10*4800=48000, gain -2000 (rugi)
  assert.match(html, /Bibit \(1\)/);
  assert.match(html, /Rp 50000/);
  assert.match(html, /Rp 48000/);
  assert.match(html, /Rp -2000/);
});

test('5. renderInto(): custodianId beda -> subtotal masing2 grup TIDAK tercampur', () => {
  const D = baseD([
    { id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h2', name: 'BNI AM Dana Likuid', unit: 10, avgPrice: 5000, currentPrice: 5500, custodianId: 'cust2', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = [{ id: 'cust1', name: 'Majoris' }, { id: 'cust2', name: 'Bibit' }];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  // cust1 (h1): pokok 100000 -> kini 110000
  // cust2 (h2): pokok 50000 -> kini 55000
  assert.match(html, /Majoris \(1\)/);
  assert.match(html, /Bibit \(1\)/);
  assert.match(html, /Rp 100000/);
  assert.match(html, /Rp 110000/);
  assert.match(html, /Rp 50000/);
  assert.match(html, /Rp 55000/);
});

test('6. renderInto(): holding tanpa custodianId (flat) TIDAK ikut disubtotal ke grup manapun', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h2', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = [{ id: 'cust1', name: 'Majoris' }];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  // grup cust1 cuma h2: pokok 100000 -> kini 110000 (BUKAN gabungan dgn BBCA punya h1)
  assert.match(html, /Majoris \(1\)/);
  assert.match(html, /Rp 100000/);
  assert.match(html, /Rp 110000/);
});

test('7. build() TIDAK berubah (regression guard, pola sama S540D test #1) — subtotal murni di layer render', () => {
  const D = baseD([
    { id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = [{ id: 'cust1', name: 'Majoris' }];
  const ctx = makeCtx(D, makeStatefulDom());
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(Object.prototype.hasOwnProperty.call(budi.holdings[0], 'custodianId'), false);
});
