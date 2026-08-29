'use strict';
// tests/inventory-transfer-s265-hardening.test.js — cakupan Sesi 265:
// Inventory Transfer Backend Hardening (modules/shop/business-flow-presenter.js).
// Melengkapi tests/inventory-transfer-s243.test.js (behavior lama TIDAK
// diubah, lihat file itu tetap 100% lulus) dengan skenario keamanan/
// integritas data: validasi stok LOKASI ASAL (bukan stok global),
// over-transfer, double-transfer, idempotency receive, qty invalid,
// produk tidak ditemukan, invariant lokasi, dan orphan transfer (produk
// dihapus saat ON_TRIP).

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
    ['modules/shop/cobek-etalase.js', 'modules/shop/trip-engine.js', 'modules/shop/business-flow-presenter-inventory.js',
      'modules/shop/business-flow-presenter.js'],
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

// --- transfer normal --------------------------------------------------

test('transfer normal — qty <= stok lokasi asal, sukses & invariant lokasi terjaga', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 10 }] });
  assert.equal(r.ok, true);
  assert.equal(r.transfer.items[0].qty, 10);
  const s = ctx.BusinessFlowPresenter.locationSummary();
  assert.equal(s.magelangQty + s.onTripQty + s.pekalonganQty, s.totalStockQty);
});

// --- over-transfer ------------------------------------------------------

test('over-transfer — qty diminta > stok lokasi asal ditolak (ok:false), 0 transfer dibuat', () => {
  const D = baseD({ products: cobekProducts() }); // p20 stock=20
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 25 }] });
  assert.equal(r.ok, false);
  assert.equal(r.overTransfer, true);
  assert.equal(D.inventoryTransfers.length, 0);
  // Stok produk tidak boleh berubah sama sekali walau ditolak.
  assert.equal(D.products.find((p) => p.id === 'p20').stock, 20);
});

test('over-transfer — divalidasi berdasarkan stok LOKASI ASAL (bukan stok global gabungan produk lain)', () => {
  const D = baseD({ products: cobekProducts() }); // p20=20, p24=15, total global=35
  const ctx = makeCtx(D);
  // p20 sendiri cuma py stok 20 — minta 21 harus ditolak walau total
  // stok global (p20+p24=35) jauh lebih besar dari 21 (bukti validasi
  // per-lokasi-per-produk, bukan dijumlah ke stok global semua produk).
  const r = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 21 }] });
  assert.equal(r.ok, false);
  assert.equal(r.overTransfer, true);
});

// --- double-transfer ------------------------------------------------------

test('double-transfer — transfer pertama habiskan stok lokasi asal, transfer kedua produk sama ditolak', () => {
  const D = baseD({ products: cobekProducts() }); // p20 stock=20
  const ctx = makeCtx(D);
  const r1 = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 20 }] });
  assert.equal(r1.ok, true);
  const r2 = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 1 }] });
  assert.equal(r2.ok, false);
  assert.equal(r2.overTransfer, true);
  assert.equal(D.inventoryTransfers.length, 1); // hanya transfer pertama yang tercatat
});

test('double-transfer — 2 rit parsial yang jumlahnya melebihi stok lokasi asal, rit ke-2 ditolak', () => {
  const D = baseD({ products: cobekProducts() }); // p20 stock=20
  const ctx = makeCtx(D);
  const r1 = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 12 }] });
  assert.equal(r1.ok, true);
  const r2 = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 9 }] }); // 12+9=21 > 20
  assert.equal(r2.ok, false);
  // Tapi rit dgn sisa yang PAS (8) harus tetap sukses (bukti bukan over-blocking).
  const r3 = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 8 }] });
  assert.equal(r3.ok, true);
  const s = ctx.BusinessFlowPresenter.locationSummary();
  assert.equal(s.onTripQty, 20);
  // p20 sudah habis (0 tersisa), tapi p24 (stock 15) belum pernah
  // ditransfer — magelangQty global mencakup p24 juga.
  assert.equal(ctx.BusinessFlowPresenter._availableAtSource('p20', 'MAGELANG_STORAGE'), 0);
  assert.equal(s.magelangQty, 15);
});

// --- receive dua kali (idempotent) --------------------------------------

test('receive dua kali — panggilan ke-2 aman, status/receivedDate tidak berubah, stok tidak dobel', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const created = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 5 }] });
  const r1 = ctx.BusinessFlowPresenter.receiveTransfer(created.transfer.id);
  const firstReceivedDate = r1.transfer.receivedDate;
  const r2 = ctx.BusinessFlowPresenter.receiveTransfer(created.transfer.id);
  assert.equal(r2.ok, true);
  assert.equal(r2.alreadyReceived, true);
  assert.equal(r2.transfer.receivedDate, firstReceivedDate); // tidak ditimpa ulang
  assert.equal(D.products.find((p) => p.id === 'p20').stock, 20); // stok produk tetap, tidak pernah disentuh
  const s = ctx.BusinessFlowPresenter.locationSummary();
  assert.equal(s.pekalonganQty, 5); // qty tidak dobel dihitung
});

// --- qty invalid ------------------------------------------------------

test('qty invalid — <=0, NaN, Infinity, null, undefined semua ditolak (skip, bukan dibuat 0/negatif)', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const invalidQtys = [0, -5, NaN, Infinity, -Infinity, null, undefined, 'abc'];
  invalidQtys.forEach((qty) => {
    const r = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty }] });
    assert.equal(r.ok, false, `qty=${qty} seharusnya ditolak`);
  });
  assert.equal(D.inventoryTransfers.length, 0);
  assert.equal(D.products.find((p) => p.id === 'p20').stock, 20);
});

