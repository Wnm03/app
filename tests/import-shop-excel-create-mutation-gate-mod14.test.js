'use strict';
// tests/import-shop-excel-create-mutation-gate-mod14.test.js — Modul 14
// (modules/shop/cobek-io.js, ImportShopExcel.commit(), sesi ini): reroute
// titik TULIS `D.products.push({...object literal...})` mentah (create
// produk BARU saat Import Excel .xlsx, target 'etalase') lewat
// ProductRepository.createProduct()+saveProduct() (SSOT yang SUDAH ADA
// sejak Tahap 4/6, dipakai Etalase.save()/applyTxShopStockFromTx() Modul
// 11/ShopDataIO.commitShopRows() Modul 13) — menutup titik TERAKHIR yang
// masih bypass SSOT untuk create produk (lihat CHANGELOG-MODUL14.md).
//
// Cakupan (pola sama dgn tests/product-csv-import-create-mutation-gate-
// mod13.test.js, disesuaikan API ImportShopExcel — commit() tidak balikin
// object {ok,created,updated}, tapi update this.parsedRows/D.products
// langsung + toast()):
//   A. Create dari Import Excel (target etalase) — lewat
//      ProductRepository.createProduct()+saveProduct() (di-spy), field
//      hasil identik perilaku lama + default field baru (beratPerUnit/
//      panjang/lebar/tinggi/ownership) konsisten Etalase.save()/Modul 11/13.
//   B. Update produk existing — TIDAK berubah (gate mutateSet* sudah ada
//      sejak Modul 3-5), createProduct() TIDAK dipanggil.
//   C. Duplicate ID — id generator lokal ('prod_'+Date.now()+'_'+uid())
//      TIDAK berubah, dites via regex + batch 50+ baris tidak tabrakan.
//   D. Duplicate nama — aturan match-by-name existing (dedup) tetap sama.
//   E. Batch import 50+ produk — semua baris ter-create, 0 tabrakan id.
//   F. Rollback — createProduct()/saveProduct() gagal (simulasi) ->
//      fallback raw push, baris tidak hilang.
//   G. Fallback tanpa ProductRepository — object literal mentah PERSIS
//      sama seperti sebelum Modul 14 (juga dicover 97+ test existing di
//      tests/import-shop-excel-header-alias.test.js yang tetap PASS).
//   H. Backward compatibility — hasil akhir field & format toast SAMA
//      PERSIS nilai yang dulu ditulis object literal langsung.
//   I. Target 'produsen' — TIDAK disentuh sesi ini (di luar scope
//      ProductRepository), create produsen tetap object literal lama.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadIo(D, extra = {}) {
  return loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-io.js'],
    {
      D,
      resolveShopKategori: extra.resolveShopKategori || (() => ''),
      escapeHtml: (s) => String(s),
      fmtFull: (n) => String(n),
      toast: () => {},
      save: () => {},
      closeModal: () => {},
      openModal: () => {},
      // cobek-io.js mendefinisikan renderProductList()/renderProdusenList()
      // SENDIRI (memanggil Etalase/PriceRekoWidget/StockRekoWidget/Produsen
      // — objek DOM-rendering di bagian lain file yang tidak di-load di
      // sini) — jadi di-stub via dependensinya, bukan lewat override nama
      // fungsi (fungsi top-level file MENIMPA global yang diinject dgn nama
      // sama, pola sama dgn tests/import-shop-excel-header-alias.test.js).
      Etalase: { renderList: () => {}, renderKategoriList: () => {}, renderModalStat: () => {} },
      PriceRekoWidget: { render: () => {} },
      StockRekoWidget: { render: () => {} },
      Produsen: { renderList: () => {} },
      uid: extra.uid || (() => { let n = 0; return () => 'uid_' + (++n); })(),
      ...extra.globals,
    },
    ['ProductRepository', 'ImportShopExcel'],
  );
}

function makeD(overrides = {}) {
  return { products: [], cobekKategori: [], produsen: [], accounts: [], ...overrides };
}

