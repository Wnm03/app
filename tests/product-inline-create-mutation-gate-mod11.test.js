'use strict';
// tests/product-inline-create-mutation-gate-mod11.test.js — Modul 11
// (cobek-tx-cart.js applyTxShopStockFromTx(), sesi ini): reroute titik TULIS
// `D.products.push({...object literal...})` mentah (create produk baru
// inline saat user isi keranjang stok "Produk Baru" di form Transaksi) lewat
// ProductRepository.createProduct() (SSOT yang SUDAH ADA sejak Tahap 4,
// dipakai Etalase.save() sejak Tahap 6).
//
// Lanjutan langsung Modul 3-10 — bukan gate BARU (0 method baru di
// ProductRepository), melainkan menutup SATU titik terakhir yang masih
// bypass SSOT di applyTxShopStockFromTx() — fungsi ini SUDAH memakai
// ProductRepository di 4 tempat lain (mutateStockDelta/mutateSetPrice/
// mutateSetField/mutateSetHargaProdusen, sejak Modul 5/6), hanya create
// awal produk baru yang masih object literal mentah sebelum sesi ini.
//
// Cakupan:
//   A. Integrasi — create produk baru beneran lewat ProductRepository.
//      createProduct() (di-spy), field hasil akhir identik perilaku lama
//      (stock/hargaBeli/hargaJual/hargaReseller/diskonPersen/kategoriId/
//      produsenId/hargaByProdusen), PLUS default field baru (beratPerUnit/
//      panjang/lebar/tinggi/ownership) konsisten dgn produk yang dibuat
//      lewat Etalase.save() (Tahap 6) — bukan business logic baru, cuma
//      menyamakan mekanisme create.
//   B. id generator TETAP lokal ('prod_'+Date.now()+'_'+uid()), BUKAN dari
//      ProductRepository._genId() — dicek via regex & via skenario >1 produk
//      baru dalam satu applyTxShopStockFromTx() (harus tidak tabrakan id).
//   C. Fallback — tanpa ProductRepository, object literal mentah PERSIS
//      sama seperti sebelum Modul 11 (guard typeof).
//   D. Produk existing (bukan isNew, atau isNew tapi nama sudah match) TIDAK
//      lewat createProduct() sama sekali — 0 perubahan jalur itu.

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadSource } = require('./helpers/loadSource');

function setLetGlobal(ctx, name, value) {
  new vm.Script(`${name} = ${JSON.stringify(value)};`, { filename: 'inject-let-global' }).runInContext(ctx);
}

function loadTxCart(D, extra = {}) {
  return loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-tx-cart.js'],
    {
      D,
      uid: extra.uid || (() => 'uid_' + Math.random().toString(36).slice(2)),
      toast: () => {},
      renderProductList: () => {},
      fmtFull: (n) => String(n),
      ...extra.globals,
    },
    ['ProductRepository'],
  );
}

// === A. Integrasi ===========================================================

test('integrasi: applyTxShopStockFromTx() create produk baru — lewat ProductRepository.createProduct()', () => {
  const D = { products: [], cobekKategori: [], transactions: [{ id: 'tx1' }] };
  const ctx = loadTxCart(D);
  let calls = 0;
  const orig = ctx.ProductRepository.createProduct;
  ctx.ProductRepository.createProduct = function (...args) { calls++; return orig.apply(ctx.ProductRepository, args); };

  setLetGlobal(ctx, 'curShopStockCart', [
    { isNew: true, name: 'Produk Baru', kategoriInput: '', qty: 10, hargaBeli: 1000, hargaJual: 1500, produsenId: 'prd9' },
  ]);
  ctx.applyTxShopStockFromTx('tx1', '', null);

  assert.equal(calls, 1, 'ProductRepository.createProduct() harus dipanggil 1x');
  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.name, 'Produk Baru');
  assert.equal(p.stock, 10); // 0 (create) + 10 (mutateStockDelta)
  assert.equal(p.hargaBeli, 1000);
  assert.equal(p.hargaJual, 1500);
  assert.equal(p.hargaReseller, null);
  assert.equal(p.diskonPersen, 0);
  assert.equal(p.produsenId, 'prd9');
  assert.equal(p.hargaByProdusen.prd9, 1000);
  // Default field baru dari createProduct() — konsisten dgn produk yang
  // dibuat lewat Etalase.save() (Tahap 6), bukan lagi object literal parsial.
  assert.equal(p.beratPerUnit, 0);
  assert.equal(p.panjang, 0);
  assert.equal(p.lebar, 0);
  assert.equal(p.tinggi, 0);
  assert.equal(p.ownership, 'SELF');
});

test('integrasi: produk lain di D.products tidak ikut berubah', () => {
  const D = {
    products: [{ id: 'p1', name: 'Lama', stock: 5, hargaBeli: 1, hargaJual: 2, kategoriId: '', produsenId: '', hargaByProdusen: {} }],
    cobekKategori: [],
    transactions: [{ id: 'tx1' }],
  };
  const ctx = loadTxCart(D);
  setLetGlobal(ctx, 'curShopStockCart', [
    { isNew: true, name: 'Produk Kedua', kategoriInput: '', qty: 3, hargaBeli: 500, hargaJual: 700, produsenId: '' },
  ]);
  ctx.applyTxShopStockFromTx('tx1', '', null);
  assert.equal(D.products.length, 2);
  assert.equal(D.products[0].id, 'p1');
  assert.equal(D.products[0].stock, 5);
});

