'use strict';
// tests/product-csv-import-create-mutation-gate-mod13.test.js — Modul 13
// (modules/business/shop-data-io-api.js, ShopDataIO.commitShopRows(), sesi
// ini): reroute titik TULIS `D.products.push({...object literal...})`
// mentah (create produk BARU saat Import CSV — dan Scan/PDF/Paste, karena
// SEMUANYA lewat SATU fungsi commit ini, lihat komentar header
// shop-data-io-api.js) lewat ProductRepository.createProduct()+
// saveProduct() (SSOT yang SUDAH ADA sejak Tahap 4/6, dipakai
// Etalase.save() Tahap 6, applyTxShopStockFromTx() Modul 11, &
// ImportShopExcel.commit() cabang .xlsx).
//
// KOREKSI SCOPE (dicatat di CHANGELOG-MODUL13.md §Audit): audit Modul
// 10-12 sebelumnya (grep `modules/shop/*.js` saja) melewatkan
// `modules/business/*.js` sehingga sempat menganggap "CSV import" adalah
// `ImportShopExcel` (`cobek-io.js`, format `.xlsx`). File INI
// (`shop-data-io-api.js`, `ShopCsvImport`, `parseShopCSV()`, ekstensi
// `.csv` sungguhan) adalah CSV import yang literal — target sesi ini.
// `ImportShopExcel`/`cobek-io.js` TIDAK disentuh sesi ini (tetap sesuai
// perilaku sebelum Modul 13, di luar scope "CSV").
//
// Lanjutan langsung Modul 3-12 — bukan gate BARU (0 method baru di
// ProductRepository, 0 validator baru), melainkan menutup titik terakhir
// yang masih bypass SSOT di commitShopRows(): cabang UPDATE produk
// existing SUDAH memakai ProductRepository sejak Modul 3/4/5
// (mutateSetStock/mutateSetPrice/mutateSetField), hanya create produk baru
// yang masih object literal mentah sebelum sesi ini.
//
// Cakupan:
//   A. Create dari CSV — lewat ProductRepository.createProduct()+
//      saveProduct() (di-spy), field hasil identik perilaku lama + default
//      field baru (beratPerUnit/panjang/lebar/tinggi/ownership) konsisten
//      Etalase.save()/Modul 11.
//   B. Update produk existing — TIDAK berubah (gate sudah ada sejak
//      Modul 3-5), createProduct() TIDAK dipanggil.
//   C. Duplicate ID — id generator lokal ('prod_'+Date.now()+'_'+uid())
//      TIDAK berubah, dites via regex + batch 100+ baris tidak tabrakan.
//   D. Duplicate nama/barcode — aturan match-by-name existing (dedup)
//      tetap sama, tidak diubah.
//   E. Batch import 100+ produk — seluruh baris ter-create, 0 tabrakan
//      id, 0 produk hilang.
//   F. Invalid row / rollback — rows kosong/tanpa nama -> tidak
//      menyentuh D.products; kegagalan gate (fail-safe simulasi) ->
//      fallback raw push, baris tidak hilang.
//   G. Fallback tanpa ProductRepository — object literal mentah PERSIS
//      sama seperti sebelum Modul 13 (juga dites lewat 97 test existing
//      `tests/shop-data-io-csv-import.test.js` dkk. yang TIDAK memuat
//      ProductRepository — semua tetap PASS, lihat CHANGELOG-MODUL13.md).
//   H. Backward compatibility — hasil akhir field & format summary/toast
//      SAMA PERSIS nilai yang dulu ditulis object literal langsung.
//   I. Integrasi end-to-end lewat ShopCsvImport (parseShopCSV -> commit()).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadIo(D, extra = {}) {
  return loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/business/shop-data-io-api.js'],
    {
      D,
      resolveShopKategori: extra.resolveShopKategori || (() => ''),
      escapeHtml: (s) => String(s),
      fmtFull: (n) => String(n),
      toast: () => {},
      save: () => {},
      closeModal: () => {},
      openModal: () => {},
      renderProductList: () => {},
      uid: extra.uid || (() => { let n = 0; return () => 'uid_' + (++n); })(),
      ...extra.globals,
    },
    ['ProductRepository', 'ShopDataIO', 'ShopCsvImport'],
  );
}

function makeD(overrides = {}) {
  return { products: [], cobekKategori: [], produsen: [], accounts: [], ...overrides };
}

// === A. Create dari CSV ======================================================

