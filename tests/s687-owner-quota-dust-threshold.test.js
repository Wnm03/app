'use strict';
// tests/s687-owner-quota-dust-threshold.test.js — Sesi S687 (saran audit UI dari
// screenshot user, poin 1 "dust vs signifikan": sisa Rp3 di "mas sihab" tampil
// sama besar visualnya dgn sisa Rp377rb di "renov").
//
// Kontrak yang diuji:
//   1. Aset._ownerQuotaText(): |sisa|<Rp100 -> tampil pudar, TANPA tombol
//      "Isi dari kuota sisa", TANPA styling warning merah -- berlaku simetris
//      utk sisa positif kecil (mis. 3) MAUPUN negatif kecil (mis. -3).
//   2. Aset._ownerQuotaText(): sisa>=Rp100 (positif) tetap tampil tombol,
//      sisa<=-Rp100 (negatif) tetap tampil warning merah + tombol -- PERILAKU
//      LAMA 0 berubah di luar pita dust.
//   3. InvestmentUI._ownerQuotaText(): mirror PERSIS poin 1 & 2 di atas.
//   4. Aset._ownerHasUnallocatedElsewhere(): badge "cek holding lain" TIDAK
//      muncul kalau estimatedUnallocated global < Rp100 (dust), MASIH muncul
//      kalau >= Rp100 -- 0 perubahan ke rumus estimatedUnallocated itu sendiri.
//   5. DUST_THRESHOLD_RP terekspos & bernilai sama (100) di kedua modul.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: '', textContent: '', innerHTML: '', className: '',
      placeholder: '', disabled: false, style: {},
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
        add(cls) { this._set.add(cls); },
        remove(cls) { this._set.delete(cls); },
      },
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeCtx(D, dom) {
  const ctx = loadSource(
    ['modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/asset/investasi-view.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      openModal: () => {},
      closeModal: () => {},
      uid: () => 'owner_x',
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: () => {},
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-31',
    },
    ['Aset', 'InvestmentUI', 'MultiOwnerEngine', 'Investment', 'DanaTitipanPortfolioAPI'],
  );
  ctx.Aset.renderList = () => {};
  return ctx;
}

function baseD({ assets, investments, titipanCommitments }) {
  return {
    assets: assets || [], investments: investments || [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: titipanCommitments || [], titipanReturns: [],
  };
}

// ---- Test 1: dust positif kecil (mirror screenshot "mas sihab" sisa Rp3) ----
test('S687-1: Aset._ownerQuotaText() -- sisa positif dust (Rp3) tampil pudar, TANPA tombol', () => {
  const D = baseD({
    assets: [{ id: 'aX', name: 'Aset X', nilai: 1699997, owners: [{ ownerId: 'sihab', ownerName: 'Mas Sihab', porsi: 100, isSelf: false }] }],
    titipanCommitments: [{ ownerId: 'sihab', ownerName: 'Mas Sihab', principalAmount: 1700000 }],
  });
  const dom = makeStatefulDom();
  const { Aset } = makeCtx(D, dom);
  Aset._ownersModalAsset = D.assets[0];
  const o = { ownerId: 'sihab', ownerName: 'Mas Sihab', porsi: 100, isSelf: false };
  const html = Aset._ownerQuotaText(o, 0);
  // sisa = 1700000 - 0 - 0 - 0 - 0 - 1699997 = 3
  assert.match(html, /Kuota sisa/);
  assert.match(html, /Rp 3/);
  assert.doesNotMatch(html, /Isi dari kuota sisa/);
  assert.doesNotMatch(html, /melebihi/);
  assert.match(html, /opacity:\.55/);
});

// ---- Test 2: dust negatif kecil (mis. -3, noise pembulatan) ----
test('S687-2: Aset._ownerQuotaText() -- sisa negatif dust (-Rp3) tampil pudar, TANPA warning merah/tombol', () => {
  const D = baseD({
    assets: [{ id: 'aX', name: 'Aset X', nilai: 1700003, owners: [{ ownerId: 'sihab', ownerName: 'Mas Sihab', porsi: 100, isSelf: false }] }],
    titipanCommitments: [{ ownerId: 'sihab', ownerName: 'Mas Sihab', principalAmount: 1700000 }],
  });
  const dom = makeStatefulDom();
  const { Aset } = makeCtx(D, dom);
  Aset._ownersModalAsset = D.assets[0];
  const o = { ownerId: 'sihab', ownerName: 'Mas Sihab', porsi: 100, isSelf: false };
  const html = Aset._ownerQuotaText(o, 0);
  // sisa = 1700000 - 1700003 = -3
  assert.doesNotMatch(html, /melebihi/);
  assert.doesNotMatch(html, /Isi dari kuota sisa/);
  assert.doesNotMatch(html, /red/);
});

// ---- Test 3: sisa signifikan (renov, Rp377rb) tetap tampil tombol seperti semula ----
test('S687-3: Aset._ownerQuotaText() -- sisa signifikan (Rp377.244) TETAP tampil tombol, 0 perubahan', () => {
  const D = baseD({
    assets: [{ id: 'aX', name: 'Aset X', nilai: 9145761, owners: [{ ownerId: 'ren', ownerName: 'renov', porsi: 100, isSelf: false }] }],
    titipanCommitments: [{ ownerId: 'ren', ownerName: 'renov', principalAmount: 9523005 }],
  });
  const dom = makeStatefulDom();
  const { Aset } = makeCtx(D, dom);
  Aset._ownersModalAsset = D.assets[0];
  const o = { ownerId: 'ren', ownerName: 'renov', porsi: 100, isSelf: false };
  const html = Aset._ownerQuotaText(o, 0);
  // sisa = 9523005 - 9145761 = 377244
  assert.match(html, /Isi dari kuota sisa/);
  assert.doesNotMatch(html, /opacity:\.55/);
});

// ---- Test 4: overallocation sungguhan (jauh dari 0) tetap warning merah + tombol ----
test('S687-4: Aset._ownerQuotaText() -- sisa negatif signifikan (-Rp3jt) TETAP warning merah + tombol', () => {
  const D = baseD({
    assets: [{ id: 'aX', name: 'Aset X', nilai: 5000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false }] }],
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 2000000 }],
  });
  const dom = makeStatefulDom();
  const { Aset } = makeCtx(D, dom);
  Aset._ownersModalAsset = D.assets[0];
  const o = { ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false };
  const html = Aset._ownerQuotaText(o, 0);
  // sisa = 2000000 - 5000000 = -3000000
  assert.match(html, /melebihi pokok dikomit/);
  assert.match(html, /Isi dari kuota sisa/);
});

