'use strict';
// tests/shop-jsonimport-produsenexcel-mutation-gate-mod16.test.js — Modul 16
// (modules/business/shop-data-io-api.js ShopDataIO.importShopJSON() +
// modules/shop/cobek-io.js ImportShopExcel.commit() target 'produsen', sesi
// ini): menutup bypass terakhir yang ditemukan audit s373 — Import JSON
// (update produk existing via `product[f]=src[f]` mentah, create produk
// baru & create produsen via object literal mentah) dan Import Excel target
// 'produsen' (update contact/note/jarakKm/biayaPerKm & create produsen via
// object literal mentah, 0 gate — beda dari target 'etalase' yang sudah
// digate Modul 14/15). Semua dialihkan ke ProductRepository/SupplierStore
// (SSOT SUDAH ADA, Modul 3-15) — 0 gate baru, 0 validasi baru, pola guard
// typeof + fallback lama PERSIS sama dgn Modul 3-15.
//
// Cakupan:
//   A. importShopJSON() update produk existing — lewat ProductRepository
//      mutateSetPrice()/mutateSetStock()/mutateSetDiskon()/mutateSetField().
//   B. importShopJSON() create produk baru — lewat createProduct()+saveProduct().
//   C. importShopJSON() create produsen baru — lewat SupplierStore.mutateCreate().
//   D. importShopJSON() fallback tanpa ProductRepository/SupplierStore —
//      perilaku PERSIS sebelum Modul 16 (di-cover juga oleh test lama
//      shop-data-io-json-import.test.js yang tetap PASS tanpa diubah,
//      karena sandbox-nya memang tidak me-load ProductRepository/
//      SupplierStore).
//   E. importShopJSON() rollback — gate menolak (simulasi) -> fallback raw,
//      baris tidak hilang.
//   F. ImportShopExcel.commit() target produsen — update lewat
//      SupplierStore.mutateUpdate()/mutateSetRoute().
//   G. ImportShopExcel.commit() target produsen — create lewat
//      SupplierStore.mutateCreate().
//   H. ImportShopExcel.commit() target produsen — partial route (hanya
//      salah satu jarakKm/biayaPerKm terisi) TETAP assignment mentah (di
//      luar kontrak all-or-nothing mutateSetRoute(), bukan bypass baru).
//   I. Backward compatibility — hasil akhir & format toast tidak berubah.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// === Helpers: shop-data-io-api.js (importShopJSON) ============================

function makeD(overrides = {}) {
  return { products: [], produsen: [], cobekKategori: [], ...overrides };
}

function loadJsonIo(D, withRepo = true) {
  const files = ['modules/shop/cobek-tx-cart.js', 'modules/business/shop-data-io-api.js'];
  const expose = ['ShopDataIO'];
  if (withRepo) {
    files.unshift('modules/shop/generic/supplier-store.js');
    files.unshift('modules/shop/generic/product-repository.js');
    expose.push('ProductRepository', 'SupplierStore');
  }
  return loadSource(
    files,
    {
      D,
      SCHEMA_VERSION: 4,
      save: () => {},
      uid: (() => { let n = 0; return () => 'uid_' + (n++); })(),
      openModal: () => {},
      closeModal: () => {},
      toast: () => {},
      escapeHtml: (s) => s,
      fmtFull: (n) => 'Rp ' + n,
      renderProductList: () => {},
      askConfirm: async () => true,
      Blob: class Blob { constructor(parts, opts) { this.parts = parts; this.type = opts && opts.type; } },
      URL: { createObjectURL: () => 'blob:stub' },
    },
    expose,
  );
}

// === A. importShopJSON() update produk existing — lewat ProductRepository ====

