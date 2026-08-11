'use strict';
// tests/receive-goods-s240.test.js — cakupan Sesi 240: Receive Goods
// (modules/shop/business-flow-presenter.js). WIRE ONLY — stok TETAP
// ditambah lewat receiveGoods() yang SUDAH ADA (S207-208, 0 rumus stok
// baru/duplikat). receiveItem()/receiveAll()/receiveSummary() cuma
// menambah pelacakan progres per-item Trip (items[].receivedQty) &
// menurunkan status {NOT_RECEIVED,PARTIALLY_RECEIVED,FULLY_RECEIVED}
// murni dari qty vs receivedQty. Pola test sama persis
// tests/trip-management-s239.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    {
      products: [], cobekKategori: [], cobek: [], produsen: [],
      accounts: [], transactions: [], profile: {}, piutang: [],
    },
    extra,
  );
}

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/shop/cobek-order.js',
      'modules/shop/purchase-engine.js',
      'modules/shop/inventory-engine.js',
      'modules/shop/profit-engine.js',
      'modules/shop/shop-business-engine-presenter.js',
      'modules/shop/trip-presenter.js',
      'modules/shop/business-flow-presenter.js',
    ],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    },
    ['BusinessFlowPresenter', 'OwnershipEngine'],
  );
}

function makeTripD() {
  return baseD({
    products: [
      { id: 'p1', stock: 0 },
      { id: 'p2', stock: 3 },
    ],
    cobek: [{
      id: 100,
      items: [
        { productId: 'p1', name: 'Produk 1', qty: 5 },
        { productId: 'p2', name: 'Produk 2', qty: 2 },
      ],
    }],
  });
}

// --- receiveItem() ----------------------------------------------------

test('receiveItem() — ok:false kalau Trip (cobekId) tidak ditemukan', () => {
  const ctx = makeCtx(makeTripD());
  assert.equal(ctx.BusinessFlowPresenter.receiveItem(999, 'p1', 1).ok, false);
});

test('receiveItem() — ok:false kalau item/productId tidak ada di Trip', () => {
  const ctx = makeCtx(makeTripD());
  assert.equal(ctx.BusinessFlowPresenter.receiveItem(100, 'tidak-ada', 1).ok, false);
});

test('receiveItem() — terima sebagian (partial) -> stok nambah PERSIS qty diterima, status PARTIALLY_RECEIVED', () => {
  const D = makeTripD();
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.receiveItem(100, 'p1', 2);
  assert.equal(r.ok, true);
  assert.equal(r.qtyReceived, 2);
  assert.equal(r.receivedQty, 2);
  assert.equal(r.itemQty, 5);
  assert.equal(r.status, 'PARTIALLY_RECEIVED');
  assert.equal(D.products.find((p) => p.id === 'p1').stock, 2);
  assert.equal(D.cobek[0].items[0].receivedQty, 2);
  assert.ok(D.cobek[0].receiveDate);
});

test('receiveItem() — dipanggil lagi (bertahap) -> stok TERUS bertambah dari sisa, bukan dobel dari awal', () => {
  const D = makeTripD();
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.receiveItem(100, 'p1', 2);
  const r2 = ctx.BusinessFlowPresenter.receiveItem(100, 'p1', 3);
  assert.equal(r2.qtyReceived, 3);
  assert.equal(r2.receivedQty, 5);
  assert.equal(r2.status, 'PARTIALLY_RECEIVED'); // p2 belum diterima sama sekali
  assert.equal(D.products.find((p) => p.id === 'p1').stock, 5);
});

test('receiveItem() — qty diminta > sisa -> di-clamp ke sisa, tidak overreceive/overstock', () => {
  const D = makeTripD();
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.receiveItem(100, 'p1', 999);
  assert.equal(r.qtyReceived, 5);
  assert.equal(r.receivedQty, 5);
  assert.equal(D.products.find((p) => p.id === 'p1').stock, 5);
  // panggil lagi setelah full -> qtyReceived 0, stok tidak nambah lagi
  const r2 = ctx.BusinessFlowPresenter.receiveItem(100, 'p1', 10);
  assert.equal(r2.qtyReceived, 0);
  assert.equal(D.products.find((p) => p.id === 'p1').stock, 5);
});

test('receiveItem() — semua item Trip diterima penuh -> status FULLY_RECEIVED', () => {
  const D = makeTripD();
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.receiveItem(100, 'p1', 5);
  const r = ctx.BusinessFlowPresenter.receiveItem(100, 'p2', 2);
  assert.equal(r.status, 'FULLY_RECEIVED');
});

// --- receiveAll() -------------------------------------------------------

test('receiveAll() — ok:false kalau Trip tidak ditemukan', () => {
  const ctx = makeCtx(makeTripD());
  assert.equal(ctx.BusinessFlowPresenter.receiveAll(999).ok, false);
});

test('receiveAll() — terima SEMUA sisa qty semua item sekaligus -> FULLY_RECEIVED, stok semua item nambah PERSIS qty dibawa', () => {
  const D = makeTripD();
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.receiveAll(100);
  assert.equal(r.ok, true);
  assert.equal(r.status, 'FULLY_RECEIVED');
  assert.equal(r.items.length, 2);
  assert.equal(D.products.find((p) => p.id === 'p1').stock, 5);
  assert.equal(D.products.find((p) => p.id === 'p2').stock, 3 + 2);
});

test('receiveAll() — dipanggil setelah sebagian diterima -> cuma nambah SISA, bukan dobel', () => {
  const D = makeTripD();
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.receiveItem(100, 'p1', 2);
  ctx.BusinessFlowPresenter.receiveAll(100);
  assert.equal(D.products.find((p) => p.id === 'p1').stock, 5);
  assert.equal(D.cobek[0].items[0].receivedQty, 5);
});

// --- receiveSummary() ----------------------------------------------------

test('receiveSummary() — ok:false kalau Trip tidak ditemukan', () => {
  const ctx = makeCtx(makeTripD());
  assert.equal(ctx.BusinessFlowPresenter.receiveSummary(999).ok, false);
});

test('receiveSummary() — status NOT_RECEIVED & receiveDate null sebelum ada penerimaan', () => {
  const ctx = makeCtx(makeTripD());
  const s = ctx.BusinessFlowPresenter.receiveSummary(100);
  assert.equal(s.ok, true);
  assert.equal(s.status, 'NOT_RECEIVED');
  assert.equal(s.receiveDate, null);
  assert.deepEqual(s.items.map((i) => [i.productId, i.qty, i.receivedQty]), [['p1', 5, 0], ['p2', 2, 0]]);
});

test('receiveSummary() — refleksikan qty/receivedQty/status/receiveDate terkini setelah receiveItem()', () => {
  const D = makeTripD();
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.receiveItem(100, 'p1', 2);
  const s = ctx.BusinessFlowPresenter.receiveSummary(100);
  assert.equal(s.status, 'PARTIALLY_RECEIVED');
  assert.ok(s.receiveDate);
  const p1 = s.items.find((i) => i.productId === 'p1');
  assert.equal(p1.receivedQty, 2);
});

test('receiveSummary() — status FULLY_RECEIVED setelah receiveAll()', () => {
  const D = makeTripD();
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.receiveAll(100);
  assert.equal(ctx.BusinessFlowPresenter.receiveSummary(100).status, 'FULLY_RECEIVED');
});
