'use strict';
// tests/s552-investment-owners-nominal-bidirectional.test.js — Sesi 552
// (permintaan user: "nominal bisa diubah dan persen menyesuaikan atau
// sebaliknya" — field "Nominal (Rp)" per baris pemilik di
// investmentOwnersModal, SEBELUMNYA read-only (S551), SEKARANG dua arah,
// mirror pola Aset.onOwnerPorsiInput()/onOwnerNominalInput() (S429/S457).
// Basis konversi tetap sama: Investment.holdingValue(h) x porsi%.
//
// Target: `InvestmentUI._ownerNominalValue()` / `_updateOwnerNominalDisplay()`
// / `onOwnerNominalInput()` / wiring di `_renderOwnersList()` &
// `onOwnerPorsiInput()`.

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
    ['modules/shared/multi-owner-engine.js', 'modules/shared/owner-registry.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js', 'modules/asset/investasi-view.js'],
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

test('1. _ownerNominalValue(): holding tidak ada -> 0', () => {
  const D = makeD();
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = null;
  assert.equal(ctx.InvestmentUI._ownerNominalValue({ ownerId: 'budi', porsi: 50 }), 0);
});

test('2. _ownerNominalValue(): basis holdingValue() (nilai pasar terkini, unit x currentPrice), BUKAN holdingCost()', () => {
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1500000, owners: [] }]);
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  // holdingValue = 10 * 1500000 = 15.000.000; porsi 40% -> nominal 6.000.000
  const val = ctx.InvestmentUI._ownerNominalValue({ ownerId: 'budi', porsi: 40 });
  assert.equal(val, 6000000);
  // holdingCost would have given 10*1000000*0.4 = 4.000.000 -- pastikan BUKAN itu
  assert.notEqual(val, 4000000);
});

test('3. _ownerNominalValue(): porsi 0/kosong -> nominal 0', () => {
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1500000, owners: [] }]);
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  assert.equal(ctx.InvestmentUI._ownerNominalValue({ ownerId: 'budi', porsi: 0 }), 0);
  assert.equal(ctx.InvestmentUI._ownerNominalValue({ ownerId: 'budi' }), 0);
});

test('4. _ownerNominalValue(): porsi 100% -> nominal = holdingValue() penuh', () => {
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 5, avgPrice: 2000000, currentPrice: 2200000, owners: [] }]);
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  const value = ctx.Investment.holdingValue(ctx.InvestmentUI._ownersModalHolding);
  assert.equal(value, 11000000);
  assert.equal(ctx.InvestmentUI._ownerNominalValue({ ownerId: 'budi', porsi: 100 }), 11000000);
});

