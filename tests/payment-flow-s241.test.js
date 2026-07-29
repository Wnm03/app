'use strict';
// tests/payment-flow-s241.test.js — cakupan Sesi 241: Payment Flow
// (modules/shop/business-flow-presenter.js). WIRE ONLY — 100% reuse
// orderStatus()/markPaymentReceived() (S209-210) & field t.total/Piutang
// yang SUDAH ADA (kw-shop-dp, cobek-order.js). paymentStatus()/
// paymentSummary() murni derivasi, markPaid() 100% delegasi ke
// markPaymentReceived() (0 duplikat logic pembayaran). Pola test sama
// persis tests/receive-goods-s240.test.js.

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

// --- paymentStatus() ------------------------------------------------------

test('paymentStatus() — ok:false kalau Trip/order tidak ditemukan', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.paymentStatus('tidak-ada').ok, false);
});

test('paymentStatus() — PAID kalau tidak ada piutang terhubung (lunas penuh sejak awal)', () => {
  const D = baseD({ cobek: [{ id: 1, total: 50000, piutangLinkId: null }] });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.paymentStatus(1).status, 'PAID');
});

test('paymentStatus() — PAID kalau piutang terhubung tapi sudah lunas', () => {
  const D = baseD({
    cobek: [{ id: 2, total: 50000, piutangLinkId: 'pi1' }],
    piutang: [{ id: 'pi1', nilai: 20000, lunas: true }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.paymentStatus(2).status, 'PAID');
});

test('paymentStatus() — UNPAID kalau piutang sisa == total (belum ada DP sama sekali)', () => {
  const D = baseD({
    cobek: [{ id: 3, total: 50000, piutangLinkId: 'pi2' }],
    piutang: [{ id: 'pi2', nilai: 50000, lunas: false }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.paymentStatus(3).status, 'UNPAID');
});

test('paymentStatus() — PARTIAL kalau piutang sisa < total (sudah ada DP sebagian)', () => {
  const D = baseD({
    cobek: [{ id: 4, total: 50000, piutangLinkId: 'pi3' }],
    piutang: [{ id: 'pi3', nilai: 20000, lunas: false }],
  });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.paymentStatus(4).status, 'PARTIAL');
});

// --- markPaid() -------------------------------------------------------

test('markPaid() — ok:false kalau order tidak punya piutang terhubung (sama persis markPaymentReceived())', () => {
  const D = baseD({ cobek: [{ id: 5, total: 50000, piutangLinkId: null }] });
  const ctx = makeCtx(D);
  assert.equal(ctx.BusinessFlowPresenter.markPaid(5).ok, false);
});

test('markPaid() — set piutang.lunas=true (delegasi markPaymentReceived()) + catat paymentDate di Trip', () => {
  const D = baseD({
    cobek: [{ id: 6, total: 50000, piutangLinkId: 'pi4' }],
    piutang: [{ id: 'pi4', nilai: 20000, lunas: false }],
  });
  const ctx = makeCtx(D);
  const r = ctx.BusinessFlowPresenter.markPaid(6);
  assert.equal(r.ok, true);
  assert.equal(D.piutang[0].lunas, true);
  assert.equal(D.piutang[0].nilai, 20000); // 0 nilai lain berubah, sama pola markPaymentReceived()
  assert.ok(D.cobek[0].paymentDate);
});

test('markPaid() — paymentStatus() jadi PAID setelah dipanggil', () => {
  const D = baseD({
    cobek: [{ id: 7, total: 50000, piutangLinkId: 'pi5' }],
    piutang: [{ id: 'pi5', nilai: 20000, lunas: false }],
  });
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.markPaid(7);
  assert.equal(ctx.BusinessFlowPresenter.paymentStatus(7).status, 'PAID');
});

// --- paymentSummary() ----------------------------------------------------

test('paymentSummary() — ok:false kalau Trip/order tidak ditemukan', () => {
  const ctx = makeCtx(baseD());
  assert.equal(ctx.BusinessFlowPresenter.paymentSummary('tidak-ada').ok, false);
});

test('paymentSummary() — totalTagihan/sudahDibayar/sisaTagihan/status/paymentDate benar utk PARTIAL', () => {
  const D = baseD({
    cobek: [{ id: 8, total: 50000, piutangLinkId: 'pi6' }],
    piutang: [{ id: 'pi6', nilai: 20000, lunas: false }],
  });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.paymentSummary(8);
  assert.equal(s.ok, true);
  assert.equal(s.status, 'PARTIAL');
  assert.equal(s.totalTagihan, 50000);
  assert.equal(s.sisaTagihan, 20000);
  assert.equal(s.sudahDibayar, 30000);
  assert.equal(s.paymentDate, null);
});

test('paymentSummary() — sisaTagihan 0 & sudahDibayar == totalTagihan kalau PAID (tidak ada piutang aktif)', () => {
  const D = baseD({ cobek: [{ id: 9, total: 75000, piutangLinkId: null }] });
  const ctx = makeCtx(D);
  const s = ctx.BusinessFlowPresenter.paymentSummary(9);
  assert.equal(s.status, 'PAID');
  assert.equal(s.sisaTagihan, 0);
  assert.equal(s.sudahDibayar, 75000);
});

test('paymentSummary() — paymentDate terisi setelah markPaid()', () => {
  const D = baseD({
    cobek: [{ id: 10, total: 40000, piutangLinkId: 'pi7' }],
    piutang: [{ id: 'pi7', nilai: 40000, lunas: false }],
  });
  const ctx = makeCtx(D);
  ctx.BusinessFlowPresenter.markPaid(10);
  const s = ctx.BusinessFlowPresenter.paymentSummary(10);
  assert.equal(s.status, 'PAID');
  assert.ok(s.paymentDate);
});
