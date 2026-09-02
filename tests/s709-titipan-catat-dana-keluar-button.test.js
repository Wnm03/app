'use strict';
// tests/s709-titipan-catat-dana-keluar-button.test.js — Sesi S709
// (permintaan user, screenshot layar Dana Titipan: tombol utk catat dana
// keluar dari "Total Estimasi Belum Teralokasi", tujuan pinjaman/utang
// ATAU transaksi biasa).
//
// Target:
//   1. `DanaTitipanPortfolioPresenter._renderNow()`
//      (dana-titipan-portfolio-render.js) — tombol baru "📤 Catat Dana
//      Keluar dari Sisa Belum Teralokasi" muncul TEPAT di bawah baris
//      "Total Estimasi Belum Teralokasi" HANYA kalau
//      `totals.estimatedUnallocatedTotal > 0` (0 tombol kalau 0/negatif —
//      tidak ada apa pun buat "dikeluarkan"). data-action mengarah ke
//      `TitipanExpenseUI.open` dgn data-args berisi nominal
//      estimatedUnallocatedTotal (dibulatkan), 100% REUSE mekanisme
//      dispatcher data-action/data-args yang sudah ada (fn.apply(owner,
//      JSON.parse(args)) — features-helpers-global-security.js), 0
//      mekanisme klik baru.
//   2. `TitipanExpenseUI.open(presetAmount)` — parameter BARU opsional.
//      Kalau diisi angka > 0, field #titipanExpenseAmt langsung terisi
//      nilai itu (user tinggal cek/edit). Dipanggil TANPA argumen (semua
//      pemanggilan lama, termasuk tombol "💸 Catat Pengeluaran Dana
//      Titipan" yang sudah ada) -> field TETAP kosong seperti sebelum
//      sesi ini (0 regresi).
//
// TIDAK ada field D baru, TIDAK ada perubahan ke TitipanExpenseFlow/
// formula estimatedUnallocated — checkbox "Talangan" (jadi piutang/
// pinjaman, S521-A) di modal yang terbuka TETAP pilihan manual user;
// dana keluar ini jadi pinjaman/utang KALAU dicentang, atau transaksi
// pengeluaran biasa kalau tidak — 2 tujuan yang diminta user sama-sama
// sudah dilayani mekanisme talangan yang SUDAH ADA, 0 field/flow baru.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// ===== Bagian A: wiring markup _renderNow() =====

function baseD(overrides) {
  return Object.assign({
    investments: [], investmentTx: [], investmentWatchlist: [], debts: [],
    accounts: [], assets: [], transactions: [],
    titipanCommitments: [], titipanReturns: [],
  }, overrides || {});
}

function makeRenderCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/finance/filter-laporan.js',
      'modules/finance/dana-titipan-aggregation-api.js',
      'modules/finance/dana-titipan-commitment-return-api.js',
      'modules/shared/filter-prefs-store.js',
      'modules/finance/dana-titipan-portfolio-render.js',
    ],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      save: () => {},
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      sameId: (a, b) => String(a) === String(b),
    },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'resolveTxOwnerSplitForAccount', 'sameId'],
  );
}

function fakeEl() {
  return { innerHTML: '', querySelectorAll: () => [] };
}

test('A1. estimatedUnallocatedTotal > 0 -> tombol "Catat Dana Keluar" muncul tepat di bawah "Total Estimasi Belum Teralokasi", data-args = nominalnya', () => {
  const D = baseD({
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'Renov', principalAmount: 5000000 }],
  });
  const ctx = makeRenderCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(projection.totals.estimatedUnallocatedTotal, 5000000);

  const el = fakeEl();
  ctx.DanaTitipanPortfolioPresenter._renderNow(el);
  const html = el.innerHTML;
  assert.ok(html.includes('Total Estimasi Belum Teralokasi'));
  assert.match(html, /data-action="TitipanExpenseUI\.open" data-args='\[5000000\]'/);
  assert.ok(html.includes('📤 Catat Dana Keluar'));
  // urutan: baris "Total Estimasi Belum Teralokasi" harus muncul SEBELUM
  // tombol BARU ini (bukan tombol "💸 Catat Pengeluaran Dana Titipan" lama
  // di atas daftar owner, yang JUGA data-action="TitipanExpenseUI.open" --
  // cari kemunculan data-args yg spesifik, bukan string generiknya).
  assert.ok(html.indexOf('Total Estimasi Belum Teralokasi') < html.indexOf("data-args='[5000000]'"));
});

test('A2. estimatedUnallocatedTotal = 0 (spent == principal) -> tombol TIDAK muncul', () => {
  const D = baseD({
    titipanCommitments: [{ ownerId: 'renov', ownerName: 'Renov', principalAmount: 5000000 }],
    investments: [{
      id: 'h1', name: 'Emas', unit: 1, avgPrice: 5000000, currentPrice: 5000000,
      owners: [{ ownerId: 'renov', porsi: 100, ownerName: 'Renov', isSelf: false }],
    }],
  });
  const ctx = makeRenderCtx(D);
  const projection = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(projection.totals.estimatedUnallocatedTotal, 0);

  const el = fakeEl();
  ctx.DanaTitipanPortfolioPresenter._renderNow(el);
  assert.ok(!el.innerHTML.includes('📤 Catat Dana Keluar'));
  assert.ok(!el.innerHTML.includes('TitipanExpenseUI.open" data-args'));
});

