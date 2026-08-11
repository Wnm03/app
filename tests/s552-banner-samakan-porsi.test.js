'use strict';
// tests/s552-banner-samakan-porsi.test.js — Sesi 552
// (AUDIT-S540-B1B12-DOUBLECOUNT rekomendasi #2, lanjutan S551 — lihat
// RENCANA-SESI-S552-BANNER-SAMAKAN-PORSI.md): banner "✅ Samakan Porsi dari
// Aset Ini & Tautkan" di investmentOwnersModal, muncul kalau holding yang
// sedang dibuka punya "pasangan nama mirip" di Buku Aset yang belum
// tertaut (`a.investmentId` kosong — arsitektur link satu-arah dari patch
// B1-B12). Sekali tap: (1) tautkan `a.investmentId` = holding.id, (2) salin
// porsi dari Aset ke DRAFT modal ini saja (BUKAN commit langsung ke
// holding — user tetap wajib tap "✅ Simpan Porsi" existing).
//
// Target: `InvestmentUI._findLinkCandidate()` / `_renderLinkBanner()` /
// `dismissLinkBanner()` / `applySamakanPorsiFromAsset()`.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: '', textContent: '', innerHTML: '', className: '', placeholder: '',
      disabled: false, style: {},
    };
  }
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); }, _registry: registry };
}

function makeD(overrides) {
  return Object.assign({
    investments: [],
    assets: [],
    investmentTx: [],
    investmentWatchlist: [],
    debts: [],
    accounts: [],
    transactions: [],
    titipanCommitments: [],
    ownerRegistry: [],
  }, overrides || {});
}

// Mock Aset._findInvestmentMigrationCandidates() -- di app nyata ini SUDAH
// ADA dari patch B1-B12 (Sesi B4), baca D.assets/D.investments langsung.
// Di sini di-mock supaya test S552 tidak bergantung ke file aset.js
// (186KB, belum tentu tersedia identik di semua sandbox) -- fokus test ini
// murni wiring InvestmentUI-nya, bukan algoritma matching nama yang sudah
// dites terpisah di suite B1-B12.
function makeAsetMock(candidates) {
  return { _findInvestmentMigrationCandidates: () => candidates || [] };
}

function makeViewCtx(D, dom, AsetMock) {
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js', 'modules/asset/investasi-view.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      openModal: () => {}, closeModal: () => {},
      uid: () => 'gen_' + (D._n = (D._n || 0) + 1),
      save: () => { D._saved = (D._saved || 0) + 1; },
      toast: (msg) => { D._lastToast = msg; },
      fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      Aset: AsetMock,
    },
    ['Investment', 'InvestmentUI', 'MultiOwnerEngine', 'OwnerRegistry', 'DanaTitipanPortfolioAPI'],
  );
}

test('1. _findLinkCandidate(): tidak ada kandidat -> null, banner kosong', () => {
  const D = makeD({ investments: [{ id: 'h1', name: 'BBCA' }] });
  const ctx = makeViewCtx(D, makeStatefulDom(), makeAsetMock([]));
  const h = ctx.Investment.getHolding('h1');
  assert.equal(ctx.InvestmentUI._findLinkCandidate(h), null);
});

test('2. _findLinkCandidate(): ada kandidat cocok utk holding ini -> balik candidate', () => {
  const D = makeD({ investments: [{ id: 'h1', name: 'BBCA' }] });
  const candidate = { assetId: 'a1', assetName: 'Saham BBCA', holdingId: 'h1', holdingName: 'BBCA' };
  const ctx = makeViewCtx(D, makeStatefulDom(), makeAsetMock([candidate]));
  const h = ctx.Investment.getHolding('h1');
  assert.deepEqual(ctx.InvestmentUI._findLinkCandidate(h), candidate);
});

test('3. _findLinkCandidate(): kandidat utk holding LAIN -> null (tidak salah tampil)', () => {
  const D = makeD({ investments: [{ id: 'h1', name: 'BBCA' }, { id: 'h2', name: 'BBRI' }] });
  const candidate = { assetId: 'a1', assetName: 'Saham BBRI', holdingId: 'h2', holdingName: 'BBRI' };
  const ctx = makeViewCtx(D, makeStatefulDom(), makeAsetMock([candidate]));
  const h = ctx.Investment.getHolding('h1');
  assert.equal(ctx.InvestmentUI._findLinkCandidate(h), null);
});

test('4. _findLinkCandidate(): guard Aset belum dimuat -> null, tidak crash', () => {
  const D = makeD({ investments: [{ id: 'h1', name: 'BBCA' }] });
  const ctx = makeViewCtx(D, makeStatefulDom(), undefined);
  const h = ctx.Investment.getHolding('h1');
  assert.equal(ctx.InvestmentUI._findLinkCandidate(h), null);
});

test('5. openOwnersModal(): kandidat ada -> banner terisi tombol aksi dgn assetId benar', () => {
  const D = makeD({ investments: [{ id: 'h1', name: 'BBCA' }] });
  const candidate = { assetId: 'a1', assetName: 'Saham BBCA', holdingId: 'h1', holdingName: 'BBCA' };
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom, makeAsetMock([candidate]));
  ctx.InvestmentUI.openOwnersModal('h1');
  const banner = dom.getElementById('investmentOwnersLinkBanner').innerHTML;
  assert.match(banner, /Saham BBCA/);
  assert.match(banner, /applySamakanPorsiFromAsset/);
  assert.match(banner, /\["a1"\]/);
});

