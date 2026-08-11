'use strict';
// tests/inventory-transfer-s243.test.js — cakupan Sesi 243: Inventory
// Transfer (modules/shop/business-flow-presenter.js). IMPLEMENT ONLY —
// reuse InventoryEngine/TripEngine/BusinessFlowPresenter/PurchaseEngine/
// OwnershipEngine. TIDAK ADA engine baru, TIDAK ADA stok/qty duplikat,
// TIDAK ADA business logic baru (Total PCS/Berat/Volume 100% delegasi
// TripEngine.packing()). Trip Magelang -> Pekalongan murni memindahkan
// lokasi inventory (BUKAN penjualan) — stok produk (D.products[].stock)
// TIDAK PERNAH berubah dari fungsi manapun di file ini. Pola test sama
// persis tests/trip-management-s239.test.js / tests/receive-goods-s240.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    {
      products: [], cobekKategori: [], cobek: [], produsen: [],
      accounts: [], transactions: [], profile: {}, piutang: [],
      inventoryTransfers: [],
    },
    extra,
  );
}

function makeCtx(D) {
  return loadSource(
    ['modules/shop/cobek-etalase.js', 'modules/shop/trip-engine.js', 'modules/shop/business-flow-presenter.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['BusinessFlowPresenter', 'TripEngine'],
  );
}

function cobekProducts() {
  return [
    { id: 'p20', name: 'Cobek 20', stock: 20, beratPerUnit: 3, hargaBeli: 10000, hargaJual: 20000 },
    { id: 'p24', name: 'Cobek 24', stock: 15, beratPerUnit: 4, hargaBeli: 15000, hargaJual: 30000 },
  ];
}

// --- transferTotals() — 100% reuse TripEngine.packing() -------------------

test('transferTotals() — contoh spesifikasi: Cobek 20 (20pcs@3kg) + Cobek 24 (15pcs@4kg) = 35pcs/120kg', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const totals = ctx.BusinessFlowPresenter.transferTotals([
    { productId: 'p20', qty: 20 },
    { productId: 'p24', qty: 15 },
  ]);
  assert.equal(totals.ok, true);
  assert.equal(totals.totalPcs, 35);
  assert.equal(totals.totalBeratKg, 120);
});

test('transferTotals() — berat/nama diambil OTOMATIS dari Etalase, bukan input ulang', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const totals = ctx.BusinessFlowPresenter.transferTotals([{ productId: 'p20', qty: 5 }]);
  assert.equal(totals.items[0].name, 'Cobek 20');
  assert.equal(totals.items[0].beratPerUnit, 3);
});

test('transferTotals() — item dgn productId tak dikenal di-skip (0 crash)', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const totals = ctx.BusinessFlowPresenter.transferTotals([{ productId: 'ghost', qty: 5 }]);
  assert.equal(totals.items.length, 0);
  assert.equal(totals.totalPcs, 0);
});

// --- createInventoryTransfer() — MAGELANG_STORAGE -> ON_TRIP ---------------

test('createInventoryTransfer() — sukses, status ON_TRIP, stok produk TIDAK berubah', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.createInventoryTransfer({
    items: [{ productId: 'p20', qty: 20 }, { productId: 'p24', qty: 15 }],
  });
  assert.equal(r.ok, true);
  assert.equal(r.transfer.status, 'ON_TRIP');
  assert.equal(r.transfer.from, 'MAGELANG_STORAGE');
  assert.equal(r.transfer.to, 'PEKALONGAN_STORAGE');
  assert.equal(r.transfer.totalPcs, 35);
  assert.equal(r.transfer.totalBeratKg, 120);
  // Tidak boleh mengurangi/menambah stok total, tidak boleh jadi penjualan.
  assert.equal(D.products.find((p) => p.id === 'p20').stock, 20);
  assert.equal(D.products.find((p) => p.id === 'p24').stock, 15);
  assert.equal((D.transactions || []).length, 0);
  assert.equal((D.piutang || []).length, 0);
  assert.equal(D.inventoryTransfers.length, 1);
});

