'use strict';
// tests/s661-investmentui-owner-settlement-toggle.test.js — Sesi 661
// (lanjutan fondasi S660 Investment.getOwnerSettlement()/setOwnerSettlement()/
// holdingsByOwnerSettlement()). Sesi ini WIRING UI: toggle "🔒 Dana Titipan" /
// "✅ Milik Sendiri" per baris owner non-SELF di investmentOwnersModal
// (InvestmentUI, modules/asset/investasi-view.js) — 1 file source disentuh
// sesuai aturan "1 sesi 1 file" (docs/ZIP_RULES.md § Mode PATCH ZIP).
//
// Kontrak yang diuji:
//   1. openOwnersModal() memuat draft[i].settlement dari data TERSIMPAN
//      (Investment.getOwnerSettlement()), bukan selalu 'titipan'.
//   2. _renderOwnersList() merender <select> status HANYA utk baris non-SELF.
//   3. onOwnerSettlementChange() mengubah draft murni (state, 0 tulis ke D).
//   4. saveOwners() memanggil Investment.setOwnerSettlement() per owner
//      non-SELF sesuai draft -> Buku Utang ikut disinkron (0 rumus baru,
//      reuse penuh _syncTitipanDebt() dari S660).
//   5. Guard: stub Investment TANPA setOwnerSettlement/getOwnerSettlement
//      (pola test lama S585/S607/rebalance) TIDAK boleh throw — 0 regresi.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return { id, value: '', textContent: '', innerHTML: '', className: '', placeholder: '', disabled: false, style: {}, checked: false };
  }
  return { getElementById(id) { if (!registry.has(id)) registry.set(id, makeElement(id)); return registry.get(id); }, _registry: registry };
}

function makeD(investments) {
  return { investments: investments || [], investmentTx: [], investmentWatchlist: [], debts: [], ownerRegistry: [] };
}

function makeViewCtx(D, dom) {
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js', 'modules/asset/investasi-view.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      openModal: () => {}, closeModal: () => {},
      uid: () => 'gen_' + (D._n = (D._n || 0) + 1),
      save: () => { D._saved = (D._saved || 0) + 1; },
      toast: () => {},
      fmt: (n) => 'Rp ' + Math.round(n || 0), fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['Investment', 'InvestmentUI', 'MultiOwnerEngine', 'OwnerRegistry'],
  );
}

test('openOwnersModal(): draft.settlement dimuat dari Investment.getOwnerSettlement() (kasus "milik")', () => {
  const D = makeD([{ id: 'h1', name: 'Emas Istri', unit: 10, avgPrice: 1000000, owners: [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }], ownerSettlement: { istri1: 'milik' } }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  assert.equal(ctx.InvestmentUI._ownersDraft[0].settlement, 'milik');
});

test('openOwnersModal(): draft.settlement default "titipan" kalau belum pernah diset (0 regresi)', () => {
  const D = makeD([{ id: 'h1', name: 'RD Ayah', unit: 10, avgPrice: 1000000, owners: [{ ownerId: 'ayah1', porsi: 100, ownerName: 'Ayah', isSelf: false }] }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  assert.equal(ctx.InvestmentUI._ownersDraft[0].settlement, 'titipan');
});

test('_renderOwnersList(): select status dirender utk baris non-SELF, TIDAK dirender utk baris isSelf', () => {
  const D = makeD([{ id: 'h1', name: 'Campuran', unit: 10, avgPrice: 1000000, owners: [{ ownerId: 'SELF', porsi: 50, ownerName: 'Milik Sendiri', isSelf: true }, { ownerId: 'istri1', porsi: 50, ownerName: 'Istri', isSelf: false }] }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  const html = dom.getElementById('investmentOwnersList').innerHTML;
  assert.match(html, /investOwnerSettlement1/); // baris ke-2 (index 1, non-SELF)
  assert.doesNotMatch(html, /investOwnerSettlement0/); // baris ke-1 (index 0, SELF) tidak punya select ini
});

test('onOwnerSettlementChange(): mengubah draft[i].settlement, 0 tulis ke D', () => {
  const D = makeD([{ id: 'h1', name: 'Emas Istri', unit: 10, avgPrice: 1000000, owners: [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }] }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  ctx.InvestmentUI.onOwnerSettlementChange(0, 'milik');
  assert.equal(ctx.InvestmentUI._ownersDraft[0].settlement, 'milik');
  assert.equal(D.investments[0].ownerSettlement, undefined); // belum saveOwners()
});

test('saveOwners(): settlement "milik" di draft -> 0 entry Buku Utang tersimpan utk owner itu', () => {
  const D = makeD([{ id: 'h1', name: 'Emas Istri', unit: 10, avgPrice: 1000000, owners: [{ ownerId: 'istri1', porsi: 100, ownerName: 'Istri', isSelf: false }] }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  ctx.InvestmentUI.onOwnerSettlementChange(0, 'milik');
  ctx.InvestmentUI.saveOwners();
  assert.equal(D.debts.filter((d) => d.linkedInvestmentId === 'h1').length, 0);
  assert.equal(ctx.Investment.getOwnerSettlement(D.investments[0], 'istri1'), 'milik');
});

test('saveOwners(): settlement default "titipan" -> perilaku SAMA seperti sebelum S660/S661 (1 entry Buku Utang)', () => {
  const D = makeD([{ id: 'h1', name: 'RD Ayah', unit: 10, avgPrice: 1000000, owners: [{ ownerId: 'ayah1', porsi: 100, ownerName: 'Ayah', isSelf: false }] }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  ctx.InvestmentUI.saveOwners();
  assert.equal(D.debts.filter((d) => d.linkedInvestmentId === 'h1').length, 1);
});

test('Guard: stub Investment TANPA setOwnerSettlement/getOwnerSettlement -> saveOwners() TIDAK throw (0 regresi test lama)', () => {
  let saved = 0;
  const D = { investments: [{ id: 'h1', name: 'X', owners: [] }] };
  const dom = makeStatefulDom();
  const stubInvestment = {
    getHolding: (id) => D.investments.find((h) => h.id === id),
    getOwners: () => [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false }],
    setOwners: (id, owners) => { saved++; return D.investments.find((h) => h.id === id); },
    // SENGAJA TIDAK ada getOwnerSettlement/setOwnerSettlement -- mensimulasikan
    // stub minimal seperti dipakai tests/s585-.../s607-.../rebalance-porsi-pemilik.test.js.
  };
  const ctx = loadSource(
    ['modules/asset/investasi-view.js'],
    { D, document: dom, Investment: stubInvestment, openModal: () => {}, closeModal: () => {}, uid: () => 'u1', save: () => {}, toast: () => {}, escapeHtml: (s) => String(s) },
    ['InvestmentUI'],
  );
  ctx.InvestmentUI._ownersModalHolding = D.investments[0];
  ctx.InvestmentUI._ownersDraft = [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false, settlement: 'titipan' }];
  assert.doesNotThrow(() => ctx.InvestmentUI.saveOwners());
  assert.equal(saved, 1);
});
