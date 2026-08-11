'use strict';
// tests/inventory-movement-s238.test.js — cakupan Sesi 238: Inventory
// Movement (modules/shop/business-flow-presenter.js). WIRE ONLY — 100%
// reuse BusinessFlowPresenter.lifecycleStatus() (S237) + field
// D.cobek[].items[].productId / D.products[].stock yang SUDAH ADA. TIDAK
// ADA field D baru, TIDAK ADA stok baru, TIDAK ADA engine baru —
// movementLabel()/nextLocation() murni navigasi array statis
// INVENTORY_MOVEMENT_LOCATIONS, currentLocation() murni lookup lifecycle
// yang sudah ada. Pola test sama persis tests/business-lifecycle-s237.test.js.

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

function makeCtx(D, document) {
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
      document,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    },
    ['BusinessFlowPresenter', 'OwnershipEngine'],
  );
}

// --- movementLabel()/nextLocation() — navigasi array murni ---------------

test('movementLabel() — balikin label utk semua 7 lokasi, case-insensitive', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.movementLabel('SUPPLIER'), 'Supplier');
  assert.equal(ctx.BusinessFlowPresenter.movementLabel('magelang_storage'), 'Magelang Storage');
  assert.equal(ctx.BusinessFlowPresenter.movementLabel('On_Motor'), 'On Motor');
  assert.equal(ctx.BusinessFlowPresenter.movementLabel('PEKALONGAN_STORAGE'), 'Pekalongan Storage');
  assert.equal(ctx.BusinessFlowPresenter.movementLabel('PACKING'), 'Packing');
  assert.equal(ctx.BusinessFlowPresenter.movementLabel('SHIPPED'), 'Shipped');
  assert.equal(ctx.BusinessFlowPresenter.movementLabel('CUSTOMER'), 'Customer');
});

test('movementLabel() — fallback balikin apa adanya kalau lokasi tidak dikenali', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.movementLabel('UNKNOWN_XYZ'), 'UNKNOWN_XYZ');
});

test('nextLocation() — urut sesuai spesifikasi SUPPLIER->...->CUSTOMER, null di ujung', () => {
  const ctx = makeCtx(baseD());
  const order = ['SUPPLIER', 'MAGELANG_STORAGE', 'ON_MOTOR', 'PEKALONGAN_STORAGE', 'PACKING', 'SHIPPED', 'CUSTOMER'];
  for (let i = 0; i < order.length - 1; i++) {
    assert.equal(ctx.BusinessFlowPresenter.nextLocation(order[i]), order[i + 1]);
  }
  assert.equal(ctx.BusinessFlowPresenter.nextLocation('CUSTOMER'), null);
  assert.equal(ctx.BusinessFlowPresenter.nextLocation('TIDAK_ADA'), null);
});

// --- currentLocation(productId) — reuse lifecycleStatus() / stock --------

test('currentLocation() — ok:false kalau produk tidak ditemukan', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('tidak-ada').ok, false);
});

test('currentLocation() — fallback SUPPLIER kalau belum pernah ada order & stok 0', () => {
  const D = baseD({ products: [{ id: 'p1', stock: 0 }] });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.currentLocation('p1');
  assert.equal(s.ok, true);
  assert.equal(s.location, 'SUPPLIER');
  assert.equal(s.orderId, null);
});

test('currentLocation() — fallback PEKALONGAN_STORAGE kalau belum pernah ada order tapi stok > 0', () => {
  const D = baseD({ products: [{ id: 'p2', stock: 5 }] });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.currentLocation('p2');
  assert.equal(s.location, 'PEKALONGAN_STORAGE');
});