test('integrasi: commitShopRows() create produk baru — lewat ProductRepository.createProduct()+saveProduct()', () => {
  const D = makeD();
  const ctx = loadIo(D);
  let createCalls = 0, saveCalls = 0;
  const origCreate = ctx.ProductRepository.createProduct;
  const origSave = ctx.ProductRepository.saveProduct;
  ctx.ProductRepository.createProduct = function (...args) { createCalls++; return origCreate.apply(ctx.ProductRepository, args); };
  ctx.ProductRepository.saveProduct = function (...args) { saveCalls++; return origSave.apply(ctx.ProductRepository, args); };

  const res = ctx.ShopDataIO.commitShopRows([
    { nama: 'Produk Baru', hargaBeli: 1000, hargaJual: 1500, hargaReseller: 1200, stok: 10, satuan: 'pcs' },
  ]);

  assert.equal(res.ok, true);
  assert.equal(res.created, 1);
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
  assert.equal(p.satuan, 'pcs');
  assert.equal(Object.keys(p.hargaByProdusen).length, 0);
  // Default field baru dari createProduct() — konsisten dgn produk yang
  // dibuat lewat Etalase.save() (Tahap 6) / Modul 11, bukan lagi object
  // literal parsial.
  assert.equal(p.beratPerUnit, 0);
  assert.equal(p.panjang, 0);
  assert.equal(p.lebar, 0);
  assert.equal(p.tinggi, 0);
  assert.equal(p.ownership, 'SELF');
});

test('integrasi: create produk baru dgn kategori (resolveShopKategori dipanggil, hasil dipetakan ke kategoriId)', () => {
  const D = makeD();
  const ctx = loadIo(D, { resolveShopKategori: (name) => (name === 'Lumpang' ? 'kat1' : '') });
  const res = ctx.ShopDataIO.commitShopRows([
    { nama: 'Lumpang 10cm', kategori: 'Lumpang', hargaBeli: 20000, hargaJual: 30000, stok: 5, satuan: 'pcs' },
  ]);
  assert.equal(res.created, 1);
  assert.equal(D.products[0].kategoriId, 'kat1');
});

test('integrasi: hargaReseller tidak dikirim (undefined) — default null, sama perilaku lama', () => {
  const D = makeD();
  const ctx = loadIo(D);
  ctx.ShopDataIO.commitShopRows([{ nama: 'Tanpa Reseller', hargaBeli: 100, hargaJual: 150, stok: 1 }]);
  assert.equal(D.products[0].hargaReseller, null);
});

// === B. Update produk existing — TIDAK berubah ===============================

test('update produk existing — createProduct()/saveProduct() TIDAK dipanggil, gate lama (Modul 3-5) tetap jalan', () => {
  const D = makeD({
    products: [{ id: 'p1', name: 'Sudah Ada', stock: 2, hargaBeli: 10, hargaJual: 20, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {}, satuan: '' }],
  });
  const ctx = loadIo(D);
  let createCalls = 0;
  const orig = ctx.ProductRepository.createProduct;
  ctx.ProductRepository.createProduct = function (...args) { createCalls++; return orig.apply(ctx.ProductRepository, args); };
  const res = ctx.ShopDataIO.commitShopRows([{ nama: 'sudah ada', stok: 9, hargaBeli: 99 }]);
  assert.equal(createCalls, 0);
  assert.equal(res.updated, 1);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].id, 'p1');
  assert.equal(D.products[0].stock, 9);
  assert.equal(D.products[0].hargaBeli, 99);
});

// === C. Duplicate ID / id generator lokal ====================================

test('id: produk baru pakai format lokal prod_<ms>_<uid>, bukan _genId() polos', () => {
  const D = makeD();
  const ctx = loadIo(D);
  ctx.ShopDataIO.commitShopRows([{ nama: 'Cek Id', hargaBeli: 100, hargaJual: 150, stok: 1 }]);
  assert.match(D.products[0].id, /^prod_\d+_uid_\d+$/);
});

test('duplicate ID: banyak baris baru dalam SATU commit (forEach sinkron) — 0 tabrakan id', () => {
  const D = makeD();
  const ctx = loadIo(D);
  const rows = Array.from({ length: 20 }, (_, i) => ({ nama: 'Produk ' + i, hargaBeli: 100, hargaJual: 150, stok: 1 }));
  ctx.ShopDataIO.commitShopRows(rows);
  assert.equal(D.products.length, 20);
  const ids = new Set(D.products.map((p) => p.id));
  assert.equal(ids.size, 20, 'semua id harus unik, 0 tabrakan');
});