function commitRows(ctx, target, rows) {
  ctx.ImportShopExcel.target = target;
  ctx.ImportShopExcel.parsedRows = rows;
  ctx.ImportShopExcel.commit();
}

// === A. Create dari Import Excel (target etalase) ============================

test('integrasi: ImportShopExcel.commit() create produk baru — lewat ProductRepository.createProduct()+saveProduct()', () => {
  const D = makeD();
  const ctx = loadIo(D);
  let createCalls = 0, saveCalls = 0;
  const origCreate = ctx.ProductRepository.createProduct;
  const origSave = ctx.ProductRepository.saveProduct;
  ctx.ProductRepository.createProduct = function (...args) { createCalls++; return origCreate.apply(ctx.ProductRepository, args); };
  ctx.ProductRepository.saveProduct = function (...args) { saveCalls++; return origSave.apply(ctx.ProductRepository, args); };

  commitRows(ctx, 'etalase', [
    { name: 'Produk Baru', kategori: '', produsen: '', stock: 10, hargaBeli: 1000, hargaJual: 1500, hargaReseller: 1200, diskonPersen: 0 },
  ]);

  assert.equal(createCalls, 1, 'createProduct() harus dipanggil 1x');
  assert.equal(saveCalls, 1, 'saveProduct() harus dipanggil 1x');
  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.name, 'Produk Baru');
  assert.equal(p.stock, 10);
  assert.equal(p.hargaBeli, 1000);
  assert.equal(p.hargaJual, 1500);
  assert.equal(p.hargaReseller, 1200);
  assert.equal(p.diskonPersen, 0);
  assert.equal(p.produsenId, '');
  assert.equal(Object.keys(p.hargaByProdusen).length, 0);
  // Default field baru dari createProduct() — konsisten dgn produk yang
  // dibuat lewat Etalase.save()/Modul 11/13, bukan lagi object literal parsial.
  assert.equal(p.beratPerUnit, 0);
  assert.equal(p.panjang, 0);
  assert.equal(p.lebar, 0);
  assert.equal(p.tinggi, 0);
  assert.equal(p.ownership, 'SELF');
});

test('integrasi: create produk baru dgn kategori & produsen match — dipetakan ke kategoriId/produsenId', () => {
  const D = makeD({ produsen: [{ id: 'prd1', name: 'CV Merapi Jaya' }] });
  const ctx = loadIo(D, { resolveShopKategori: (name) => (name === 'Lumpang' ? 'kat1' : '') });
  commitRows(ctx, 'etalase', [
    { name: 'Lumpang 10cm', kategori: 'Lumpang', produsen: 'CV Merapi Jaya', stock: 5, hargaBeli: 20000, hargaJual: 30000, hargaReseller: null, diskonPersen: 0 },
  ]);
  assert.equal(D.products[0].kategoriId, 'kat1');
  assert.equal(D.products[0].produsenId, 'prd1');
});

test('integrasi: hargaReseller null — default null, sama perilaku lama', () => {
  const D = makeD();
  const ctx = loadIo(D);
  commitRows(ctx, 'etalase', [
    { name: 'Tanpa Reseller', kategori: '', produsen: '', stock: 1, hargaBeli: 100, hargaJual: 150, hargaReseller: null, diskonPersen: 0 },
  ]);
  assert.equal(D.products[0].hargaReseller, null);
});

// === B. Update produk existing — TIDAK berubah ===============================

test('update produk existing — createProduct()/saveProduct() TIDAK dipanggil, gate mutateSet* (Modul 3-5) tetap jalan', () => {
  const D = makeD({
    products: [{ id: 'p1', name: 'Sudah Ada', stock: 2, hargaBeli: 10, hargaJual: 20, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {} }],
  });
  const ctx = loadIo(D);
  let createCalls = 0;
  const orig = ctx.ProductRepository.createProduct;
  ctx.ProductRepository.createProduct = function (...args) { createCalls++; return orig.apply(ctx.ProductRepository, args); };
  commitRows(ctx, 'etalase', [
    { name: 'sudah ada', kategori: '', produsen: '', stock: 9, hargaBeli: 99, hargaJual: 20, hargaReseller: null, diskonPersen: 0 },
  ]);
  assert.equal(createCalls, 0);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].id, 'p1');
  assert.equal(D.products[0].stock, 9);
  assert.equal(D.products[0].hargaBeli, 99);
});

