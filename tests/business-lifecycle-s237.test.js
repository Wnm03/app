'use strict';
// tests/business-lifecycle-s237.test.js — cakupan Sesi 237: Business
// Lifecycle (modules/shop/business-flow-presenter.js). WIRE ONLY — 100%
// reuse BusinessFlowPresenter.orderStatus() (S209-210, delivered/paid dari
// D.cobek/D.piutang yang SUDAH ADA) untuk lifecycleStatus(). TIDAK ADA
// field D baru, TIDAK ADA engine/business logic baru — statusLabel()/
// nextStatus()/previousStatus() murni navigasi array statis
// BUSINESS_LIFECYCLE_STATUSES. renderLifecycle() hanya dites lewat
// guard "container tidak ada -> aman diam2" + isi HTML dgn document stub
// minimal, pola sama tests/business-flow-presenter.test.js.

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

// --- statusLabel()/nextStatus()/previousStatus() — navigasi array murni --

test('statusLabel() — balikin label Bahasa Indonesia utk semua 10 status, case-insensitive', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.statusLabel('DRAFT'), 'Draft');
  assert.equal(ctx.BusinessFlowPresenter.statusLabel('purchased'), 'Purchased');
  assert.equal(ctx.BusinessFlowPresenter.statusLabel('Picked_Up'), 'Picked Up');
  assert.equal(ctx.BusinessFlowPresenter.statusLabel('IN_TRANSIT'), 'In Transit');
  assert.equal(ctx.BusinessFlowPresenter.statusLabel('RECEIVED'), 'Received');
  assert.equal(ctx.BusinessFlowPresenter.statusLabel('READY_FOR_SALE'), 'Ready For Sale');
  assert.equal(ctx.BusinessFlowPresenter.statusLabel('SOLD'), 'Sold');
  assert.equal(ctx.BusinessFlowPresenter.statusLabel('PACKING'), 'Packing');
  assert.equal(ctx.BusinessFlowPresenter.statusLabel('SHIPPED'), 'Shipped');
  assert.equal(ctx.BusinessFlowPresenter.statusLabel('COMPLETED'), 'Completed');
});

test('statusLabel() — fallback balikin apa adanya kalau status tidak dikenali', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.statusLabel('UNKNOWN_XYZ'), 'UNKNOWN_XYZ');
});

test('nextStatus() — urut sesuai spesifikasi DRAFT->PURCHASED->...->COMPLETED, null di ujung', () => {
  const ctx = makeCtx(baseD());
  const order = ['DRAFT', 'PURCHASED', 'PICKED_UP', 'IN_TRANSIT', 'RECEIVED', 'READY_FOR_SALE', 'SOLD', 'PACKING', 'SHIPPED', 'COMPLETED'];
  for (let i = 0; i < order.length - 1; i++) {
    assert.equal(ctx.BusinessFlowPresenter.nextStatus(order[i]), order[i + 1]);
  }
  assert.equal(ctx.BusinessFlowPresenter.nextStatus('COMPLETED'), null);
  assert.equal(ctx.BusinessFlowPresenter.nextStatus('TIDAK_ADA'), null);
});

test('previousStatus() — kebalikan nextStatus(), null di awal', () => {
  const ctx = makeCtx(baseD());
  const order = ['DRAFT', 'PURCHASED', 'PICKED_UP', 'IN_TRANSIT', 'RECEIVED', 'READY_FOR_SALE', 'SOLD', 'PACKING', 'SHIPPED', 'COMPLETED'];
  for (let i = 1; i < order.length; i++) {
    assert.equal(ctx.BusinessFlowPresenter.previousStatus(order[i]), order[i - 1]);
  }
  assert.equal(ctx.BusinessFlowPresenter.previousStatus('DRAFT'), null);
  assert.equal(ctx.BusinessFlowPresenter.previousStatus('TIDAK_ADA'), null);
});

// --- lifecycleStatus(cobekId) — reuse orderStatus() apa adanya ------------

test('lifecycleStatus() — ok:false kalau transaksi tidak ditemukan (sama persis orderStatus())', () => {
  const ctx = makeCtx(baseD());
  const s = ctx.BusinessFlowPresenter.lifecycleStatus('tidak-ada');
  assert.equal(s.ok, false);
});

test('lifecycleStatus() — IN_TRANSIT kalau belum delivered', () => {
  const D = baseD({ cobek: [{ id: 'c1', delivered: false }] });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.lifecycleStatus('c1');
  assert.equal(s.ok, true);
  assert.equal(s.status, 'IN_TRANSIT');
});

test('lifecycleStatus() — SOLD kalau delivered tapi piutang terkait belum lunas', () => {
  const D = baseD({
    cobek: [{ id: 'c2', delivered: true, piutangLinkId: 'pi1' }],
    piutang: [{ id: 'pi1', lunas: false }],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.lifecycleStatus('c2');
  assert.equal(s.status, 'SOLD');
});

test('lifecycleStatus() — COMPLETED kalau delivered & lunas (atau tidak ada piutang terkait)', () => {
  const D1 = baseD({ cobek: [{ id: 'c3', delivered: true }] });
  const ctx1 = makeCtx(D1);
  assert.equal(ctx1.BusinessFlowPresenter.lifecycleStatus('c3').status, 'COMPLETED');

  const D2 = baseD({
    cobek: [{ id: 'c4', delivered: true, piutangLinkId: 'pi2' }],
    piutang: [{ id: 'pi2', lunas: true }],
  });
  const ctx2 = makeCtx(D2);
  assert.equal(ctx2.BusinessFlowPresenter.lifecycleStatus('c4').status, 'COMPLETED');
});

// --- renderLifecycle(cobekId) — guard DOM, tidak throw --------------------

function makeEl() { return { innerHTML: '' }; }

test('renderLifecycle() — tidak throw kalau container tidak ada', () => {
  const ctx = makeCtx(baseD(), { getElementById: () => null });
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.renderLifecycle('x'));
});

test('renderLifecycle() — render semua 10 status & highlight status aktif (COMPLETED)', () => {
  const listEl = makeEl();
  const D = baseD({ cobek: [{ id: 'c5', delivered: true }] });
  const ctx = makeCtx(D, { getElementById: (id) => (id === 'orderBusinessStatusList' ? listEl : null) });
  ctx.BusinessFlowPresenter.renderLifecycle('c5');
  ['Draft', 'Purchased', 'Picked Up', 'In Transit', 'Received', 'Ready For Sale', 'Sold', 'Packing', 'Shipped', 'Completed'].forEach((label) => {
    assert.ok(listEl.innerHTML.includes(label), `label ${label} harus tampil di chain`);
  });
  // Completed harus jadi satu-satunya yang di-highlight (ada tanda ●)
  const completedIdx = listEl.innerHTML.indexOf('Completed');
  assert.ok(listEl.innerHTML.slice(Math.max(0, completedIdx - 10), completedIdx).includes('●'));
});

test('renderLifecycle() — cobekId null/tidak ditemukan -> render chain tanpa highlight, tidak throw', () => {
  const listEl = makeEl();
  const ctx = makeCtx(baseD(), { getElementById: (id) => (id === 'orderBusinessStatusList' ? listEl : null) });
  assert.doesNotThrow(() => ctx.BusinessFlowPresenter.renderLifecycle(null));
  assert.ok(!listEl.innerHTML.includes('●'));
});