test('importShopJSON() gabung — update produk existing lewat ProductRepository.mutateSetPrice()/mutateSetStock()/mutateSetDiskon()/mutateSetField()', () => {
  const D = makeD({
    products: [{ id: 'prod_1', name: 'Lumpang 10cm', stock: 2, hargaBeli: 15000, hargaJual: 25000, hargaReseller: 22000, diskonPersen: 5, kategoriId: 'kat_lama', produsenId: 'prd_lama', hargaByProdusen: {}, satuan: 'pcs' }],
  });
  const ctx = loadJsonIo(D);
  let priceCalls = 0, stockCalls = 0, diskonCalls = 0, fieldCalls = 0;
  const origPrice = ctx.ProductRepository.mutateSetPrice;
  const origStock = ctx.ProductRepository.mutateSetStock;
  const origDiskon = ctx.ProductRepository.mutateSetDiskon;
  const origField = ctx.ProductRepository.mutateSetField;
  ctx.ProductRepository.mutateSetPrice = function (...a) { priceCalls++; return origPrice.apply(ctx.ProductRepository, a); };
  ctx.ProductRepository.mutateSetStock = function (...a) { stockCalls++; return origStock.apply(ctx.ProductRepository, a); };
  ctx.ProductRepository.mutateSetDiskon = function (...a) { diskonCalls++; return origDiskon.apply(ctx.ProductRepository, a); };
  ctx.ProductRepository.mutateSetField = function (...a) { fieldCalls++; return origField.apply(ctx.ProductRepository, a); };

  const res = ctx.ShopDataIO.importShopJSON({
    products: [{ name: 'lumpang 10cm', stock: 10, hargaBeli: 16000, hargaJual: 26000, hargaReseller: 23000, diskonPersen: 8, kategoriId: 'kat_baru', produsenId: 'prd_baru', satuan: 'lusin' }],
    produsen: [],
  }, 'gabung');

  assert.equal(res.ok, true);
  assert.equal(res.updated, 1);
  assert.equal(priceCalls, 3, 'mutateSetPrice() dipanggil utk hargaBeli/hargaJual/hargaReseller');
  assert.equal(stockCalls, 1);
  assert.equal(diskonCalls, 1);
  assert.equal(fieldCalls, 3, 'mutateSetField() dipanggil utk kategoriId/produsenId/satuan');
  const p = D.products[0];
  assert.equal(p.stock, 10);
  assert.equal(p.hargaBeli, 16000);
  assert.equal(p.hargaJual, 26000);
  assert.equal(p.hargaReseller, 23000);
  assert.equal(p.diskonPersen, 8);
  assert.equal(p.kategoriId, 'kat_baru');
  assert.equal(p.produsenId, 'prd_baru');
  assert.equal(p.satuan, 'lusin');
});

test('importShopJSON() gabung — update PARTIAL tetap jalan (field undefined di sumber tidak menimpa, gate tidak dipanggil utk field itu)', () => {
  const D = makeD({
    products: [{ id: 'prod_1', name: 'Lumpang 10cm', stock: 2, hargaBeli: 15000, hargaJual: 25000, hargaReseller: null, diskonPersen: 5, kategoriId: '', produsenId: '', hargaByProdusen: {}, satuan: 'pcs' }],
  });
  const ctx = loadJsonIo(D);
  const res = ctx.ShopDataIO.importShopJSON({ products: [{ name: 'lumpang 10cm', stock: 10 }] }, 'gabung');
  assert.equal(res.updated, 1);
  const p = D.products[0];
  assert.equal(p.stock, 10);
  assert.equal(p.hargaBeli, 15000, 'field yang tidak dikirim tetap seperti semula (behavior lama, TIDAK berubah Modul 16)');
  assert.equal(p.satuan, 'pcs');
});

test('importShopJSON() gabung — nilai invalid (harga negatif/NaN via string) tetap diklem/ditolak gate, produk tidak korup', () => {
  const D = makeD({
    products: [{ id: 'prod_1', name: 'Barang', stock: 5, hargaBeli: 1000, hargaJual: 2000, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {}, satuan: '' }],
  });
  const ctx = loadJsonIo(D);
  const res = ctx.ShopDataIO.importShopJSON({ products: [{ name: 'barang', hargaBeli: -500, diskonPersen: 500 }] }, 'gabung');
  assert.equal(res.updated, 1);
  const p = D.products[0];
  assert.equal(p.hargaBeli, 0, 'validatePriceValue() klem >=0 (gate Modul 4, bukan validasi baru)');
  assert.equal(p.diskonPersen, 100, 'validateDiscountValue() klem <=100 (gate Modul 5, bukan validasi baru)');
});

// === B. importShopJSON() create produk baru — lewat createProduct()+saveProduct() ==

