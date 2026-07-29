'use strict';
// tests/purchase-engine.test.js — cakupan modules/shop/purchase-engine.js
// (S198, Business Engine untuk Shop). PurchaseEngine 100% pure (tidak
// panggil fungsi global lain), jadi loadSource() dipanggil tanpa D/
// extraGlobals tambahan — pola paling sederhana, sama seperti
// tests/ownership-engine.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(['modules/shop/purchase-engine.js'], {}, ['PurchaseEngine']);
}

// --- recordCost ---------------------------------------------------------

test('recordCost() — stok naik & hargaBeli>0 -> recorded, cost=delta*hargaBeli', () => {
  const ctx = makeCtx();
  const r = ctx.PurchaseEngine.recordCost({ prevStock: 2, newStock: 7, hargaBeli: 5000 });
  assert.equal(r.delta, 5);
  assert.equal(r.recorded, true);
  assert.equal(r.cost, 25000);
});

test('recordCost() — stok turun/tetap -> tidak dicatat sbg pembelian', () => {
  const ctx = makeCtx();
  const r1 = ctx.PurchaseEngine.recordCost({ prevStock: 10, newStock: 4, hargaBeli: 5000 });
  assert.equal(r1.recorded, false);
  assert.equal(r1.cost, 0);
  const r2 = ctx.PurchaseEngine.recordCost({ prevStock: 5, newStock: 5, hargaBeli: 5000 });
  assert.equal(r2.recorded, false);
});

test('recordCost() — hargaBeli 0/kosong -> tidak dicatat walau stok naik', () => {
  const ctx = makeCtx();
  const r = ctx.PurchaseEngine.recordCost({ prevStock: 0, newStock: 5, hargaBeli: 0 });
  assert.equal(r.recorded, false);
  assert.equal(r.cost, 0);
});

test('recordCost() — input negatif/NaN dipaksa 0, tidak throw', () => {
  const ctx = makeCtx();
  const r = ctx.PurchaseEngine.recordCost({ prevStock: -3, newStock: 'x', hargaBeli: -100 });
  assert.equal(r.prevStock, 0);
  assert.equal(r.newStock, 0);
  assert.equal(r.hargaBeli, 0);
  assert.equal(r.delta, 0);
  assert.equal(r.recorded, false);
});

// --- produsenPrice --------------------------------------------------------

test('produsenPrice() — balikin harga dari hargaByProdusen kalau ada', () => {
  const ctx = makeCtx();
  const product = { hargaByProdusen: { pr1: 8000 } };
  assert.equal(ctx.PurchaseEngine.produsenPrice(product, 'pr1'), 8000);
});

test('produsenPrice() — null kalau belum ada histori/produk kosong', () => {
  const ctx = makeCtx();
  assert.equal(ctx.PurchaseEngine.produsenPrice({ hargaByProdusen: {} }, 'pr1'), null);
  assert.equal(ctx.PurchaseEngine.produsenPrice(null, 'pr1'), null);
  assert.equal(ctx.PurchaseEngine.produsenPrice({ hargaByProdusen: { pr1: 8000 } }, null), null);
});

// --- produsenProducts -----------------------------------------------------

test('produsenProducts() — filter produk yang punya histori harga dari produsen tsb', () => {
  const ctx = makeCtx();
  const products = [
    { id: 'a', hargaByProdusen: { pr1: 1000 } },
    { id: 'b', hargaByProdusen: { pr2: 2000 } },
    { id: 'c', hargaByProdusen: {} },
  ];
  const out = ctx.PurchaseEngine.produsenProducts({ id: 'pr1' }, products);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'a');
});

test('produsenProducts() — balikin [] kalau produsen null', () => {
  const ctx = makeCtx();
  assert.deepEqual(Array.from(ctx.PurchaseEngine.produsenProducts(null, [{ id: 'a' }])), []);
});

// --- restockPlan / estimatedCost ------------------------------------------

test('restockPlan() — hanya item dgn restockQty>0 yang dihitung, totalQty dijumlah', () => {
  const ctx = makeCtx();
  const scan = [
    { product: { id: 'a' }, restockQty: 3 },
    { product: { id: 'b' }, restockQty: 0 },
    { product: { id: 'c' }, restockQty: 5 },
  ];
  const plan = ctx.PurchaseEngine.restockPlan(scan);
  assert.equal(plan.itemCount, 2);
  assert.equal(plan.totalQty, 8);
});

test('estimatedCost() — total modal dari restockQty x hargaBeli tiap item', () => {
  const ctx = makeCtx();
  const scan = [
    { product: { id: 'a', hargaBeli: 1000 }, restockQty: 3 },
    { product: { id: 'b', hargaBeli: 2000 }, restockQty: 2 },
  ];
  const r = ctx.PurchaseEngine.estimatedCost(scan);
  assert.equal(r.totalCost, 7000);
  assert.equal(r.totalQty, 5);
});

test('estimatedCost() — item tanpa hargaBeli dianggap 0, tidak throw', () => {
  const ctx = makeCtx();
  const scan = [{ product: { id: 'a' }, restockQty: 3 }];
  const r = ctx.PurchaseEngine.estimatedCost(scan);
  assert.equal(r.totalCost, 0);
});
