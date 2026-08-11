'use strict';
// tests/shop-engine-tahap2-wiring.test.js — Tahap 2 (Generic Shop Engine,
// Pricing & Inventory Integration). Cakupan: Etalase.totalModalStok()/
// totalNilaiJualStok() (modules/shop/cobek-etalase.js, kartu ringkasan
// Dashboard tab Shop cModalStok/cNilaiJualStok) & InventoryEngine.
// totalModalStok(products)/totalNilaiJualStok(products) (modules/shop/
// inventory-engine.js, dipakai ShopBusinessEnginePresenter.summary() yang
// mengisi Dashboard Hub #shopBusinessEngineGrid & tab Laporan
// #shopBizEngineBody) — sekarang delegasi ke InventoryService/PricingService
// (Tahap 1) kalau dimuat, dgn fallback ke rumus asli kalau belum.
//
// TARGET UTAMA sesi ini: hasil HARUS 100% sama baik PricingService/
// InventoryService dimuat maupun tidak (backward compatible, 0 perubahan
// output) — pola harness sama tests/generic-shop-engine.test.js &
// tests/inventory-engine.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const BASE_FILES = [
  'modules/shared/ownership-engine.js',
  'modules/shop/cobek-etalase.js',
  'modules/shop/cobek-pricing.js',
  'modules/shop/purchase-engine.js',
  'modules/shop/inventory-engine.js',
  'modules/shop/profit-engine.js',
];

const GENERIC_FILES = [
  'modules/shop/generic/pricing-service.js',
  'modules/shop/generic/inventory-service.js',
];

function makeProducts() {
  return [
    { id: 'p1', stock: 10, hargaBeli: 1000, hargaJual: 1500, ownership: 'SELF' },
    { id: 'p2', stock: 5, hargaBeli: 2000, hargaJual: 3000, ownership: 'SELF' },
    { id: 'p3', stock: 100, hargaBeli: 500, hargaJual: 900, ownership: 'INVESTOR' }, // non-SELF, harus dikecualikan
  ];
}

function makeCtx(withGeneric, D) {
  const files = withGeneric ? BASE_FILES.concat(GENERIC_FILES) : BASE_FILES;
  const exports = ['Etalase', 'InventoryEngine'].concat(withGeneric ? ['PricingService', 'InventoryService'] : []);
  return loadSource(files, { D }, exports);
}

test('Etalase.totalModalStok()/totalNilaiJualStok() — hasil sama persis dgn/tanpa InventoryService dimuat', () => {
  const D1 = { products: makeProducts(), cobekKategori: [], produsen: [], cobek: [] };
  const D2 = { products: makeProducts(), cobekKategori: [], produsen: [], cobek: [] };
  const ctxNoGeneric = makeCtx(false, D1);
  const ctxWithGeneric = makeCtx(true, D2);

  assert.equal(ctxNoGeneric.Etalase.totalModalStok(), 20000); // 10*1000 + 5*2000 (p3 dikecualikan)
  assert.equal(ctxWithGeneric.Etalase.totalModalStok(), 20000);
  assert.equal(ctxNoGeneric.Etalase.totalModalStok(), ctxWithGeneric.Etalase.totalModalStok());

  assert.equal(ctxNoGeneric.Etalase.totalNilaiJualStok(), 30000); // 10*1500 + 5*3000
  assert.equal(ctxWithGeneric.Etalase.totalNilaiJualStok(), 30000);
  assert.equal(ctxNoGeneric.Etalase.totalNilaiJualStok(), ctxWithGeneric.Etalase.totalNilaiJualStok());
});

test('InventoryEngine.totalModalStok(products)/totalNilaiJualStok(products) — hasil sama persis dgn/tanpa InventoryService dimuat', () => {
  const products = makeProducts();
  const D = { products, cobekKategori: [], produsen: [], cobek: [] };
  const ctxNoGeneric = makeCtx(false, D);
  const ctxWithGeneric = makeCtx(true, D);

  assert.equal(ctxNoGeneric.InventoryEngine.totalModalStok(products), 20000);
  assert.equal(ctxWithGeneric.InventoryEngine.totalModalStok(products), 20000);

  assert.equal(ctxNoGeneric.InventoryEngine.totalNilaiJualStok(products), 30000);
  assert.equal(ctxWithGeneric.InventoryEngine.totalNilaiJualStok(products), 30000);
});

test('InventoryEngine.totalModalStok()/totalNilaiJualStok() tanpa parameter — tetap fallback ke Etalase, tidak terpengaruh InventoryService', () => {
  const D = { products: makeProducts(), cobekKategori: [], produsen: [], cobek: [] };
  const ctx = makeCtx(true, D);
  assert.equal(ctx.InventoryEngine.totalModalStok(), ctx.Etalase.totalModalStok());
  assert.equal(ctx.InventoryEngine.totalNilaiJualStok(), ctx.Etalase.totalNilaiJualStok());
});

test('Filter ownership SELF tetap diterapkan lewat jalur InventoryService (produk non-SELF tetap dikecualikan)', () => {
  const products = [
    { id: 'a', stock: 1, hargaBeli: 100000, hargaJual: 200000, ownership: 'CUSTOMER' },
    { id: 'b', stock: 1, hargaBeli: 100000, hargaJual: 200000, ownership: 'THIRD_PARTY' },
    { id: 'c', stock: 1, hargaBeli: 100000, hargaJual: 200000, ownership: 'FAMILY' },
  ];
  const D = { products, cobekKategori: [], produsen: [], cobek: [] };
  const ctx = makeCtx(true, D);
  assert.equal(ctx.InventoryEngine.totalModalStok(products), 0);
  assert.equal(ctx.InventoryEngine.totalNilaiJualStok(products), 0);
  assert.equal(ctx.Etalase.totalModalStok(), 0);
  assert.equal(ctx.Etalase.totalNilaiJualStok(), 0);
});