test('currentLocation() — ON_MOTOR kalau order terkait belum delivered (IN_TRANSIT)', () => {
  const D = baseD({
    products: [{ id: 'p3', stock: 2 }],
    cobek: [{ id: 1, delivered: false, items: [{ productId: 'p3', qty: 2 }] }],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.currentLocation('p3');
  assert.equal(s.location, 'ON_MOTOR');
  assert.equal(s.orderId, 1);
});

test('currentLocation() — PACKING kalau order delivered tapi belum lunas (SOLD)', () => {
  const D = baseD({
    products: [{ id: 'p4', stock: 0 }],
    cobek: [{ id: 2, delivered: true, piutangLinkId: 'pi1', items: [{ productId: 'p4', qty: 1 }] }],
    piutang: [{ id: 'pi1', lunas: false }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('p4').location, 'PACKING');
});

test('currentLocation() — CUSTOMER kalau order delivered & lunas (COMPLETED)', () => {
  const D = baseD({
    products: [{ id: 'p5', stock: 0 }],
    cobek: [{ id: 3, delivered: true, items: [{ productId: 'p5', qty: 1 }] }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('p5').location, 'CUSTOMER');
});

test('currentLocation() — pakai order TERBARU (id terbesar) kalau produk ada di beberapa order', () => {
  const D = baseD({
    products: [{ id: 'p6', stock: 0 }],
    cobek: [
      { id: 10, delivered: true, items: [{ productId: 'p6', qty: 1 }] }, // COMPLETED (order lama)
      { id: 20, delivered: false, items: [{ productId: 'p6', qty: 1 }] }, // IN_TRANSIT (order terbaru)
    ],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.currentLocation('p6');
  assert.equal(s.location, 'ON_MOTOR');
  assert.equal(s.orderId, 20);
});

// --- currentLocation() x D.inventoryTransfers (Sesi 377, fix sinkronisasi) -

test('currentLocation() — ON_MOTOR kalau ada Inventory Transfer aktif (ON_TRIP), menang di atas fallback stok', () => {
  const D = baseD({
    products: [{ id: 'p7', stock: 0 }], // fallback tanpa fix ini akan balikin SUPPLIER
    inventoryTransfers: [
      { id: 't1', status: 'ON_TRIP', items: [{ productId: 'p7', qty: 10 }], createdDate: '2026-08-01T00:00:00.000Z' },
    ],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.currentLocation('p7');
  assert.equal(s.ok, true);
  assert.equal(s.location, 'ON_MOTOR');
  assert.equal(s.transferId, 't1');
});

test('currentLocation() — ON_MOTOR (transfer aktif) menang di atas lifecycle order juga', () => {
  const D = baseD({
    products: [{ id: 'p8', stock: 0 }],
    cobek: [{ id: 5, delivered: true, items: [{ productId: 'p8', qty: 1 }] }], // COMPLETED kalau transfer diabaikan
    inventoryTransfers: [
      { id: 't2', status: 'ON_TRIP', items: [{ productId: 'p8', qty: 3 }], createdDate: '2026-08-01T00:00:00.000Z' },
    ],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('p8').location, 'ON_MOTOR');
});

test('currentLocation() — transfer RECEIVED tidak dianggap aktif, balik ke derivasi biasa', () => {
  const D = baseD({
    products: [{ id: 'p9', stock: 5 }],
    inventoryTransfers: [
      { id: 't3', status: 'RECEIVED', items: [{ productId: 'p9', qty: 5 }], createdDate: '2026-08-01T00:00:00.000Z', receivedDate: '2026-08-02T00:00:00.000Z' },
    ],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('p9').location, 'PEKALONGAN_STORAGE');
});

test('currentLocation() — pakai transfer ON_TRIP TERBARU (createdDate terbesar) kalau ada beberapa', () => {
  const D = baseD({
    products: [{ id: 'p10', stock: 0 }],
    inventoryTransfers: [
      { id: 't-old', status: 'ON_TRIP', items: [{ productId: 'p10', qty: 1 }], createdDate: '2026-07-01T00:00:00.000Z' },
      { id: 't-new', status: 'ON_TRIP', items: [{ productId: 'p10', qty: 1 }], createdDate: '2026-08-01T00:00:00.000Z' },
    ],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('p10').transferId, 't-new');
});

test('currentLocation() — Manual Override (S376) tetap menang di atas transfer aktif (S377)', () => {
  const D = baseD({
    products: [{ id: 'p11', stock: 0 }],
    inventoryTransfers: [
      { id: 't4', status: 'ON_TRIP', items: [{ productId: 'p11', qty: 1 }], createdDate: '2026-08-01T00:00:00.000Z' },
    ],
    productMovementOverride: { p11: { location: 'CUSTOMER', ts: 1 } },
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.currentLocation('p11');
  assert.equal(s.location, 'CUSTOMER');
  assert.equal(s.manual, true);
});

// --- renderMovement(productId) — guard DOM, tidak throw -------------------

function makeEl() { return { innerHTML: '' }; }

test('renderMovement() — tidak throw kalau container tidak ada', () => {
  const ctx = makeCtx(baseD(), { getElementById: () => null });
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.renderMovement('x'));
});

test('renderMovement() — render semua 7 lokasi & highlight posisi aktif (CUSTOMER)', () => {
  const listEl = makeEl();
  const D = baseD({
    products: [{ id: 'p7', stock: 0 }],
    cobek: [{ id: 5, delivered: true, items: [{ productId: 'p7', qty: 1 }] }],
  });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'productMovementList' ? listEl : null) });
  ctx.BusinessFlowPresenter.renderMovement('p7');
  ['Supplier', 'Magelang Storage', 'On Motor', 'Pekalongan Storage', 'Packing', 'Shipped', 'Customer'].forEach((label) => {
    assert.ok(listEl.innerHTML.includes(label), `label ${label} harus tampil di chain`);
  });
  const customerIdx = listEl.innerHTML.indexOf('Customer');
  assert.ok(listEl.innerHTML.slice(Math.max(0, customerIdx - 10), customerIdx).includes('●'));
});

test('renderMovement() — productId tidak ditemukan -> render chain tanpa highlight, tidak throw', () => {
  const listEl = makeEl();
  const ctx = makeCtx(baseD(), { getElementById: (id) => (id === 'productMovementList' ? listEl : null) });
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.renderMovement('tidak-ada'));
  assert.ok(!listEl.innerHTML.includes('●'));
});

// --- setManualLocation()/clearManualLocation() (Sesi 376) ----------------
// Module Inventory Movement: sebelumnya renderMovement() MURNI display,
// tidak ada cara set posisi barang manual kalau derivasi otomatis (lifecycle
// transaksi/stok) belum/tidak sesuai kenyataan lapangan. setManualLocation()
// SATU-SATUNYA titik masuk override, disimpan di D.productMovementOverride
// (koleksi baru, TAPI bukan stok baru — cuma penanda posisi).

test('setManualLocation() — ok:false kalau produk tidak ditemukan', () => {
  const ctx = makeCtx(baseD());
  const r = ctx.BusinessFlowPresenter.setManualLocation('tidak-ada', 'ON_MOTOR');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'produk_tidak_ditemukan');
});

test('setManualLocation() — ok:false kalau lokasi tidak valid', () => {
  const D = baseD({ products: [{ id: 'p8', stock: 0 }] });
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.setManualLocation('p8', 'PLANET_MARS');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'lokasi_tidak_valid');
});

test('setManualLocation() — menang di atas derivasi otomatis (override lifecycle)', () => {
  const D = baseD({
    products: [{ id: 'p9', stock: 0 }],
    cobek: [{ id: 7, delivered: true, items: [{ productId: 'p9', qty: 1 }] }], // derivasi otomatis: CUSTOMER
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('p9').location, 'CUSTOMER');
  const r = ctx.BusinessFlowPresenter.setManualLocation('p9', 'on_motor'); // lowercase, harus dinormalisasi
  assert.equal(r.ok, true);
  assert.equal(r.location, 'ON_MOTOR');
  const s = ctx.BusinessFlowPresenter.currentLocation('p9');
  assert.equal(s.location, 'ON_MOTOR');
  assert.equal(s.manual, true);
  assert.equal(D.productMovementOverride.p9.location, 'ON_MOTOR');
});

test('clearManualLocation() — hapus override, balik ke derivasi otomatis', () => {
  const D = baseD({
    products: [{ id: 'p10', stock: 5 }], // fallback otomatis: PEKALONGAN_STORAGE
  });
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.setManualLocation('p10', 'SHIPPED');
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('p10').location, 'SHIPPED');
  const r = ctx.BusinessFlowPresenter.clearManualLocation('p10');
  assert.equal(r.ok, true);
  const s = ctx.BusinessFlowPresenter.currentLocation('p10');
  assert.equal(s.location, 'PEKALONGAN_STORAGE');
  assert.ok(!s.manual);
  assert.ok(!D.productMovementOverride.p10);
});

test('clickMovementRow()/clickResetMovement() — wire ke set/clear + re-render, tidak throw tanpa DOM', () => {
  const listEl = makeEl();
  const D = baseD({ products: [{ id: 'p11', stock: 0 }] });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'productMovementList' ? listEl : null) });
  ctx.BusinessFlowPresenter.clickMovementRow('p11', 'PACKING');
  assert.equal(D.productMovementOverride.p11.location, 'PACKING');
  assert.ok(listEl.innerHTML.includes('Reset ke Otomatis'));
  ctx.BusinessFlowPresenter.clickResetMovement('p11');
  assert.ok(!D.productMovementOverride.p11);
  assert.ok(!listEl.innerHTML.includes('Reset ke Otomatis'));
});

// --- Purchase Order (Sesi 378) --------------------------------------------

test('createPurchaseOrder() — ok:false kalau produk tidak ditemukan', () => {
  const ctx = makeCtx(baseD());
  const r = ctx.BusinessFlowPresenter.createPurchaseOrder({ productId: 'tidak-ada', qty: 5 });
  assert.equal(r.ok, false);
});

test('createPurchaseOrder() — ok:false kalau qty <= 0 / bukan angka', () => {
  const D = baseD({ products: [{ id: 'pp1', name: 'Cobek A', stock: 0 }] });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.createPurchaseOrder({ productId: 'pp1', qty: 0 }).ok, false);
  assert.equal(ctx.BusinessFlowPresenter.createPurchaseOrder({ productId: 'pp1', qty: -3 }).ok, false);
  assert.equal(ctx.BusinessFlowPresenter.createPurchaseOrder({ productId: 'pp1', qty: NaN }).ok, false);
});

test('createPurchaseOrder() — sukses, status awal ORDERED, tersimpan di D.purchaseOrders', () => {
  const D = baseD({ products: [{ id: 'pp2', name: 'Cobek B', stock: 0 }], purchaseOrders: [] });
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.createPurchaseOrder({ productId: 'pp2', qty: 10 });
  assert.equal(r.ok, true);
  assert.equal(r.purchase.status, 'ORDERED');
  assert.equal(r.purchase.qty, 10);
  assert.equal(D.purchaseOrders.length, 1);
});

test('receivePurchaseOrder() — ok:false kalau PO tidak ditemukan', () => {
  const ctx = makeCtx(baseD({ purchaseOrders: [] }));
  assert.equal(ctx.BusinessFlowPresenter.receivePurchaseOrder('tidak-ada').ok, false);
});

test('receivePurchaseOrder() — sukses ubah status ke RECEIVED, idempotent kalau dipanggil 2x', () => {
  const D = baseD({ products: [{ id: 'pp3', name: 'Cobek C', stock: 0 }], purchaseOrders: [] });
  const ctx = makeCtx(D);
  const created = ctx.BusinessFlowPresenter.createPurchaseOrder({ productId: 'pp3', qty: 5 });
  const r1 = ctx.BusinessFlowPresenter.receivePurchaseOrder(created.purchase.id);
  assert.equal(r1.ok, true);
  assert.equal(r1.purchase.status, 'RECEIVED');
  assert.ok(!r1.alreadyReceived);
  const receivedDate1 = r1.purchase.receivedDate;
  const r2 = ctx.BusinessFlowPresenter.receivePurchaseOrder(created.purchase.id);
  assert.equal(r2.ok, true);
  assert.equal(r2.alreadyReceived, true);
  assert.equal(r2.purchase.receivedDate, receivedDate1);
});

test('currentLocation() — SUPPLIER (eksplisit dari PO) kalau ada Purchase Order status ORDERED', () => {
  const D = baseD({
    products: [{ id: 'pp4', stock: 5 }], // stok masih ada dari batch lama — fallback lama akan salah bilang PEKALONGAN_STORAGE
    purchaseOrders: [{ id: 'po1', productId: 'pp4', qty: 10, status: 'ORDERED', createdDate: '2026-08-01T00:00:00.000Z' }],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.currentLocation('pp4');
  assert.equal(s.location, 'SUPPLIER');
  assert.equal(s.purchaseId, 'po1');
});

test('currentLocation() — MAGELANG_STORAGE kalau Purchase Order sudah RECEIVED', () => {
  const D = baseD({
    products: [{ id: 'pp5', stock: 0 }],
    purchaseOrders: [{ id: 'po2', productId: 'pp5', qty: 10, status: 'RECEIVED', createdDate: '2026-08-01T00:00:00.000Z', receivedDate: '2026-08-02T00:00:00.000Z' }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('pp5').location, 'MAGELANG_STORAGE');
});

test('currentLocation() — Inventory Transfer aktif (S377) tetap menang di atas Purchase Order (S378)', () => {
  const D = baseD({
    products: [{ id: 'pp6', stock: 0 }],
    purchaseOrders: [{ id: 'po3', productId: 'pp6', qty: 10, status: 'RECEIVED', createdDate: '2026-08-01T00:00:00.000Z' }],
    inventoryTransfers: [{ id: 't5', status: 'ON_TRIP', items: [{ productId: 'pp6', qty: 10 }], createdDate: '2026-08-03T00:00:00.000Z' }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('pp6').location, 'ON_MOTOR');
});

test('currentLocation() — lifecycle order (sale) tetap menang di atas Purchase Order lama', () => {
  const D = baseD({
    products: [{ id: 'pp7', stock: 0 }],
    purchaseOrders: [{ id: 'po4', productId: 'pp7', qty: 10, status: 'RECEIVED', createdDate: '2026-07-01T00:00:00.000Z' }],
    cobek: [{ id: 9, delivered: true, items: [{ productId: 'pp7', qty: 1 }] }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('pp7').location, 'CUSTOMER');
});

test('currentLocation() — fallback stok lama tetap jalan kalau TIDAK ADA Purchase Order sama sekali', () => {
  const D = baseD({ products: [{ id: 'pp8', stock: 0 }], purchaseOrders: [] });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.currentLocation('pp8').location, 'SUPPLIER');
});

// --- renderPurchaseOrderBox() / clickCreatePurchaseOrder() /
// clickReceivePurchaseOrder() (Sesi 379) — entry point UI Purchase Order di
// modal Detail Produk. Sebelum ini createPurchaseOrder()/
// receivePurchaseOrder() (S378) cuma bisa dipanggil programatik (test),
// belum ada tombol nyata. Pola test sama persis renderMovement() di atas
// (guard DOM lewat makeEl()/getElementById stub).

test('renderPurchaseOrderBox() — tidak throw kalau container tidak ada', () => {
  const ctx = makeCtx(baseD(), { getElementById: () => null });
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.renderPurchaseOrderBox('x'));
});

test('renderPurchaseOrderBox() — productId kosong (produk baru belum disimpan) -> hint, tidak throw', () => {
  const boxEl = makeEl();
  const ctx = makeCtx(baseD(), { getElementById: (id) => (id === 'productPurchaseOrderBox' ? boxEl : null) });
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.renderPurchaseOrderBox(null));
  assert.ok(boxEl.innerHTML.toLowerCase().includes('simpan produk'));
});

test('renderPurchaseOrderBox() — belum ada PO aktif -> tampil input qty + tombol Buat Purchase Order', () => {
  const boxEl = makeEl();
  const D = baseD({ products: [{ id: 'po_p1', stock: 0 }], purchaseOrders: [] });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'productPurchaseOrderBox' ? boxEl : null) });
  ctx.BusinessFlowPresenter.renderPurchaseOrderBox('po_p1');
  assert.ok(boxEl.innerHTML.includes('pPoQty'));
  assert.ok(boxEl.innerHTML.includes('clickCreatePurchaseOrder'));
});

test('renderPurchaseOrderBox() — PO terakhir ORDERED -> tampil info + tombol Terima Barang', () => {
  const boxEl = makeEl();
  const D = baseD({
    products: [{ id: 'po_p2', stock: 0 }],
    purchaseOrders: [{ id: 'po_x', productId: 'po_p2', qty: 7, status: 'ORDERED', createdDate: '2026-08-01T00:00:00.000Z' }],
  });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'productPurchaseOrderBox' ? boxEl : null) });
  ctx.BusinessFlowPresenter.renderPurchaseOrderBox('po_p2');
  assert.ok(boxEl.innerHTML.includes('7 pcs'));
  assert.ok(boxEl.innerHTML.includes('clickReceivePurchaseOrder'));
});

test('clickCreatePurchaseOrder() — buat PO dari qty input lalu re-render box (pindah ke tampilan ORDERED)', () => {
  const boxEl = makeEl();
  const qtyEl = { value: '5' };
  const D = baseD({ products: [{ id: 'po_p3', stock: 0 }] });
  const ctx = makeCtx(D, {
    getElementById: (id) => {
      if (id === 'productPurchaseOrderBox') return boxEl;
      if (id === 'pPoQty') return qtyEl;
      return null;
    },
  });
  ctx.BusinessFlowPresenter.clickCreatePurchaseOrder('po_p3');
  assert.equal(D.purchaseOrders.length, 1);
  assert.equal(D.purchaseOrders[0].qty, 5);
  assert.equal(D.purchaseOrders[0].status, 'ORDERED');
  assert.ok(boxEl.innerHTML.includes('clickReceivePurchaseOrder'));
});

test('clickReceivePurchaseOrder() — tandai RECEIVED lalu re-render box (pindah ke tampilan buat PO baru)', () => {
  const boxEl = makeEl();
  const D = baseD({
    products: [{ id: 'po_p4', stock: 0 }],
    purchaseOrders: [{ id: 'po_y', productId: 'po_p4', qty: 3, status: 'ORDERED', createdDate: '2026-08-01T00:00:00.000Z' }],
  });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'productPurchaseOrderBox' ? boxEl : null) });
  ctx.BusinessFlowPresenter.clickReceivePurchaseOrder('po_y', 'po_p4');
  assert.equal(D.purchaseOrders[0].status, 'RECEIVED');
  assert.ok(boxEl.innerHTML.includes('pPoQty'));
});