test('A3. 0 titipanCommitments sama sekali -> kartu kosong, TIDAK error, tombol TIDAK muncul', () => {
  const D = baseD();
  const ctx = makeRenderCtx(D);
  const el = fakeEl();
  assert.doesNotThrow(() => ctx.DanaTitipanPortfolioPresenter._renderNow(el));
  assert.ok(!el.innerHTML.includes('📤 Catat Dana Keluar'));
});

// ===== Bagian B: TitipanExpenseUI.open(presetAmount) =====

function makeElement(id) {
  let _value = '';
  let _innerHTML = '';
  const el = { id, checked: false, disabled: false, style: {} };
  Object.defineProperty(el, 'value', { get() { return _value; }, set(v) { _value = v; } });
  Object.defineProperty(el, 'innerHTML', { get() { return _innerHTML; }, set(h) { _innerHTML = String(h); } });
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
  };
}

function makeUiCtx(D, dom) {
  const openModalCalls = [];
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
      'modules/finance/piutang-utang.js',
      'modules/finance/transaksi.js',
      'modules/finance/tx-list-cashflow.js',
      'modules/finance/titipan-expense-flow.js',
      'modules/finance/titipan-expense-ui.js',
    ],
    {
      D,
      document: dom,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      todayStr: () => '2026-09-02',
      save: () => {},
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp' + Math.round(n || 0),
      fmtFull: (n) => 'Rp' + Math.round(n || 0),
      sameId: (a, b) => a === b,
      askConfirm: async () => true,
      toast: () => {},
      openModal: (id) => { openModalCalls.push(id); },
      closeModal: () => {},
      updateAmtPreview: () => {},
      evalAmtExpr: () => {},
      withSaveGuardAsync: async (key, modalId, fn) => fn(),
      renderDashboard: () => {}, renderKeuangan: () => {},
      renderCnTab: () => {}, renderProductList: () => {}, renderShop: () => {},
      renderShopRecent: () => {}, renderStockList: () => {},
    },
    [
      'DanaTitipanPortfolioAPI', 'resolveTxTitipanOwner', 'applyTxTitipanLinkageOnSave',
      'maybeCreateTitipanTalanganPiutang', 'syncTitipanTalanganPiutangOnEdit',
      'removeUnpaidTitipanTalanganPiutangForTx', 'delTx', 'MultiOwnerEngine',
      'TitipanExpenseFlow', 'TitipanExpenseUI',
    ],
  );
  ctx._openModalCalls = openModalCalls;
  return ctx;
}

function baseUiD(overrides) {
  return Object.assign({
    investments: [], investmentTx: [], investmentWatchlist: [], debts: [],
    accounts: [{ id: 'acc1', name: 'Cash' }],
    titipanCommitments: [], titipanReturns: [], transactions: [], piutang: [], assets: [],
  }, overrides || {});
}

test('B1. open(377247) -> #titipanExpenseAmt langsung terisi "377247"', () => {
  const dom = makeStatefulDom();
  const ctx = makeUiCtx(baseUiD(), dom);
  ctx.TitipanExpenseUI.open(377247);
  assert.equal(dom.getElementById('titipanExpenseAmt').value, '377247');
  assert.deepEqual(ctx._openModalCalls, ['titipanExpenseModal']);
});

test('B2. open() TANPA argumen (pemanggilan lama, tombol "Catat Pengeluaran" biasa) -> field amt TETAP kosong, 0 regresi', () => {
  const dom = makeStatefulDom();
  const ctx = makeUiCtx(baseUiD(), dom);
  ctx.TitipanExpenseUI.open();
  assert.equal(dom.getElementById('titipanExpenseAmt').value, '');
});

test('B3. open(0) / open(-5000) / open(NaN) -> diperlakukan sama seperti tanpa argumen (field kosong, 0 crash)', () => {
  const dom = makeStatefulDom();
  const ctx = makeUiCtx(baseUiD(), dom);
  assert.doesNotThrow(() => ctx.TitipanExpenseUI.open(0));
  assert.equal(dom.getElementById('titipanExpenseAmt').value, '');
  assert.doesNotThrow(() => ctx.TitipanExpenseUI.open(-5000));
  assert.equal(dom.getElementById('titipanExpenseAmt').value, '');
  assert.doesNotThrow(() => ctx.TitipanExpenseUI.open(NaN));
  assert.equal(dom.getElementById('titipanExpenseAmt').value, '');
});

test('B4. open(1234567.8) -> dibulatkan ke "1234568" (input jumlah tidak menerima desimal)', () => {
  const dom = makeStatefulDom();
  const ctx = makeUiCtx(baseUiD(), dom);
  ctx.TitipanExpenseUI.open(1234567.8);
  assert.equal(dom.getElementById('titipanExpenseAmt').value, '1234568');
});