test('qty invalid — 1 baris qty valid + 1 baris qty invalid: baris invalid di-skip, baris valid tetap diproses', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.createInventoryTransfer({
    items: [{ productId: 'p20', qty: 5 }, { productId: 'p24', qty: NaN }],
  });
  assert.equal(r.ok, true);
  assert.equal(r.transfer.items.length, 1);
  assert.equal(r.transfer.items[0].productId, 'p20');
});

// --- produk tidak ditemukan ---------------------------------------------

test('produk tidak ditemukan — item dgn productId asing ditolak/di-skip, tidak crash', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'ghost-product', qty: 5 }] });
  assert.equal(r.ok, false);
  assert.equal(D.inventoryTransfers.length, 0);
});

// --- invariant tetap benar -----------------------------------------------

test('invariant — total stok lokasi (Magelang+OnTrip+Pekalongan) = stok produk, tetap benar sepanjang siklus', () => {
  const D = baseD({ products: cobekProducts() }); // total stok global 35
  const ctx = makeCtx(D);
  const c1 = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 10 }] });
  let s = ctx.BusinessFlowPresenter.locationSummary();
  assert.equal(s.magelangQty + s.onTripQty + s.pekalonganQty, s.totalStockQty);

  ctx.BusinessFlowPresenter.receiveTransfer(c1.transfer.id);
  s = ctx.BusinessFlowPresenter.locationSummary();
  assert.equal(s.magelangQty + s.onTripQty + s.pekalonganQty, s.totalStockQty);

  ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p24', qty: 15 }] });
  s = ctx.BusinessFlowPresenter.locationSummary();
  assert.equal(s.magelangQty + s.onTripQty + s.pekalonganQty, s.totalStockQty);

  // Percobaan over-transfer yang GAGAL tidak boleh merusak invariant.
  ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 999 }] });
  s = ctx.BusinessFlowPresenter.locationSummary();
  assert.equal(s.magelangQty + s.onTripQty + s.pekalonganQty, s.totalStockQty);
});

// --- orphan transfer (produk dihapus saat ON_TRIP) ------------------------

test('orphan transfer — produk dihapus dari Etalase saat transfer masih ON_TRIP, receiveTransfer() tidak crash & menandai orphan', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  const created = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 5 }] });
  assert.equal(created.ok, true);

  // Simulasikan produk dihapus dari Etalase ketika transfer masih ON_TRIP.
  D.products = D.products.filter((p) => p.id !== 'p20');

  const r = ctx.BusinessFlowPresenter.receiveTransfer(created.transfer.id);
  assert.equal(r.ok, true); // tidak crash walau produk sudah tidak ada
  assert.equal(r.transfer.status, 'RECEIVED');
  assert.equal(r.hasOrphanItems, true);

  const summary = ctx.BusinessFlowPresenter.transferSummary(created.transfer.id);
  assert.equal(summary.ok, true);
  assert.equal(summary.items[0].orphan, true);
  assert.equal(summary.items[0].name, 'p20'); // fallback ke productId, tidak crash
});

test('orphan transfer — locationSummary() tidak menghitung qty produk yang sudah dihapus ke dalam onTrip/Pekalongan (invariant tetap balance utk produk yg masih ada)', () => {
  const D = baseD({ products: cobekProducts() }); // p20=20, p24=15
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 5 }] });

  D.products = D.products.filter((p) => p.id !== 'p20'); // p20 dihapus, hanya p24 tersisa (stock 15)

  const s = ctx.BusinessFlowPresenter.locationSummary();
  assert.equal(s.totalStockQty, 15); // cuma p24
  assert.equal(s.onTripQty, 0); // qty p20 (orphan) TIDAK ikut dihitung sbg onTrip
  assert.equal(s.orphanQty, 5); // dilaporkan terpisah
  assert.equal(s.magelangQty + s.onTripQty + s.pekalonganQty, s.totalStockQty); // invariant tetap balance
});

test('orphan transfer — createInventoryTransfer() produk yg sudah dihapus ditolak (tidak bisa transfer produk hantu)', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  D.products = D.products.filter((p) => p.id !== 'p20');
  const r = ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 1 }] });
  assert.equal(r.ok, false);
});

// --- helper validasi tunggal dipakai semua jalur -------------------------

test('_validateTransferRequest()/_sanitizeQty()/_availableAtSource() — helper tunggal dipakai konsisten (over-transfer & qty invalid sama2 lewat _validateTransferRequest)', () => {
  const D = baseD({ products: cobekProducts() });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter._sanitizeQty(5), 5);
  assert.equal(ctx.BusinessFlowPresenter._sanitizeQty(0), null);
  assert.equal(ctx.BusinessFlowPresenter._sanitizeQty(NaN), null);
  assert.equal(ctx.BusinessFlowPresenter._sanitizeQty(Infinity), null);
  assert.equal(ctx.BusinessFlowPresenter._sanitizeQty(null), null);
  assert.equal(ctx.BusinessFlowPresenter._sanitizeQty(undefined), null);

  assert.equal(ctx.BusinessFlowPresenter._availableAtSource('p20', 'MAGELANG_STORAGE'), 20);
  ctx.BusinessFlowPresenter.createInventoryTransfer({ items: [{ productId: 'p20', qty: 8 }] });
  assert.equal(ctx.BusinessFlowPresenter._availableAtSource('p20', 'MAGELANG_STORAGE'), 12);

  const v = ctx.BusinessFlowPresenter._validateTransferRequest([{ productId: 'p20', qty: 100 }], 'MAGELANG_STORAGE');
  assert.equal(v.ok, false);
  assert.equal(v.overTransfer, true);
});