test('6. openOwnersModal(): tidak ada kandidat -> banner kosong', () => {
  const D = makeD({ investments: [{ id: 'h1', name: 'BBCA' }] });
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom, makeAsetMock([]));
  ctx.InvestmentUI.openOwnersModal('h1');
  assert.equal(dom.getElementById('investmentOwnersLinkBanner').innerHTML, '');
});

test('7. dismissLinkBanner(): banner hilang utk holding ini, tanpa menyentuh data', () => {
  const D = makeD({ investments: [{ id: 'h1', name: 'BBCA' }] });
  const candidate = { assetId: 'a1', assetName: 'Saham BBCA', holdingId: 'h1', holdingName: 'BBCA' };
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom, makeAsetMock([candidate]));
  ctx.InvestmentUI.openOwnersModal('h1');
  assert.match(dom.getElementById('investmentOwnersLinkBanner').innerHTML, /Saham BBCA/);
  ctx.InvestmentUI.dismissLinkBanner();
  assert.equal(dom.getElementById('investmentOwnersLinkBanner').innerHTML, '');
  assert.equal(D._saved, undefined);
});

test('8. applySamakanPorsiFromAsset(): menautkan investmentId di aset & save()', () => {
  const D = makeD({
    investments: [{ id: 'h1', name: 'BBCA' }],
    assets: [{ id: 'a1', name: 'Saham BBCA', nilai: 1000000, owners: [{ ownerId: 'SELF', ownerName: 'Aku', porsi: 60, isSelf: true }, { ownerId: 'o2', ownerName: 'Budi', porsi: 40, isSelf: false }] }],
  });
  const candidate = { assetId: 'a1', assetName: 'Saham BBCA', holdingId: 'h1', holdingName: 'BBCA' };
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom, makeAsetMock([candidate]));
  ctx.InvestmentUI.openOwnersModal('h1');
  ctx.InvestmentUI.applySamakanPorsiFromAsset('a1');
  const a = D.assets.find((x) => x.id === 'a1');
  assert.equal(a.investmentId, 'h1');
  assert.equal(D._saved, 1);
});

test('9. applySamakanPorsiFromAsset(): salin porsi ke DRAFT SAJA, TIDAK commit ke holding', () => {
  const D = makeD({
    investments: [{ id: 'h1', name: 'BBCA' }],
    assets: [{ id: 'a1', name: 'Saham BBCA', nilai: 1000000, owners: [{ ownerId: 'SELF', ownerName: 'Aku', porsi: 60, isSelf: true }, { ownerId: 'o2', ownerName: 'Budi', porsi: 40, isSelf: false }] }],
  });
  const candidate = { assetId: 'a1', assetName: 'Saham BBCA', holdingId: 'h1', holdingName: 'BBCA' };
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom, makeAsetMock([candidate]));
  ctx.InvestmentUI.openOwnersModal('h1');
  ctx.InvestmentUI.applySamakanPorsiFromAsset('a1');
  // Draft sudah berisi porsi dari aset:
  assert.equal(ctx.InvestmentUI._ownersDraft.length, 2);
  assert.equal(ctx.InvestmentUI._ownersDraft[0].porsi, 60);
  assert.equal(ctx.InvestmentUI._ownersDraft[1].porsi, 40);
  // Tapi holding.owners BELUM disentuh sama sekali (belum tap "Simpan Porsi"):
  const h = ctx.Investment.getHolding('h1');
  assert.equal(h.owners, undefined);
});

test('10. applySamakanPorsiFromAsset(): setelah link, banner hilang (kandidat tidak lagi muncul)', () => {
  const D = makeD({
    investments: [{ id: 'h1', name: 'BBCA' }],
    assets: [{ id: 'a1', name: 'Saham BBCA', nilai: 1000000, owners: [{ ownerId: 'SELF', ownerName: 'Aku', porsi: 100, isSelf: true }] }],
  });
  const candidate = { assetId: 'a1', assetName: 'Saham BBCA', holdingId: 'h1', holdingName: 'BBCA' };
  const dom = makeStatefulDom();
  // Mock realistis: setelah investmentId terisi, _findInvestmentMigrationCandidates() tidak lagi
  // mengembalikan kandidat ini (sama seperti implementasi asli B1-B12 yang filter a.investmentId).
  const AsetMock = { _findInvestmentMigrationCandidates: () => (D.assets.find((x) => x.id === 'a1').investmentId ? [] : [candidate]) };
  const ctx = makeViewCtx(D, dom, AsetMock);
  ctx.InvestmentUI.openOwnersModal('h1');
  assert.match(dom.getElementById('investmentOwnersLinkBanner').innerHTML, /Saham BBCA/);
  ctx.InvestmentUI.applySamakanPorsiFromAsset('a1');
  assert.equal(dom.getElementById('investmentOwnersLinkBanner').innerHTML, '');
});

test('11. applySamakanPorsiFromAsset(): aset tidak ditemukan -> toast peringatan, tidak crash', () => {
  const D = makeD({ investments: [{ id: 'h1', name: 'BBCA' }], assets: [] });
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom, makeAsetMock([]));
  ctx.InvestmentUI.openOwnersModal('h1');
  ctx.InvestmentUI.applySamakanPorsiFromAsset('a-ghost');
  assert.match(D._lastToast, /tidak ditemukan/);
});