// --- renderPurchaseOrderHistory() (sesi lanjutan S379) — riwayat SEMUA
// Purchase Order per produk (bukan cuma yg terbaru seperti
// renderPurchaseOrderBox() di atas). Pola test sama persis
// renderPurchaseOrderBox() (guard DOM lewat makeEl()/getElementById stub).

test('renderPurchaseOrderHistory() — tidak throw kalau container tidak ada', () => {
  const ctx = makeCtx(baseD(), { getElementById: () => null });
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.renderPurchaseOrderHistory('x'));
});

test('renderPurchaseOrderHistory() — productId kosong atau belum ada PO -> container dikosongkan', () => {
  const histEl = makeEl();
  const D = baseD({ products: [{ id: 'poh_p0', stock: 0 }], purchaseOrders: [] });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'productPurchaseOrderHistory' ? histEl : null) });
  ctx.BusinessFlowPresenter.renderPurchaseOrderHistory(null);
  assert.equal(histEl.innerHTML, '');
  ctx.BusinessFlowPresenter.renderPurchaseOrderHistory('poh_p0');
  assert.equal(histEl.innerHTML, '');
});

test('renderPurchaseOrderHistory() — tampilkan SEMUA PO produk ini, terbaru duluan, PO produk lain tidak ikut', () => {
  const histEl = makeEl();
  const D = baseD({
    products: [{ id: 'poh_p1', stock: 0 }, { id: 'poh_other', stock: 0 }],
    purchaseOrders: [
      { id: 'poh_1', productId: 'poh_p1', qty: 5, status: 'RECEIVED', createdDate: '2026-07-01T00:00:00.000Z', receivedDate: '2026-07-03T00:00:00.000Z' },
      { id: 'poh_2', productId: 'poh_p1', qty: 8, status: 'ORDERED', createdDate: '2026-08-01T00:00:00.000Z' },
      { id: 'poh_3', productId: 'poh_other', qty: 99, status: 'ORDERED', createdDate: '2026-08-02T00:00:00.000Z' },
    ],
  });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'productPurchaseOrderHistory' ? histEl : null) });
  ctx.BusinessFlowPresenter.renderPurchaseOrderHistory('poh_p1');
  assert.ok(histEl.innerHTML.includes('(2)'));
  assert.ok(histEl.innerHTML.includes('8 pcs'));
  assert.ok(histEl.innerHTML.includes('5 pcs'));
  assert.ok(!histEl.innerHTML.includes('99 pcs'));
  // terbaru (8 pcs, ORDERED) duluan dari yang lama (5 pcs, RECEIVED)
  assert.ok(histEl.innerHTML.indexOf('8 pcs') < histEl.innerHTML.indexOf('5 pcs'));
  assert.ok(histEl.innerHTML.includes('Diterima'));
  assert.ok(histEl.innerHTML.includes('belum diterima'));
});

test('clickCreatePurchaseOrder()/clickReceivePurchaseOrder() — ikut re-render riwayat', () => {
  const boxEl = makeEl();
  const histEl = makeEl();
  const qtyEl = { value: '4' };
  const D = baseD({ products: [{ id: 'poh_p2', stock: 0 }] });
  const ctx = makeCtx(D, {
    getElementById: (id) => {
      if (id === 'productPurchaseOrderBox') return boxEl;
      if (id === 'productPurchaseOrderHistory') return histEl;
      if (id === 'pPoQty') return qtyEl;
      return null;
    },
  });
  ctx.BusinessFlowPresenter.clickCreatePurchaseOrder('poh_p2');
  assert.ok(histEl.innerHTML.includes('4 pcs'));
  const poId = D.purchaseOrders[0].id;
  ctx.BusinessFlowPresenter.clickReceivePurchaseOrder(poId, 'poh_p2');
  assert.ok(histEl.innerHTML.includes('Diterima'));
});
