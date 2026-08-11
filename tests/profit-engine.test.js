'use strict';
// tests/profit-engine.test.js — cakupan modules/shop/profit-engine.js
// (S198, Business Engine untuk Shop). ProfitEngine delegasi ke
// calculateProfit()/PriceReko.roundNice() (cobek-pricing.js) — harness perlu
// memuat file itu, pola sama tests/cobek-vehicle-capacity.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shop/cobek-pricing.js', 'modules/shop/profit-engine.js'],
    { D: D || { products: [], cobekKategori: [], bbmLogs: [] } },
    ['ProfitEngine', 'PriceReko'],
  );
}

// --- profit() — delegasi ke calculateProfit -------------------------------

test('profit() — revenue-modal-ongkir dari qty unit produk', () => {
  const D = { products: [{ id: 'p1', hargaBeli: 10000, hargaJual: 20000 }], cobekKategori: [] };
  const ctx = makeCtx(D);
  const r = ctx.ProfitEngine.profit({ productId: 'p1', qty: 3 });
  assert.equal(r.revenue, 60000);
  assert.equal(r.modal, 30000);
  assert.equal(r.profit, 30000);
  assert.equal(r.marginPct, 50);
});

test('profit() — productId tidak ditemukan -> null (bukan throw)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.ProfitEngine.profit({ productId: 'ghost', qty: 1 }), null);
});

test('profit() — memperhitungkan ongkir dari deliveryPlan.route.totalPerPcs', () => {
  const D = { products: [{ id: 'p1', hargaBeli: 10000, hargaJual: 20000 }], cobekKategori: [] };
  const ctx = makeCtx(D);
  const r = ctx.ProfitEngine.profit({
    productId: 'p1', qty: 2, deliveryPlan: { route: { totalPerPcs: 1000 } },
  });
  assert.equal(r.ongkir, 2000);
  assert.equal(r.profit, 20000 - 2000);
});

// --- margin() --------------------------------------------------------------

test('margin() — persentase profit/revenue', () => {
  const ctx = makeCtx();
  assert.equal(ctx.ProfitEngine.margin(100000, 25000), 25);
});

test('margin() — revenue 0 -> 0 (tidak NaN/Infinity)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.ProfitEngine.margin(0, 5000), 0);
});

// --- summarize() -------------------------------------------------------

test('summarize() — jumlah trip/omzet/untung/marginPct dari daftar transaksi', () => {
  const ctx = makeCtx();
  const r = ctx.ProfitEngine.summarize([
    { total: 10000, profit: 2000 },
    { total: 5000, profit: 1000 },
  ]);
  assert.equal(r.trip, 2);
  assert.equal(r.omzet, 15000);
  assert.equal(r.untung, 3000);
  assert.equal(r.marginPct, 20);
});

test('summarize() — daftar kosong -> semua 0, tidak throw', () => {
  const ctx = makeCtx();
  const r = ctx.ProfitEngine.summarize([]);
  assert.equal(r.trip, 0);
  assert.equal(r.omzet, 0);
  assert.equal(r.untung, 0);
  assert.equal(r.marginPct, 0);
});

// --- recommendPrice() — delegasi ke PriceReko.roundNice ---------------------

test('recommendPrice() — (modal+transport)*(1+margin%) dibulatkan lewat PriceReko.roundNice', () => {
  const ctx = makeCtx();
  const r = ctx.ProfitEngine.recommendPrice({ modal: 10000, transport: 2000, marginPct: 20 });
  assert.equal(r.base, 12000);
  assert.equal(r.result, ctx.PriceReko.roundNice(12000 * 1.2));
});

test('recommendPrice() — input kosong dianggap 0, tidak throw', () => {
  const ctx = makeCtx();
  const r = ctx.ProfitEngine.recommendPrice({});
  assert.equal(r.base, 0);
  assert.equal(r.result, 0);
});