// === B. id generator lokal (bukan _genId() polos) ===========================

test('id: produk baru pakai format lokal prod_<ms>_<uid>, bukan prod_<ms> polos', () => {
  const D = { products: [], cobekKategori: [], transactions: [{ id: 'tx1' }] };
  const ctx = loadTxCart(D);
  setLetGlobal(ctx, 'curShopStockCart', [
    { isNew: true, name: 'Cek Id', kategoriInput: '', qty: 1, hargaBeli: 100, hargaJual: 150, produsenId: '' },
  ]);
  ctx.applyTxShopStockFromTx('tx1', '', null);
  assert.match(D.products[0].id, /^prod_\d+_uid_/);
});

test('id: 2 produk baru berbeda nama dalam 1 keranjang — id TIDAK tabrakan meski dibuat pada tick yang sama', () => {
  const D = { products: [], cobekKategori: [], transactions: [{ id: 'tx1' }] };
  let n = 0;
  const ctx = loadTxCart(D, { uid: () => 'u' + (++n) });
  setLetGlobal(ctx, 'curShopStockCart', [
    { isNew: true, name: 'Produk A', kategoriInput: '', qty: 1, hargaBeli: 100, hargaJual: 150, produsenId: '' },
    { isNew: true, name: 'Produk B', kategoriInput: '', qty: 2, hargaBeli: 200, hargaJual: 250, produsenId: '' },
  ]);
  ctx.applyTxShopStockFromTx('tx1', '', null);
  assert.equal(D.products.length, 2);
  assert.notEqual(D.products[0].id, D.products[1].id);
});

// === C. Fallback (tanpa ProductRepository) ==================================

test('fallback: tanpa ProductRepository, object literal mentah PERSIS sama seperti sebelum Modul 11', () => {
  const D = { products: [], cobekKategori: [], transactions: [{ id: 'tx1' }] };
  const ctx = loadSource(
    ['modules/shop/cobek-tx-cart.js'],
    { D, uid: () => 'uidx', toast: () => {}, renderProductList: () => {}, fmtFull: (n) => String(n) },
    [],
  );
  setLetGlobal(ctx, 'curShopStockCart', [
    { isNew: true, name: 'Fallback Produk', kategoriInput: '', qty: 4, hargaBeli: 300, hargaJual: 400, produsenId: '' },
  ]);
  ctx.applyTxShopStockFromTx('tx1', '', null);
  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.name, 'Fallback Produk');
  assert.equal(p.stock, 4);
  assert.equal(p.hargaReseller, null);
  assert.equal(p.diskonPersen, 0);
  assert.match(p.id, /^prod_\d+_uidx$/);
  // Tanpa ProductRepository, TIDAK ADA default field tambahan (ownership dst.)
  assert.equal('ownership' in p, false);
});

// === D. Produk existing tidak lewat createProduct() =========================

test('produk existing (dedup by name, isNew tapi sudah ada) — createProduct() TIDAK dipanggil', () => {
  const D = {
    products: [{ id: 'p1', name: 'Sudah Ada', stock: 2, hargaBeli: 10, hargaJual: 20, kategoriId: '', produsenId: '', hargaByProdusen: {} }],
    cobekKategori: [],
    transactions: [{ id: 'tx1' }],
  };
  const ctx = loadTxCart(D);
  let calls = 0;
  const orig = ctx.ProductRepository.createProduct;
  ctx.ProductRepository.createProduct = function (...args) { calls++; return orig.apply(ctx.ProductRepository, args); };
  setLetGlobal(ctx, 'curShopStockCart', [
    { isNew: true, name: 'Sudah Ada', kategoriInput: '', qty: 3, hargaBeli: 15, hargaJual: 25, produsenId: '' },
  ]);
  ctx.applyTxShopStockFromTx('tx1', '', null);
  assert.equal(calls, 0);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].stock, 5); // 2 + 3, produk lama yang di-restock
});

test('produk existing (bukan isNew, pilih dari dropdown) — createProduct() TIDAK dipanggil', () => {
  const D = {
    products: [{ id: 'p1', name: 'Barang X', stock: 10, hargaBeli: 100, hargaJual: 150, kategoriId: '', produsenId: '', hargaByProdusen: {} }],
    cobekKategori: [],
    transactions: [{ id: 'tx1' }],
  };
  const ctx = loadTxCart(D);
  let calls = 0;
  const orig = ctx.ProductRepository.createProduct;
  ctx.ProductRepository.createProduct = function (...args) { calls++; return orig.apply(ctx.ProductRepository, args); };
  setLetGlobal(ctx, 'curShopStockCart', [
    { isNew: false, productId: 'p1', kategoriInput: '', qty: 5, hargaBeli: 100, hargaJual: 150, produsenId: '' },
  ]);
  ctx.applyTxShopStockFromTx('tx1', '', null);
  assert.equal(calls, 0);
  assert.equal(D.products[0].stock, 15);
});
