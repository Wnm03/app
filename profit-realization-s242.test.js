'use strict';
// tests/profit-realization-s242.test.js — cakupan Sesi 242: Profit
// Realization & Finance Sync (modules/shop/business-flow-presenter.js).
// WIRE ONLY — 100% reuse orderStatus()/profitPerTrip() (S209-210/S211-212)
// & syncPiutangFinanceViews()/TripPresenter (S225-226/S204-A). profitStatus()
// murni derivasi, markRealized() cuma mencatat realizedDate + sync ulang
// tampilan yang sudah ada (0 rumus profit baru). Pola test sama persis
// tests/payment-flow-s241.test.js.

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

// --- profitStatus() --------------------------------------------------------

test('profitStatus() — ok:false kalau Trip/order tidak ditemukan', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.profitStatus('tidak-ada').ok, false);
});

test('profitStatus() — UNREALIZED kalau belum delivered', () => {
  const D = baseD({ cobek: [{ id: 1, total: 50000, piutangLinkId: null, delivered: false }] });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.profitStatus(1).status, 'UNREALIZED');
});

test('profitStatus() — UNREALIZED kalau delivered tapi belum PAID (piutang aktif)', () => {
  const D = baseD({
    cobek: [{ id: 2, total: 50000, piutangLinkId: 'pi1', delivered: true }],
    piutang: [{ id: 'pi1', nilai: 20000, lunas: false }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.profitStatus(2).status, 'UNREALIZED');
});

test('profitStatus() — REALIZED kalau delivered DAN paid (tidak ada piutang aktif)', () => {
  const D = baseD({ cobek: [{ id: 3, total: 50000, piutangLinkId: null, delivered: true }] });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.profitStatus(3).status, 'REALIZED');
});

test('profitStatus() — REALIZED kalau delivered DAN piutang terhubung sudah lunas', () => {
  const D = baseD({
    cobek: [{ id: 4, total: 50000, piutangLinkId: 'pi2', delivered: true }],
    piutang: [{ id: 'pi2', nilai: 20000, lunas: true }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.profitStatus(4).status, 'REALIZED');
});

// --- markRealized() ---------------------------------------------------------

test('markRealized() — ok:false kalau belum REALIZED (belum delivered)', () => {
  const D = baseD({ cobek: [{ id: 5, total: 50000, piutangLinkId: null, delivered: false }] });
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.markRealized(5);
  assert.equal(r.ok, false);
  assert.equal(D.cobek[0].realizedDate, undefined);
});

test('markRealized() — catat realizedDate kalau sudah delivered & paid', () => {
  const D = baseD({ cobek: [{ id: 6, total: 50000, piutangLinkId: null, delivered: true, profit: 20000, ongkir: 0 }] });
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.markRealized(6);
  assert.equal(r.ok, true);
  assert.ok(D.cobek[0].realizedDate);
});

test('markRealized() — idempotent, tidak menimpa realizedDate yang sudah ada', () => {
  const D = baseD({ cobek: [{ id: 7, total: 50000, piutangLinkId: null, delivered: true, profit: 20000, ongkir: 0, realizedDate: '2020-01-01T00:00:00.000Z' }] });
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.markRealized(7);
  assert.equal(D.cobek[0].realizedDate, '2020-01-01T00:00:00.000Z');
});

test('markPaid() — memicu markRealized() otomatis kalau sudah delivered', () => {
  const D = baseD({
    cobek: [{ id: 8, total: 50000, piutangLinkId: 'pi3', delivered: true, profit: 20000, ongkir: 0 }],
    piutang: [{ id: 'pi3', nilai: 20000, lunas: false }],
  });
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.markPaid(8);
  assert.equal(ctx.BusinessFlowPresenter.profitStatus(8).status, 'REALIZED');
  assert.ok(D.cobek[0].realizedDate);
});

// --- realizedSummary() -------------------------------------------------------

test('realizedSummary() — ok:false kalau Trip/order tidak ditemukan', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.realizedSummary('tidak-ada').ok, false);
});

test('realizedSummary() — Revenue/Cost/Profit/Margin/Status/Realized Date benar', () => {
  const D = baseD({ cobek: [{ id: 9, total: 100000, piutangLinkId: null, delivered: true, profit: 40000, ongkir: 0 }] });
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.markRealized(9);
  const s = ctx.BusinessFlowPresenter.realizedSummary(9);
  assert.equal(s.ok, true);
  assert.equal(s.status, 'REALIZED');
  assert.equal(s.revenue, 100000);
  assert.equal(s.cost, 60000);
  assert.equal(s.profit, 40000);
  assert.equal(s.marginPct, 40);
  assert.ok(s.realizedDate);
});

test('realizedSummary() — realizedDate null selama belum REALIZED', () => {
  const D = baseD({ cobek: [{ id: 10, total: 50000, piutangLinkId: null, delivered: false, profit: 10000, ongkir: 0 }] });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.realizedSummary(10);
  assert.equal(s.status, 'UNREALIZED');
  assert.equal(s.realizedDate, null);
});