test('5. _renderOwnersList(): container #investmentOwnersList berisi input id investOwnerNominal{i} + nominal awal benar per baris (editable, bukan div read-only)', () => {
  const D = makeD([{
    id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1000000,
    owners: [{ ownerId: 'SELF', ownerName: 'Aku', porsi: 60, isSelf: true }, { ownerId: 'budi', ownerName: 'Budi', porsi: 40, isSelf: false }],
  }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  const listBox = dom.getElementById('investmentOwnersList');
  // holdingValue = 10 * 1.000.000 = 10.000.000
  assert.match(listBox.innerHTML, /<input[^>]*id="investOwnerNominal0"/);
  assert.match(listBox.innerHTML, /<input[^>]*id="investOwnerNominal1"/);
  assert.match(listBox.innerHTML, /oninput="InvestmentUI\.onOwnerNominalInput\(0,this\.value\)"/);
  assert.match(listBox.innerHTML, /oninput="InvestmentUI\.onOwnerNominalInput\(1,this\.value\)"/);
  assert.match(listBox.innerHTML, /value="6000000"/); // 60% baris 0
  assert.match(listBox.innerHTML, /value="4000000"/); // 40% baris 1
});

test('6. onOwnerPorsiInput(): mengetik % baru langsung meng-update value #investOwnerNominal{i} (live), tanpa full re-render', () => {
  const D = makeD([{
    id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1000000,
    owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 40, isSelf: false }],
  }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  ctx.InvestmentUI.onOwnerPorsiInput(0, '70');
  assert.equal(dom.getElementById('investOwnerNominal0').value, 7000000);
  assert.equal(ctx.InvestmentUI._ownersDraft[0].porsi, 70);
});

test('7. onOwnerNominalInput(): mengetik Rp baru menghitung ulang & mensinkronkan value #investOwnerPorsi{i} + draft[i].porsi', () => {
  const D = makeD([{
    id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1000000,
    owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 40, isSelf: false }],
  }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  // holdingValue = 10.000.000; isi nominal 7.000.000 -> porsi harus jadi 70%
  ctx.InvestmentUI.onOwnerNominalInput(0, '7000000');
  assert.equal(ctx.InvestmentUI._ownersDraft[0].porsi, 70);
  assert.equal(dom.getElementById('investOwnerPorsi0').value, 70);
});

test('8. onOwnerNominalInput(): string berprefix "Rp " tetap terparse benar (strip non-digit)', () => {
  const D = makeD([{
    id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1000000,
    owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 0, isSelf: false }],
  }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  ctx.InvestmentUI.onOwnerNominalInput(0, 'Rp 5000000');
  assert.equal(ctx.InvestmentUI._ownersDraft[0].porsi, 50);
});

test('9. onOwnerNominalInput(): holding belum ada nilai pasar (holdingValue 0) -> tidak error, porsi tidak berubah', () => {
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 0, avgPrice: 0, currentPrice: 0, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 0, isSelf: false }] }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  // holding tanpa unit/harga -> Investment.getOwners() normalize 1 pemilik jadi SELF 100% & holdingValue() = 0
  const before = ctx.InvestmentUI._ownersDraft[0].porsi;
  ctx.InvestmentUI.onOwnerNominalInput(0, '5000000');
  assert.equal(ctx.InvestmentUI._ownersDraft[0].porsi, before);
});

test('10. round-trip presisi: porsi -> nominal -> porsi (4 desimal) praktis lossless utk nilai holding besar', () => {
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 1170000, avgPrice: 10, currentPrice: 10, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 0, isSelf: false }] }]);
  const dom = makeStatefulDom();
  const ctx = makeViewCtx(D, dom);
  ctx.InvestmentUI.openOwnersModal('h1');
  // holdingValue = 1.170.000 * 10 = 11.700.000
  ctx.InvestmentUI.onOwnerNominalInput(0, '1700000');
  const porsi = ctx.InvestmentUI._ownersDraft[0].porsi;
  const roundTrip = ctx.InvestmentUI._ownerNominalValue({ porsi });
  // presisi 4 desimal (S457) bukan exact-lossless utk nilai holding besar, tapi selisihnya kecil
  // (jauh di bawah resolusi yang biasa diketik user) -- toleransi longgar (<=5 rupiah).
  assert.ok(Math.abs(roundTrip - 1700000) <= 5, 'round-trip nominal harus mendekati 1.700.000 (selisih <=5 rupiah)');
});

test('11. _ownerNominalValue(): TIDAK PERNAH menulis balik ke draft/holding (murni tampilan)', () => {
  const D = makeD([{ id: 'h1', name: 'BBCA', unit: 10, avgPrice: 1000000, currentPrice: 1500000, owners: [] }]);
  const ctx = makeViewCtx(D, makeStatefulDom());
  ctx.InvestmentUI._ownersModalHolding = ctx.Investment.getHolding('h1');
  const before = JSON.stringify(ctx.InvestmentUI._ownersModalHolding);
  ctx.InvestmentUI._ownerNominalValue({ ownerId: 'budi', porsi: 40 });
  const after = JSON.stringify(ctx.InvestmentUI._ownersModalHolding);
  assert.equal(before, after);
});