test('importShopJSON() gabung — create produk baru lewat ProductRepository.createProduct()+saveProduct()', () => {
  const D = makeD();
  const ctx = loadJsonIo(D);
  let createCalls = 0, saveCalls = 0;
  const origCreate = ctx.ProductRepository.createProduct;
  const origSave = ctx.ProductRepository.saveProduct;
  ctx.ProductRepository.createProduct = function (...a) { createCalls++; return origCreate.apply(ctx.ProductRepository, a); };
  ctx.ProductRepository.saveProduct = function (...a) { saveCalls++; return origSave.apply(ctx.ProductRepository, a); };

  const res = ctx.ShopDataIO.importShopJSON({
    products: [{ name: 'Lumpang 10cm', hargaBeli: 20000, hargaJual: 30000, stock: 5, kategoriId: 'kat_1', satuan: 'pcs' }],
    produsen: [],
  }, 'gabung');

  assert.equal(res.ok, true);
  assert.equal(res.created, 1);
  assert.equal(createCalls, 1);
  assert.equal(saveCalls, 1);
  const p = D.products[0];
  assert.equal(p.name, 'Lumpang 10cm');
  assert.equal(p.hargaBeli, 20000);
  assert.equal(p.kategoriId, 'kat_1');
  assert.equal(p.satuan, 'pcs');
  assert.match(p.id, /^prod_\d+_uid_\d+$/, 'id generator lokal TIDAK berubah');
  // default field baru dari createProduct(), konsisten Etalase.save()/Modul 11/13/14
  assert.equal(p.ownership, 'SELF');
  assert.equal(p.beratPerUnit, 0);
});

test('importShopJSON() gabung — rollback createProduct() gagal (simulasi) -> fallback raw push, baris tidak hilang', () => {
  const D = makeD();
  const ctx = loadJsonIo(D);
  ctx.ProductRepository.createProduct = () => ({ ok: false, reason: 'simulasi gagal' });
  const res = ctx.ShopDataIO.importShopJSON({ products: [{ name: 'Tetap Masuk', stock: 5 }], produsen: [] }, 'gabung');
  assert.equal(res.created, 1);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].name, 'Tetap Masuk');
});

test('importShopJSON() gabung — rollback saveProduct() menolak (simulasi id ganda) -> fallback push newProduct, baris tidak hilang', () => {
  const D = makeD();
  const ctx = loadJsonIo(D);
  ctx.ProductRepository.saveProduct = () => ({ ok: false, reason: 'simulasi id ganda' });
  const res = ctx.ShopDataIO.importShopJSON({ products: [{ name: 'Fallback SaveProduct', stock: 2 }], produsen: [] }, 'gabung');
  assert.equal(res.created, 1);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].name, 'Fallback SaveProduct');
});

// === C. importShopJSON() create produsen baru — lewat SupplierStore.mutateCreate() =

test('importShopJSON() gabung — create produsen baru lewat SupplierStore.mutateCreate(), existing TIDAK di-update', () => {
  const D = makeD({ produsen: [{ id: 'prd_1', name: 'UD Batu Alam', contact: '0812', note: 'lama' }] });
  const ctx = loadJsonIo(D);
  let createCalls = 0;
  const orig = ctx.SupplierStore.mutateCreate;
  ctx.SupplierStore.mutateCreate = function (...a) { createCalls++; return orig.apply(ctx.SupplierStore, a); };

  const res = ctx.ShopDataIO.importShopJSON({
    products: [],
    produsen: [
      { name: 'UD Batu Alam', contact: '0899', note: 'baru' },
      { name: 'CV Sumber Rejeki', contact: '0877' },
    ],
  }, 'gabung');

  assert.equal(res.produsenCreated, 1);
  assert.equal(createCalls, 1, 'mutateCreate() hanya dipanggil utk produsen BARU, bukan yang existing');
  assert.equal(D.produsen.length, 2);
  const existing = D.produsen.find((p) => p.name === 'UD Batu Alam');
  assert.equal(existing.contact, '0812', 'produsen existing tetap tidak di-update (behavior lama, tidak berubah Modul 16)');
  const created = D.produsen.find((p) => p.name === 'CV Sumber Rejeki');
  assert.ok(created);
  assert.equal(created.contact, '0877');
  assert.match(created.id, /^prd_\d+_uid_\d+$/, 'id generator lokal TIDAK berubah');
});