test('createInventoryTransfer() — ok:false kalau tidak ada item valid', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'ghost', qty: 5 }] });
  assert.equal(r.ok, false);
  assert.equal(D.inventoryTransfers.length, 0);
});

// --- receiveTransfer() — ON_TRIP -> PEKALONGAN_STORAGE ---------------------

test('receiveTransfer() — ubah status jadi RECEIVED, stok produk TETAP tidak berubah', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const created = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 20 }] });
  const r = ctx.BusinessFlowPresenter.receiveTransfer(created.transfer.id);
  assert.equal(r.ok, true);
  assert.equal(r.transfer.status, 'RECEIVED');
  assert.ok(r.transfer.receivedDate);
  assert.equal(D.products.find((p) => p.id === 'p20').stock, 20);
});

test('receiveTransfer() — ok:false kalau transferId tidak ditemukan', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.receiveTransfer('ghost').ok, false);
});

test('receiveTransfer() — idempotent, panggil 2x pada transfer yg sudah RECEIVED aman', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const created = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 20 }] });
  ctx.BusinessFlowPresenter.receiveTransfer(created.transfer.id);
  const r2 = ctx.BusinessFlowPresenter.receiveTransfer(created.transfer.id);
  assert.equal(r2.ok, true);
  assert.equal(r2.alreadyReceived, true);
});

// --- locationSummary() — ringkasan Dashboard 3 lokasi ----------------------

test('locationSummary() — total stok tetap balance (Magelang+OnTrip+Pekalongan = total stok)', () => {
  const D = baseD({ products: cobekProducts() }); // total stock = 35
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 20 }] });
  const s1 = ctx.BusinessFlowPresenter.locationSummary();
  assert.equal(s1.ok, true);
  assert.equal(s1.totalStockQty, 35);
  assert.equal(s1.onTripQty, 20);
  assert.equal(s1.pekalonganQty, 0);
  assert.equal(s1.magelangQty, 15);
  assert.equal(s1.magelangQty + s1.onTripQty + s1.pekalonganQty, s1.totalStockQty);

  const created2 = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p24', qty: 15 }] });
  ctx.BusinessFlowPresenter.receiveTransfer(created2.transfer.id);
  const s2 = ctx.BusinessFlowPresenter.locationSummary();
  assert.equal(s2.onTripQty, 20);
  assert.equal(s2.pekalonganQty, 15);
  assert.equal(s2.magelangQty, 0);
  assert.equal(s2.magelangQty + s2.onTripQty + s2.pekalonganQty, s2.totalStockQty);
});

test('locationSummary() — kosong kalau belum ada transfer sama sekali (semua di Magelang)', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.locationSummary();
  assert.equal(s.onTripQty, 0);
  assert.equal(s.pekalonganQty, 0);
  assert.equal(s.magelangQty, 35);
});

// --- transferStatus()/transferSummary() ------------------------------------

test('transferStatus() — label utk ON_TRIP/RECEIVED, case-insensitive, fallback apa adanya', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.transferStatus('on_trip'), 'On Trip');
  assert.equal(ctx.BusinessFlowPresenter.transferStatus('RECEIVED'), 'Diterima (Pekalongan)');
  assert.equal(ctx.BusinessFlowPresenter.transferStatus('UNKNOWN'), 'UNKNOWN');
});

test('transferSummary() — ringkasan 1 transfer, items resolve nama dari Etalase', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const created = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 20 }] });
  const s = ctx.BusinessFlowPresenter.transferSummary(created.transfer.id);
  assert.equal(s.ok, true);
  assert.equal(s.status, 'ON_TRIP');
  assert.equal(s.statusLabel, 'On Trip');
  assert.equal(s.items[0].name, 'Cobek 20');
  assert.equal(s.totalPcs, 20);
});

test('transferSummary() — ok:false kalau transferId tidak ditemukan', () => {
  const ctx = makeCtx(baseD({ products: cobekProducts() }));
  assert.equal(ctx.BusinessFlowPresenter.transferSummary('ghost').ok, false);
});
