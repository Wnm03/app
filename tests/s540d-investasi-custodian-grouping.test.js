'use strict';
// tests/s540d-investasi-custodian-grouping.test.js — Sesi S540-D (Tahap
// 4/4, DESIGN-S540-CUSTODIAN-GROUPING.md). "True grouping": instrumen
// Investasi dgn `custodianId` yang sama dikelompokkan jadi SATU
// `<details>` expandable per kustodian di render Dana Titipan
// (`DanaTitipanPortfolioPresenter._renderNow()`), SATU kustodian = SATU
// grup. Holding tanpa `custodianId` (null/undefined — termasuk SEMUA
// data lama sebelum S540-B/C) tetap FLAT di luar grup (BUKAN grup
// "Lainnya", keputusan final Design Lock).
//
// `DanaTitipanPortfolioAPI.build()` SENGAJA TIDAK disentuh sesi ini — 0
// field baru ditambahkan ke `o.holdings[]` hasil build(). Grouping baca
// `custodianId` LANGSUNG dari `Investment.getHolding()` (sumber asli) di
// layer render (`_holdingCustodianId()`), bukan dari hasil build(). Test
// #1 di bawah membuktikan build() tidak berubah bentuknya sama sekali
// (regression guard eksplisit).

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

test('1. build() TIDAK berubah bentuknya — holdings[] hasil build() tetap 0 field custodianId', () => {
  const D = baseD([
    { id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = [{ id: 'cust1', name: 'Majoris' }];
  const ctx = makeCtx(D, makeStatefulDom());
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.holdings.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(budi.holdings[0], 'custodianId'), false, 'build() tidak boleh menambahkan field custodianId ke holdings[]');
});

test('2. renderInto(): 2 holding custodianId sama -> 1 grup <details> expandable', () => {
  const D = baseD([
    { id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h2', name: 'Schroder Dana Prestasi', unit: 10, avgPrice: 5000, currentPrice: 5500, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = [{ id: 'cust1', name: 'Majoris' }];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  const groupCount = (html.match(/titipan-custodian-group/g) || []).length;
  assert.equal(groupCount, 1, 'harus cuma 1 grup kustodian utk 2 holding custodianId sama');
  assert.match(html, /Majoris \(2\)/);
  assert.match(html, /Sucorinvest MM/);
  assert.match(html, /Schroder Dana Prestasi/);
});

test('3. renderInto(): custodianId beda -> grup terpisah, masing2 (1)', () => {
  const D = baseD([
    { id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h2', name: 'BNI AM Dana Likuid', unit: 10, avgPrice: 5000, currentPrice: 5500, custodianId: 'cust2', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = [{ id: 'cust1', name: 'Majoris' }, { id: 'cust2', name: 'Bibit' }];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  const groupCount = (html.match(/titipan-custodian-group/g) || []).length;
  assert.equal(groupCount, 2);
  assert.match(html, /Majoris \(1\)/);
  assert.match(html, /Bibit \(1\)/);
});

test('4. renderInto(): custodianId null/undefined -> tetap FLAT, BUKAN grup "Lainnya"', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }, // 0 custodianId sama sekali (legacy)
    { id: 'h2', name: 'Emas', unit: 10, avgPrice: 1000000, currentPrice: 1100000, custodianId: null, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.doesNotMatch(html, /titipan-custodian-group/, '0 custodianId -> 0 grup dibentuk sama sekali');
  assert.doesNotMatch(html, /Lainnya/, 'holding tanpa custodian TIDAK boleh diberi label grup "Lainnya"');
  assert.match(html, /BBCA/);
  assert.match(html, /Emas/);
});

test('5. renderInto(): campuran flat + grup, urutan & keduanya tetap tampil', () => {
  const D = baseD([
    { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h2', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = [{ id: 'cust1', name: 'Majoris' }];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  const groupCount = (html.match(/titipan-custodian-group/g) || []).length;
  assert.equal(groupCount, 1);
  assert.match(html, /BBCA/);
  assert.match(html, /Majoris \(1\)/);
  assert.match(html, /Sucorinvest MM/);
});

test('6. renderInto(): holding Aset (linkedAssetId, 0 custodian) TIDAK PERNAH masuk grup walau owner sama dgn holding berkustodian', () => {
  const D = baseD(
    [{ id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'a1', name: 'Tanah Kavling', nilai: 50000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
  );
  D.investmentCustodians = [{ id: 'cust1', name: 'Majoris' }];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  const groupCount = (html.match(/titipan-custodian-group/g) || []).length;
  assert.equal(groupCount, 1, 'hanya holding Investasi yang masuk grup, Aset tetap flat');
  assert.match(html, /Majoris \(1\)/);
  assert.match(html, /Tanah Kavling/);
});

test('7. renderInto(): satu holding dgn custodianId TETAP jadi grup (bukan flat) walau cuma 1 instrumen', () => {
  const D = baseD([
    { id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = [{ id: 'cust1', name: 'Majoris' }];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /titipan-custodian-group/);
  assert.match(html, /Majoris \(1\)/);
});

test('8. renderInto(): custodianId ada tapi entri registry sudah hilang -> fallback label "Kustodian", 0 crash', () => {
  const D = baseD([
    { id: 'h1', name: 'Sucorinvest MM', unit: 100, avgPrice: 1000, currentPrice: 1100, custodianId: 'cust_ghost', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = []; // registry kosong, id-nya sudah tidak ada
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter.render());
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /titipan-custodian-group/);
  assert.match(html, /Kustodian \(1\)/);
});

test('9. DanaTitipanPortfolioPresenter._groupHoldingsByCustodian() — unit test langsung: grouping stabil walau tidak berurutan di array asal', () => {
  const D = baseD([
    { id: 'h1', name: 'A', unit: 1, avgPrice: 100, currentPrice: 100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h2', name: 'B', unit: 1, avgPrice: 100, currentPrice: 100, custodianId: 'cust2', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    { id: 'h3', name: 'C', unit: 1, avgPrice: 100, currentPrice: 100, custodianId: 'cust1', owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  D.investmentCustodians = [{ id: 'cust1', name: 'Majoris' }, { id: 'cust2', name: 'Bibit' }];
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  const nodes = ctx.DanaTitipanPortfolioPresenter._groupHoldingsByCustodian(budi.holdings);
  const groups = nodes.filter((n) => n.kind === 'group');
  assert.equal(groups.length, 2, 'cust1 & cust2 masing2 1 grup walau entri cust1 tidak berurutan di array asal');
  const majorisGroup = groups.find((g) => g.custodianId === 'cust1');
  assert.equal(majorisGroup.items.length, 2);
});

test('10. renderInto(): holding legacy (Investment holding TANPA field custodianId sama sekali) tetap flat, 0 error', () => {
  const D = baseD([
    { id: 'h1', name: 'Reksadana Lama', unit: 1000, avgPrice: 1000, currentPrice: 1050, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
  ]);
  delete D.investments[0].custodianId; // pastikan field-nya benar2 tidak ada (bukan null)
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter.render());
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.doesNotMatch(html, /titipan-custodian-group/);
  assert.match(html, /Reksadana Lama/);
});