test('importShopJSON() gabung — rollback SupplierStore.mutateCreate() menolak (simulasi) -> fallback object literal, produsen tidak hilang', () => {
  const D = makeD();
  const ctx = loadJsonIo(D);
  ctx.SupplierStore.mutateCreate = () => ({ ok: false, reason: 'simulasi gagal' });
  const res = ctx.ShopDataIO.importShopJSON({ products: [], produsen: [{ name: 'CV Fallback' }] }, 'gabung');
  assert.equal(res.produsenCreated, 1);
  assert.equal(D.produsen.length, 1);
  assert.equal(D.produsen[0].name, 'CV Fallback');
});

// === D/E. Fallback & rollback (lihat juga shop-data-io-json-import.test.js) =====
// shop-data-io-json-import.test.js TIDAK me-load ProductRepository/SupplierStore
// sama sekali -> semua assertion di sana otomatis lewat jalur fallback
// (`typeof ProductRepository==='undefined'`), sudah cukup meng-cover kasus D
// tanpa duplikasi test di sini (tetap PASS tanpa diubah, dites ulang di regresi).

// === Helpers: cobek-io.js (ImportShopExcel target produsen) ===================

function loadExcelIo(D, extra = {}) {
  return loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/generic/supplier-store.js', 'modules/shop/cobek-io.js'],
    {
      D,
      resolveShopKategori: () => '',
      escapeHtml: (s) => String(s),
      fmtFull: (n) => String(n),
      toast: extra.toast || (() => {}),
      save: () => {},
      closeModal: () => {},
      openModal: () => {},
      Etalase: { renderList: () => {}, renderKategoriList: () => {}, renderModalStat: () => {} },
      PriceRekoWidget: { render: () => {} },
      StockRekoWidget: { render: () => {} },
      Produsen: { renderList: () => {} },
      uid: extra.uid || (() => { let n = 0; return () => 'uid_' + (++n); })(),
    },
    ['ProductRepository', 'SupplierStore', 'ImportShopExcel'],
  );
}

function commitRows(ctx, target, rows) {
  ctx.ImportShopExcel.target = target;
  ctx.ImportShopExcel.parsedRows = rows;
  ctx.ImportShopExcel.commit();
}

// === F. target produsen — update lewat SupplierStore.mutateUpdate()/mutateSetRoute() =

test('ImportShopExcel.commit() target produsen — update contact/note lewat SupplierStore.mutateUpdate()', () => {
  const D = makeD({ produsen: [{ id: 'prd_1', name: 'CV Merapi Jaya', contact: '0811', note: 'lama', jarakKm: '', biayaPerKm: '' }] });
  const ctx = loadExcelIo(D);
  let updateCalls = 0;
  const orig = ctx.SupplierStore.mutateUpdate;
  ctx.SupplierStore.mutateUpdate = function (...a) { updateCalls++; return orig.apply(ctx.SupplierStore, a); };
  commitRows(ctx, 'produsen', [{ name: 'cv merapi jaya', kontak: '0822', catatan: 'baru', jarakKm: '', biayaPerKm: '' }]);
  assert.equal(updateCalls, 1);
  assert.equal(D.produsen[0].contact, '0822');
  assert.equal(D.produsen[0].note, 'baru');
});

test('ImportShopExcel.commit() target produsen — update jarakKm & biayaPerKm bersamaan lewat SupplierStore.mutateSetRoute()', () => {
  const D = makeD({ produsen: [{ id: 'prd_1', name: 'CV Merapi Jaya', contact: '', note: '', jarakKm: 5, biayaPerKm: 1000 }] });
  const ctx = loadExcelIo(D);
  let routeCalls = 0;
  const orig = ctx.SupplierStore.mutateSetRoute;
  ctx.SupplierStore.mutateSetRoute = function (...a) { routeCalls++; return orig.apply(ctx.SupplierStore, a); };
  commitRows(ctx, 'produsen', [{ name: 'cv merapi jaya', kontak: '', catatan: '', jarakKm: 8, biayaPerKm: 1500 }]);
  assert.equal(routeCalls, 1);
  assert.equal(D.produsen[0].jarakKm, 8);
  assert.equal(D.produsen[0].biayaPerKm, 1500);
});

