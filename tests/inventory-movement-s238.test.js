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