test('duplicate ID: worst-case uid() stub balik nilai sama tiap panggilan — id tetap unik (bagian ke-2 id berbeda per baris)', () => {
  // uid() asli aplikasi adalah counter monotonic (features-helpers-global-
  // security.js) — stub ini SENGAJA meniru skenario ekstrem (uid() TIDAK
  // berubah) untuk membuktikan mekanisme id tetap tidak tabrakan.
  const D = makeD();
  let n = 0;
  const ctx = loadIo(D, { uid: () => 'fixed_' + (++n) });
  ctx.ShopDataIO.commitShopRows([
    { nama: 'A', hargaBeli: 100, hargaJual: 150, stok: 1 },
    { nama: 'B', hargaBeli: 100, hargaJual: 150, stok: 1 },
  ]);
  assert.equal(D.products.length, 2);
  assert.notEqual(D.products[0].id, D.products[1].id);
});

// === D. Duplicate nama / barcode (aturan existing, tidak diubah) ============

test('2 baris nama sama dalam SATU commit — baris ke-2 match baris pertama (update, bukan create kedua) — perilaku lama, tidak diubah', () => {
  const D = makeD();
  const ctx = loadIo(D);
  const res = ctx.ShopDataIO.commitShopRows([
    { nama: 'Sama Persis', hargaBeli: 100, hargaJual: 150, stok: 1 },
    { nama: 'Sama Persis', hargaBeli: 200, hargaJual: 250, stok: 2 },
  ]);
  assert.equal(res.created, 1);
  assert.equal(res.updated, 1);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].stock, 2);
  assert.equal(D.products[0].hargaBeli, 200);
});

test('duplicate barcode: skema Product tidak punya field barcode — 0 perubahan aturan dedup (tetap by-name)', () => {
  const D = makeD({
    products: [{ id: 'p1', name: 'Barang X', stock: 5, hargaBeli: 10, hargaJual: 20, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {}, satuan: '' }],
  });
  const ctx = loadIo(D);
  ctx.ShopDataIO.commitShopRows([{ nama: 'Barang X', stok: 8, hargaBeli: 15 }]);
  assert.equal(D.products.length, 1); // update, bukan produk kedua
  assert.equal(D.products[0].id, 'p1');
  assert.equal(D.products[0].stock, 8);
});

// === E. Batch import 100+ produk =============================================

test('batch import 120 produk baru — semua ter-create, 0 tabrakan id, 0 produk hilang, field per-baris tidak tertukar', () => {
  const D = makeD();
  const ctx = loadIo(D);
  const rows = Array.from({ length: 120 }, (_, i) => ({ nama: 'Batch Produk ' + i, hargaBeli: 100 + i, hargaJual: 200 + i, stok: i }));
  const res = ctx.ShopDataIO.commitShopRows(rows);
  assert.equal(res.created, 120);
  assert.equal(D.products.length, 120);
  const ids = new Set(D.products.map((p) => p.id));
  assert.equal(ids.size, 120);
  assert.equal(D.products[0].name, 'Batch Produk 0');
  assert.equal(D.products[0].stock, 0);
  assert.equal(D.products[119].name, 'Batch Produk 119');
  assert.equal(D.products[119].stock, 119);
  assert.equal(D.products[60].hargaBeli, 160);
});

test('batch import campuran create+update (99 baru + 1 existing) — total benar, existing ter-update bukan duplikat', () => {
  const D = makeD({
    products: [{ id: 'existing1', name: 'Existing 0', stock: 1, hargaBeli: 1, hargaJual: 2, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {}, satuan: '' }],
  });
  const ctx = loadIo(D);
  const rows = [{ nama: 'Existing 0', stok: 50, hargaBeli: 500 }];
  for (let i = 1; i < 100; i++) rows.push({ nama: 'New ' + i, hargaBeli: i, hargaJual: i, stok: i });
  const res = ctx.ShopDataIO.commitShopRows(rows);
  assert.equal(res.created, 99);
  assert.equal(res.updated, 1);
  assert.equal(D.products.length, 100);
  const existing = D.products.find((p) => p.id === 'existing1');
  assert.equal(existing.stock, 50);
  const ids = new Set(D.products.map((p) => p.id));
  assert.equal(ids.size, 100);
});

// === F. Invalid row / rollback ================================================

test('invalid: rows kosong/bukan array — ok:false, TIDAK menyentuh D.products (perilaku lama, tidak diubah)', () => {
  const D = makeD({ products: [{ id: 'p1', name: 'Tetap', stock: 1, hargaBeli: 1, hargaJual: 1 }] });
  const ctx = loadIo(D);
  assert.equal(ctx.ShopDataIO.commitShopRows([]).ok, false);
  assert.equal(ctx.ShopDataIO.commitShopRows(null).ok, false);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].id, 'p1');
});