// === G. target produsen — create lewat SupplierStore.mutateCreate() ===========

test('ImportShopExcel.commit() target produsen — create produsen baru lewat SupplierStore.mutateCreate()', () => {
  const D = makeD();
  const ctx = loadExcelIo(D);
  let createCalls = 0;
  const orig = ctx.SupplierStore.mutateCreate;
  ctx.SupplierStore.mutateCreate = function (...a) { createCalls++; return orig.apply(ctx.SupplierStore, a); };
  commitRows(ctx, 'produsen', [{ name: 'CV Baru', kontak: '0812', catatan: 'catatan awal', jarakKm: 5, biayaPerKm: 1000 }]);
  assert.equal(createCalls, 1);
  assert.equal(D.produsen.length, 1);
  const s = D.produsen[0];
  assert.equal(s.name, 'CV Baru');
  assert.equal(s.contact, '0812');
  assert.equal(s.note, 'catatan awal');
  assert.equal(s.jarakKm, 5);
  assert.equal(s.biayaPerKm, 1000);
  assert.match(s.id, /^prd_\d+_uid_\d+$/, 'id generator lokal TIDAK berubah');
});

test('ImportShopExcel.commit() target produsen — rollback mutateCreate() menolak (simulasi) -> fallback object literal, baris tidak hilang', () => {
  const D = makeD();
  const ctx = loadExcelIo(D);
  ctx.SupplierStore.mutateCreate = () => ({ ok: false, reason: 'simulasi gagal' });
  commitRows(ctx, 'produsen', [{ name: 'CV Fallback', kontak: '0812', catatan: '', jarakKm: '', biayaPerKm: '' }]);
  assert.equal(D.produsen.length, 1);
  assert.equal(D.produsen[0].name, 'CV Fallback');
});

// === H. partial route — di luar kontrak all-or-nothing mutateSetRoute() =======

test('ImportShopExcel.commit() target produsen — hanya jarakKm terisi (biayaPerKm kosong) -> TETAP assignment mentah, mutateSetRoute() TIDAK dipanggil', () => {
  const D = makeD({ produsen: [{ id: 'prd_1', name: 'CV Parsial', contact: '', note: '', jarakKm: 5, biayaPerKm: 1000 }] });
  const ctx = loadExcelIo(D);
  let routeCalls = 0;
  const orig = ctx.SupplierStore.mutateSetRoute;
  ctx.SupplierStore.mutateSetRoute = function (...a) { routeCalls++; return orig.apply(ctx.SupplierStore, a); };
  commitRows(ctx, 'produsen', [{ name: 'cv parsial', kontak: '', catatan: '', jarakKm: 9, biayaPerKm: '' }]);
  assert.equal(routeCalls, 0, 'mutateSetRoute() butuh keduanya, tidak dipanggil kalau cuma salah satu terisi');
  assert.equal(D.produsen[0].jarakKm, 9, 'field yang terisi tetap ter-update (assignment mentah lama, behavior tidak berubah)');
  assert.equal(D.produsen[0].biayaPerKm, 1000, 'field yang kosong di file tidak tersentuh (behavior lama)');
});

// === I. Backward compatibility ==================================================

test('backward compat: ImportShopExcel.commit() target produsen — toast summary format tidak berubah', () => {
  const D = makeD();
  let toastMsg = '';
  const ctx = loadExcelIo(D, { toast: (m) => { toastMsg = m; } });
  commitRows(ctx, 'produsen', [{ name: 'CV X', kontak: '', catatan: '', jarakKm: '', biayaPerKm: '' }]);
  assert.match(toastMsg, /1 baru, 0 diperbarui/);
});

test('backward compat: importShopJSON() gabung — struktur return {ok,mode,created,updated,produsenCreated} tidak berubah', () => {
  const D = makeD();
  const ctx = loadJsonIo(D);
  const res = ctx.ShopDataIO.importShopJSON({ products: [{ name: 'A', stock: 1 }], produsen: [{ name: 'B' }] }, 'gabung');
  assert.equal(res.ok, true);
  assert.equal(res.mode, 'gabung');
  assert.equal(res.created, 1);
  assert.equal(res.updated, 0);
  assert.equal(res.produsenCreated, 1);
});