// === C. Duplicate ID / id generator lokal ====================================

test('id: produk baru pakai format lokal prod_<ms>_<uid>, bukan _genId() polos', () => {
  const D = makeD();
  const ctx = loadIo(D);
  commitRows(ctx, 'etalase', [
    { name: 'Cek Id', kategori: '', produsen: '', stock: 1, hargaBeli: 100, hargaJual: 150, hargaReseller: null, diskonPersen: 0 },
  ]);
  assert.match(D.products[0].id, /^prod_\d+_uid_\d+$/);
});

test('duplicate ID: banyak baris baru dalam SATU commit (forEach sinkron) — 0 tabrakan id', () => {
  const D = makeD();
  const ctx = loadIo(D);
  const rows = Array.from({ length: 20 }, (_, i) => ({ name: 'Produk ' + i, kategori: '', produsen: '', stock: 1, hargaBeli: 100, hargaJual: 150, hargaReseller: null, diskonPersen: 0 }));
  commitRows(ctx, 'etalase', rows);
  assert.equal(D.products.length, 20);
  const ids = new Set(D.products.map((p) => p.id));
  assert.equal(ids.size, 20, 'semua id harus unik, 0 tabrakan');
});

// === D. Duplicate nama ========================================================

test('duplicate nama (case-insensitive) — match produk existing, di-update bukan produk kedua', () => {
  const D = makeD({
    products: [{ id: 'p1', name: 'Barang X', stock: 5, hargaBeli: 10, hargaJual: 20, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {} }],
  });
  const ctx = loadIo(D);
  commitRows(ctx, 'etalase', [
    { name: 'barang x', kategori: '', produsen: '', stock: 8, hargaBeli: 15, hargaJual: 20, hargaReseller: null, diskonPersen: 0 },
  ]);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].id, 'p1');
  assert.equal(D.products[0].stock, 8);
});

// === E. Batch import 50+ produk ===============================================

test('batch import 60 produk baru — semua ter-create, 0 tabrakan id, field per-baris tidak tertukar', () => {
  const D = makeD();
  const ctx = loadIo(D);
  const rows = Array.from({ length: 60 }, (_, i) => ({ name: 'Batch Produk ' + i, kategori: '', produsen: '', stock: i, hargaBeli: 100 + i, hargaJual: 200 + i, hargaReseller: null, diskonPersen: 0 }));
  commitRows(ctx, 'etalase', rows);
  assert.equal(D.products.length, 60);
  const ids = new Set(D.products.map((p) => p.id));
  assert.equal(ids.size, 60);
  assert.equal(D.products[0].name, 'Batch Produk 0');
  assert.equal(D.products[0].stock, 0);
  assert.equal(D.products[59].name, 'Batch Produk 59');
  assert.equal(D.products[59].stock, 59);
  assert.equal(D.products[30].hargaBeli, 130);
});

// === F. Rollback ===============================================================

test('rollback: createProduct() gagal (simulasi) -> fallback raw push, baris tidak hilang, batch tetap lanjut', () => {
  const D = makeD();
  const ctx = loadIo(D);
  ctx.ProductRepository.createProduct = () => ({ ok: false, reason: 'simulasi gagal' });
  commitRows(ctx, 'etalase', [
    { name: 'Tetap Masuk', kategori: '', produsen: '', stock: 5, hargaBeli: 50, hargaJual: 70, hargaReseller: null, diskonPersen: 0 },
  ]);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].name, 'Tetap Masuk');
  assert.match(D.products[0].id, /^prod_\d+_uid_\d+$/);
});

test('rollback: saveProduct() menolak (simulasi id ganda) -> fallback push newProduct langsung, baris tidak hilang', () => {
  const D = makeD();
  const ctx = loadIo(D);
  ctx.ProductRepository.saveProduct = () => ({ ok: false, reason: 'simulasi id ganda' });
  commitRows(ctx, 'etalase', [
    { name: 'Fallback SaveProduct', kategori: '', produsen: '', stock: 2, hargaBeli: 20, hargaJual: 30, hargaReseller: null, diskonPersen: 0 },
  ]);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].name, 'Fallback SaveProduct');
});