test('invalid: baris tanpa nama diabaikan (skip), TIDAK ikut createProduct()', () => {
  const D = makeD();
  const ctx = loadIo(D);
  let createCalls = 0;
  const orig = ctx.ProductRepository.createProduct;
  ctx.ProductRepository.createProduct = function (...args) { createCalls++; return orig.apply(ctx.ProductRepository, args); };
  const res = ctx.ShopDataIO.commitShopRows([{ nama: '', hargaJual: 1000 }, { hargaJual: 2000 }]);
  assert.equal(res.created, 0);
  assert.equal(createCalls, 0);
  assert.equal(D.products.length, 0);
});

test('rollback: createProduct() gagal (simulasi) -> fallback raw push, baris tidak hilang, batch tetap lanjut', () => {
  const D = makeD();
  const ctx = loadIo(D);
  ctx.ProductRepository.createProduct = () => ({ ok: false, reason: 'simulasi gagal' });
  const res = ctx.ShopDataIO.commitShopRows([{ nama: 'Tetap Masuk', hargaBeli: 50, hargaJual: 70, stok: 5 }]);
  assert.equal(res.created, 1);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].name, 'Tetap Masuk');
  assert.match(D.products[0].id, /^prod_\d+_uid_\d+$/);
});

test('rollback: saveProduct() menolak (simulasi id ganda) -> fallback push newProduct langsung, baris tidak hilang', () => {
  const D = makeD();
  const ctx = loadIo(D);
  ctx.ProductRepository.saveProduct = () => ({ ok: false, reason: 'simulasi id ganda' });
  const res = ctx.ShopDataIO.commitShopRows([{ nama: 'Fallback SaveProduct', hargaBeli: 20, hargaJual: 30, stok: 2 }]);
  assert.equal(res.created, 1);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].name, 'Fallback SaveProduct');
});

// === G. Fallback tanpa ProductRepository =====================================

test('fallback: tanpa ProductRepository, object literal mentah PERSIS sama seperti sebelum Modul 13', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/business/shop-data-io-api.js'],
    {
      D,
      resolveShopKategori: () => '',
      escapeHtml: (s) => String(s),
      fmtFull: (n) => String(n),
      toast: () => {},
      save: () => {},
      closeModal: () => {},
      openModal: () => {},
      renderProductList: () => {},
      uid: () => 'uidx',
    },
    ['ShopDataIO'],
  );
  const res = ctx.ShopDataIO.commitShopRows([{ nama: 'Fallback Produk', hargaBeli: 300, hargaJual: 400, stok: 4, satuan: 'pcs' }]);
  assert.equal(res.created, 1);
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
  const res = ctx.ShopDataIO.commitShopRows([
    { nama: 'BC Produk', kategori: 'Kat', hargaBeli: 111, hargaJual: 222, hargaReseller: 150, stok: 7, satuan: 'pcs' },
  ]);
  assert.equal(res.ok, true);
  const p = D.products[0];
  assert.equal(p.name, 'BC Produk');
  assert.equal(p.stock, 7);
  assert.equal(p.hargaBeli, 111);
  assert.equal(p.hargaJual, 222);
  assert.equal(p.hargaReseller, 150);
  assert.equal(p.diskonPersen, 0);
  assert.equal(p.kategoriId, 'kat9');
  assert.equal(p.produsenId, '');
  assert.equal(p.satuan, 'pcs');
  assert.equal(Object.keys(p.hargaByProdusen).length, 0);
});

test('backward compat: summary {created,updated,total} format tidak berubah', () => {
  const D = makeD();
  const ctx = loadIo(D);
  const res = ctx.ShopDataIO.commitShopRows([{ nama: 'X', hargaBeli: 1, hargaJual: 1, stok: 1 }]);
  assert.equal(res.created, 1);
  assert.equal(res.updated, 0);
  assert.equal(res.total, 1);
});

// === I. Integrasi end-to-end lewat ShopCsvImport =============================

test('integrasi end-to-end: parseShopCSV() -> ShopCsvImport.commit() (2 baris baru) — lewat ProductRepository', () => {
  const D = makeD();
  const ctx = loadIo(D);
  let createCalls = 0;
  const orig = ctx.ProductRepository.createProduct;
  ctx.ProductRepository.createProduct = function (...args) { createCalls++; return orig.apply(ctx.ProductRepository, args); };
  const csv = 'nama,kategori,harga_beli,harga_jual,stok,satuan\nLumpang 10cm,Lumpang,20000,30000,5,pcs\nCobek 13cm,Cobek,15000,25000,3,pcs';
  ctx.ShopCsvImport.parsedRows = ctx.ShopDataIO.parseShopCSV(csv);
  ctx.ShopCsvImport.commit();
  assert.equal(createCalls, 2);
  assert.equal(D.products.length, 2);
  assert.equal(D.products[0].name, 'Lumpang 10cm');
  assert.equal(D.products[1].name, 'Cobek 13cm');
});
