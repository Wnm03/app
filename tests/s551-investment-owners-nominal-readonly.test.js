'use strict';
// tests/s551-investment-owners-nominal-readonly.test.js — Sesi 551
// (AUDIT-S540-B1B12-DOUBLECOUNT rekomendasi #1: field "Nominal (Rp)"
// READ-ONLY per baris pemilik di investmentOwnersModal, dihitung otomatis
// dari Investment.holdingValue(h) x porsi%, live-update saat ketik %,
// TIDAK PERNAH ditulis balik ke draft/holding -- lihat catatan "VERSI
// RINGKAS" di investasi-view.js soal kenapa field ini TIDAK dua-arah spt
// assetModal).
//
// Target: `InvestmentUI._ownerNominalText()` / `_updateOwnerNominalDisplay()`
// / wiring di `_renderOwnersList()` & `onOwnerPorsiInput()`.

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

function makeD(investments) {
  return {
    investments: investments || [],
    investmentTx: [],
    investmentWatchlist: [],
    debts: [],
    accounts: [],
    transactions: [],
    titipanCommitments: [],
    ownerRegistry: [],
  };
}

function makeViewCtx(D, dom) {
  return loadSource(
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-portfolio-presenter.js', 'modules/asset/investasi-view.js'],
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
    ['Investment', 'InvestmentUI', 'MultiOwnerEngine', 'OwnerRegistry', 'DanaTitipanPortfolioAPI'],
  );
}

test('1. _ownerNominalText(): holding tidak ada -> string kosong', () => {
  const D = makeD();
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = null;
  const html = ctx.InvestmentUI._ownerNominalText({ ownerId: 'budi', porsi: 50 });
  assert.equal(html, '');
});

test('2. _ownerNominalText(): basis holdingValue() (nilai pasar terkini, unit x currentPrice), BUKAN holdingCost()', () => {
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1500000, owners: [] }]);
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  // holdingValue = 10 * 1500000 = 15.000.000; porsi 40% -> nominal 6.000.000
  const html = ctx.InvestmentUI._ownerNominalText({ ownerId: 'budi', porsi: 40 });
  assert.match(html, /6000000/);
  // holdingCost would have given 10*1000000*0.4 = 4.000.000 -- pastikan BUKAN itu
  assert.doesNotMatch(html, /^Rp 4000000$/);
});

test('3. _ownerNominalText(): porsi 0/kosong -> nominal 0', () => {
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1500000, owners: [] }]);
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  assert.match(ctx.InvestmentUI._ownerNominalText({ ownerId: 'budi', porsi: 0 }), /0$/);
  assert.match(ctx.InvestmentUI._ownerNominalText({ ownerId: 'budi' }), /0$/);
});

test('4. _ownerNominalText(): porsi 100% -> nominal = holdingValue() penuh', () => {
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 5, avgPrice: 2000000, currentPrice: 2200000, owners: [] }]);
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  const value = ctx.Investment.holdingValue(ctx.InvestmentUI._ownersModalHolding);
  assert.equal(value, 11000000);
  assert.match(ctx.InvestmentUI._ownerNominalText({ ownerId: 'budi', porsi: 100 }), /11000000/);
});

test('5. _renderOwnersList(): container #investmentOwnersList berisi id investOwnerNominal{i} + nominal awal benar per baris', () => {
  const D = makeD([{
    id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1000000,
    owners: [{ ownerId: 'SELF', ownerName: 'Aku', porsi: 60, isSelf: true }, { ownerId: 'budi', ownerName: 'Budi', porsi: 40, isSelf: false }],
  }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  const listBox = dom.getElementById('investmentOwnersList');
  // holdingValue = 10 * 1.000.000 = 10.000.000
  assert.match(listBox.innerHTML, /investOwnerNominal0/);
  assert.match(listBox.innerHTML, /investOwnerNominal1/);
  assert.match(listBox.innerHTML, /6000000/); // 60% baris 0
  assert.match(listBox.innerHTML, /4000000/); // 40% baris 1
});

test('6. onOwnerPorsiInput(): mengetik % baru langsung meng-update #investOwnerNominal{i} (live), tanpa full re-render', () => {
  const D = makeD([{
    id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1000000,
    owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 40, isSelf: false }],
  }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  ctx.InvestmentUI.onOwnerPorsiInput(0, '70');
  assert.match(dom.getElementById('investOwnerNominal0').textContent, /7000000/);
  assert.equal(ctx.InvestmentUI._ownersDraft[0].porsi, 70);
});

test('7. _ownerNominalText(): TIDAK PERNAH menulis balik ke draft/holding (murni tampilan)', () => {
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1500000, owners: [] }]);
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  const before = JSON.stringify(ctx.InvestmentUI._ownersModalHolding);
  ctx.InvestmentUI._ownerNominalText({ ownerId: 'budi', porsi: 40 });
  const after = JSON.stringify(ctx.InvestmentUI._ownersModalHolding);
  assert.equal(before, after);
});