// === G. Fallback tanpa ProductRepository ======================================

test('fallback: tanpa ProductRepository, object literal mentah PERSIS sama seperti sebelum Modul 14', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/shop/cobek-io.js'],
    {
      D,
      resolveShopKategori: () => '',
      escapeHtml: (s) => String(s),
      fmtFull: (n) => String(n),
      toast: () => {},
      save: () => {},
      closeModal: () => {},
      openModal: () => {},
      Etalase: { renderList: () => {}, renderKategoriList: () => {}, renderModalStat: () => {} },
      PriceRekoWidget: { render: () => {} },
      StockRekoWidget: { render: () => {} },
      Produsen: { renderList: () => {} },
      uid: () => 'uidx',
    },
    ['ImportShopExcel'],
  );
  commitRows(ctx, 'etalase', [
    { name: 'Fallback Produk', kategori: '', produsen: '', stock: 4, hargaBeli: 300, hargaJual: 400, hargaReseller: null, diskonPersen: 0 },
  ]);
  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.name, 'Fallback Produk');
  assert.equal(p.stock, 4);
  assert.equal(p.hargaReseller, null);
  assert.match(p.id, /^prod_\d+_uidx$/);
  // Tanpa ProductRepository, TIDAK ADA default field tambahan (ownership dst.)
  assert.equal('ownership' in p, false);
  assert.equal('beratPerUnit' in p, false);
});

// === H. Backward compatibility ================================================

test('backward compat: hasil akhir field produk baru SAMA PERSIS nilai yang dulu ditulis object literal langsung', () => {
  const D = makeD();
  const ctx = loadIo(D, { resolveShopKategori: () => 'kat9' });
  commitRows(ctx, 'etalase', [
    { name: 'BC Produk', kategori: 'Kat', produsen: '', stock: 7, hargaBeli: 111, hargaJual: 222, hargaReseller: 150, diskonPersen: 0 },
  ]);
  const p = D.products[0];
  assert.equal(p.name, 'BC Produk');
  assert.equal(p.stock, 7);
  assert.equal(p.hargaBeli, 111);
  assert.equal(p.hargaJual, 222);
  assert.equal(p.hargaReseller, 150);
  assert.equal(p.diskonPersen, 0);
  assert.equal(p.kategoriId, 'kat9');
  assert.equal(p.produsenId, '');
  assert.equal(Object.keys(p.hargaByProdusen).length, 0);
});

test('backward compat: toast summary format tidak berubah (X produk baru, Y diperbarui)', () => {
  const D = makeD();
  let toastMsg = '';
  const ctx = loadIo(D, { globals: { toast: (m) => { toastMsg = m; } } });
  commitRows(ctx, 'etalase', [
    { name: 'X', kategori: '', produsen: '', stock: 1, hargaBeli: 1, hargaJual: 1, hargaReseller: null, diskonPersen: 0 },
  ]);
  assert.match(toastMsg, /1 produk baru, 0 diperbarui/);
});

// === I. Target 'produsen' — di luar scope, TIDAK disentuh sesi ini ===========

test('target produsen: create produsen baru TETAP object literal lama (di luar scope ProductRepository)', () => {
  const D = makeD();
  const ctx = loadIo(D);
  let createCalls = 0;
  const orig = ctx.ProductRepository.createProduct;
  ctx.ProductRepository.createProduct = function (...args) { createCalls++; return orig.apply(ctx.ProductRepository, args); };
  commitRows(ctx, 'produsen', [
    { name: 'CV Baru', kontak: '0812', catatan: '', jarakKm: 5, biayaPerKm: 1000 },
  ]);
  assert.equal(createCalls, 0, 'ProductRepository TIDAK dipakai utk create produsen');
  assert.equal(D.produsen.length, 1);
  assert.match(D.produsen[0].id, /^prd_\d+_uid_\d+$/);
});
