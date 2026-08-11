'use strict';
// tests/trip-management-s239.test.js — cakupan Sesi 239: Trip Management
// (modules/shop/business-flow-presenter.js). WIRE ONLY — 100% reuse
// TripPresenter.summary() (S204-A) untuk tripSummary(). TIDAK ADA field D
// baru, TIDAK ADA Trip entity/engine/CRUD baru — tripStatus()/
// nextTripStatus() murni navigasi array statis TRIP_STATUSES. Pola test
// sama persis tests/business-lifecycle-s237.test.js /
// tests/inventory-movement-s238.test.js.

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
    ['BusinessFlowPresenter', 'OwnershipEngine', 'TripPresenter'],
  );
}

// --- tripStatus()/nextTripStatus() — navigasi array murni -----------------

test('tripStatus() — balikin label utk semua 7 status, case-insensitive', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.tripStatus('PLANNED'), 'Planned');
  assert.equal(ctx.BusinessFlowPresenter.tripStatus('loading'), 'Loading');
  assert.equal(ctx.BusinessFlowPresenter.tripStatus('Ready'), 'Ready');
  assert.equal(ctx.BusinessFlowPresenter.tripStatus('on_trip'), 'On Trip');
  assert.equal(ctx.BusinessFlowPresenter.tripStatus('ARRIVED'), 'Arrived');
  assert.equal(ctx.BusinessFlowPresenter.tripStatus('Unloading'), 'Unloading');
  assert.equal(ctx.BusinessFlowPresenter.tripStatus('COMPLETED'), 'Completed');
});

test('tripStatus() — fallback balikin apa adanya kalau status tidak dikenali', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.tripStatus('UNKNOWN_XYZ'), 'UNKNOWN_XYZ');
});

test('nextTripStatus() — urut sesuai spesifikasi PLANNED->...->COMPLETED, null di ujung', () => {
  const ctx = makeCtx(baseD());
  const order = ['PLANNED', 'LOADING', 'READY', 'ON_TRIP', 'ARRIVED', 'UNLOADING', 'COMPLETED'];
  for (let i = 0; i < order.length - 1; i++) {
    assert.equal(ctx.BusinessFlowPresenter.nextTripStatus(order[i]), order[i + 1]);
  }
  assert.equal(ctx.BusinessFlowPresenter.nextTripStatus('COMPLETED'), null);
  assert.equal(ctx.BusinessFlowPresenter.nextTripStatus('TIDAK_ADA'), null);
});

// --- tripSummary() — 100% reuse TripPresenter.summary() -------------------

test('tripSummary() — ok:false kalau D.cobek kosong (sama persis TripPresenter.summary())', () => {
  const ctx = makeCtx(baseD());
  assert.deepEqual(ctx.BusinessFlowPresenter.tripSummary(), ctx.TripPresenter.summary());
});

test('tripSummary() — sama persis hasil TripPresenter.summary() kalau ada trip delivered bulan ini', () => {
  const now = new Date();
  const D = baseD({
    cobek: [{
      id: 1, delivered: true, ongkir: 15000, marginPct: 20,
      date: now.toISOString(), items: [{ productId: 'p1', qty: 1 }],
    }],
  });
  const ctx = makeCtx(D);
  const summary = ctx.BusinessFlowPresenter.tripSummary();
  assert.deepEqual(summary, ctx.TripPresenter.summary());
  assert.equal(summary.ok, true);
  assert.equal(summary.trips, 1);
  assert.equal(summary.totalOngkir, 15000);
});

test('tripSummary() — ok:false kalau TripPresenter belum dimuat', () => {
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shop/business-flow-presenter.js',
    ],
    {
      D: baseD(),
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
    },
    ['BusinessFlowPresenter', 'OwnershipEngine'],
  );
  assert.equal(ctx.BusinessFlowPresenter.tripSummary().ok, false);
});