// ---- Test 5: InvestmentUI mirror -- dust positif kecil ----
test('S687-5: InvestmentUI._ownerQuotaText() -- sisa positif dust (Rp3) tampil pudar, TANPA tombol (mirror Aset)', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1699997, currentPrice: 1699997, owners: [] }],
    titipanCommitments: [{ id: 'c1', ownerId: 'sihab', ownerName: 'Mas Sihab', principalAmount: 1700000 }],
  });
  const dom = makeStatefulDom();
  const { InvestmentUI, Investment } = makeCtx(D, dom);
  InvestmentUI._ownersModalHolding = Investment.getHolding('h1');
  const o = { ownerId: 'sihab', ownerName: 'Mas Sihab', porsi: 100, isSelf: false };
  const html = InvestmentUI._ownerQuotaText(o, 0);
  assert.match(html, /Rp 3/);
  assert.doesNotMatch(html, /Isi dari kuota sisa/);
  assert.match(html, /opacity:\.55/);
});

// ---- Test 6: InvestmentUI mirror -- sisa signifikan tetap tombol ----
test('S687-6: InvestmentUI._ownerQuotaText() -- sisa signifikan TETAP tampil tombol, 0 perubahan', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 8000000, currentPrice: 8000000, owners: [] }],
    titipanCommitments: [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 8500000 }],
  });
  const dom = makeStatefulDom();
  const { InvestmentUI, Investment } = makeCtx(D, dom);
  InvestmentUI._ownersModalHolding = Investment.getHolding('h1');
  const o = { ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false };
  const html = InvestmentUI._ownerQuotaText(o, 0);
  // sisa = 8500000 - 8000000 = 500000
  assert.match(html, /Isi dari kuota sisa/);
  assert.doesNotMatch(html, /opacity:\.55/);
});

// ---- Test 7: badge "cek holding lain" -- TIDAK muncul kalau estimatedUnallocated dust ----
test('S687-7: Aset._ownerHasUnallocatedElsewhere() -- false kalau estimatedUnallocated dust (Rp3, < Rp100)', () => {
  const dom = makeStatefulDom();
  const D = baseD({});
  const { Aset } = makeCtx(D, dom);
  assert.equal(Aset._ownerHasUnallocatedElsewhere('ow1', { owners: [{ ownerId: 'ow1', estimatedUnallocated: 3 }] }), false);
  assert.equal(Aset._ownerHasUnallocatedElsewhere('ow1', { owners: [{ ownerId: 'ow1', estimatedUnallocated: 99 }] }), false);
});

// ---- Test 8: badge -- MASIH muncul kalau estimatedUnallocated >= Rp100 (0 regresi) ----
test('S687-8: Aset._ownerHasUnallocatedElsewhere() -- true kalau estimatedUnallocated >= Rp100 (0 regresi dari S-A)', () => {
  const dom = makeStatefulDom();
  const D = baseD({});
  const { Aset } = makeCtx(D, dom);
  assert.equal(Aset._ownerHasUnallocatedElsewhere('ow1', { owners: [{ ownerId: 'ow1', estimatedUnallocated: 100 }] }), true);
  assert.equal(Aset._ownerHasUnallocatedElsewhere('ow1', { owners: [{ ownerId: 'ow1', estimatedUnallocated: 500000 }] }), true);
});

// ---- Test 9: DUST_THRESHOLD_RP terekspos & sama nilainya di kedua modul ----
test('S687-9: DUST_THRESHOLD_RP terekspos di Aset & InvestmentUI, nilainya sama (100)', () => {
  const dom = makeStatefulDom();
  const D = baseD({});
  const { Aset, InvestmentUI } = makeCtx(D, dom);
  assert.equal(Aset.DUST_THRESHOLD_RP, 100);
  assert.equal(InvestmentUI.DUST_THRESHOLD_RP, 100);
});
