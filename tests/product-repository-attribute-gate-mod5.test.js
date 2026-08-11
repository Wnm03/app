'use strict';
// tests/product-repository-attribute-gate-mod5.test.js — Modul 5 (Product
// Repository, sesi ini): Attribute Mutation Gate.
//
// Lanjutan langsung Modul 3 (stock) & Modul 4 (hargaBeli/hargaJual): field
// terakhir yang masih bypass ProductRepository ditutup sesi ini —
// hargaReseller (diperluas ke mutateSetPrice() yang sudah ada, dengan
// penanganan null eksplisit), diskonPersen (gate baru mutateSetDiskon()),
// kategoriId/produsenId/satuan (1 gate generik mutateSetField()).
//
// Cakupan:
//   A. Unit — validatePriceValue()/mutateSetPrice() (perluasan hargaReseller),
//      validateDiscountValue()/mutateSetDiskon(), validateTextValue()/
//      mutateSetField() secara langsung (isolasi, cuma product-repository.js).
//   B. Integrasi — titik call-site yang di-wire sesi ini
//      (shop-data-io-api.js commitShopRows(), cobek-io.js
//      ImportShopExcel.commit(), cobek-etalase.js Etalase.save()) benar-benar
//      lewat gate & hasil akhir identik business logic lama utk nilai valid,
//      PLUS menolak nilai korup (NaN/Infinity/string kosong/tipe salah).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadRepo() {
  return loadSource(['modules/shop/generic/product-repository.js'], {}, ['ProductRepository']);
}

// === A1. Unit: mutateSetPrice() perluasan hargaReseller =====================

test('ProductRepository.mutateSetPrice() — hargaReseller: angka valid diklem >=0, ditulis in-place', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaReseller: null };
  const r = ProductRepository.mutateSetPrice(p, 'hargaReseller', 15000);
  assert.equal(r.ok, true); assert.equal(r.value, 15000);
  assert.equal(p.hargaReseller, 15000);
});

test('ProductRepository.mutateSetPrice() — hargaReseller: null VALID (artinya "belum diisi"), beda dari hargaBeli/hargaJual', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaReseller: 8000 };
  const r = ProductRepository.mutateSetPrice(p, 'hargaReseller', null);
  assert.equal(r.ok, true); assert.equal(r.value, null);
  assert.equal(p.hargaReseller, null);
  // kontras: hargaBeli/hargaJual TETAP menolak null (perilaku Modul 4, tidak berubah)
  const p2 = { id: 'p2', hargaBeli: 1000, hargaJual: 2000 };
  assert.equal(ProductRepository.mutateSetPrice(p2, 'hargaBeli', null).ok, false);
  assert.equal(ProductRepository.mutateSetPrice(p2, 'hargaJual', null).ok, false);
  assert.equal(p2.hargaBeli, 1000);
  assert.equal(p2.hargaJual, 2000);
});

test('ProductRepository.mutateSetPrice() — hargaReseller: NaN/Infinity/string/undefined ditolak, field TIDAK disentuh', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaReseller: 7000 };
  assert.equal(ProductRepository.mutateSetPrice(p, 'hargaReseller', NaN).ok, false);
  assert.equal(p.hargaReseller, 7000);
  assert.equal(ProductRepository.mutateSetPrice(p, 'hargaReseller', Infinity).ok, false);
  assert.equal(p.hargaReseller, 7000);
  assert.equal(ProductRepository.mutateSetPrice(p, 'hargaReseller', '9000').ok, false);
  assert.equal(p.hargaReseller, 7000);
  assert.equal(ProductRepository.mutateSetPrice(p, 'hargaReseller', undefined).ok, false);
  assert.equal(p.hargaReseller, 7000);
});

test('ProductRepository.mutateSetPrice() — negatif diklem ke 0 (hargaReseller ikut aturan sama dgn hargaBeli/hargaJual utk angka)', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaReseller: 5000 };
  const r = ProductRepository.mutateSetPrice(p, 'hargaReseller', -500);
  assert.equal(r.ok, true); assert.equal(r.value, 0);
  assert.equal(p.hargaReseller, 0);
});

// === A2. Unit: validateDiscountValue()/mutateSetDiskon() ====================

test('ProductRepository.validateDiscountValue() — angka valid diklem 0..100', () => {
  const { ProductRepository } = loadRepo();
  const r = ProductRepository.validateDiscountValue(25);
  assert.equal(r.ok, true); assert.equal(r.value, 25);
  assert.equal(ProductRepository.validateDiscountValue(-10).value, 0); // klem bawah
  assert.equal(ProductRepository.validateDiscountValue(150).value, 100); // klem atas
  assert.equal(ProductRepository.validateDiscountValue(0).value, 0);
  assert.equal(ProductRepository.validateDiscountValue(100).value, 100);
});

test('ProductRepository.validateDiscountValue() — NaN/Infinity/string/undefined/null -> ok:false', () => {
  const { ProductRepository } = loadRepo();
  assert.equal(ProductRepository.validateDiscountValue(NaN).ok, false);
  assert.equal(ProductRepository.validateDiscountValue(Infinity).ok, false);
  assert.equal(ProductRepository.validateDiscountValue(-Infinity).ok, false);
  assert.equal(ProductRepository.validateDiscountValue('10').ok, false);
  assert.equal(ProductRepository.validateDiscountValue(undefined).ok, false);
  assert.equal(ProductRepository.validateDiscountValue(null).ok, false);
});

test('ProductRepository.mutateSetDiskon() — menulis .diskonPersen in-place, fail-safe kalau invalid', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', diskonPersen: 10 };
  const r1 = ProductRepository.mutateSetDiskon(p, 30);
  assert.equal(r1.ok, true); assert.equal(p.diskonPersen, 30);
  const r2 = ProductRepository.mutateSetDiskon(p, NaN);
  assert.equal(r2.ok, false);
  assert.equal(p.diskonPersen, 30); // tidak berubah, TIDAK jadi NaN
});

test('ProductRepository.mutateSetDiskon() — produk tidak valid (null/array/primitif) -> ok:false', () => {
  const { ProductRepository } = loadRepo();
  assert.equal(ProductRepository.mutateSetDiskon(null, 10).ok, false);
  assert.equal(ProductRepository.mutateSetDiskon([], 10).ok, false);
  assert.equal(ProductRepository.mutateSetDiskon('x', 10).ok, false);
});

// === A3. Unit: validateTextValue()/mutateSetField() =========================

test('ProductRepository.validateTextValue() — string non-kosong (setelah trim) valid', () => {
  const { ProductRepository } = loadRepo();
  const r = ProductRepository.validateTextValue('kat_1');
  assert.equal(r.ok, true); assert.equal(r.value, 'kat_1');
  assert.equal(ProductRepository.validateTextValue('  pcs  ').value, 'pcs'); // di-trim
});

test('ProductRepository.validateTextValue() — kosong/null/undefined/NaN/angka/whitespace-only -> ok:false', () => {
  const { ProductRepository } = loadRepo();
  assert.equal(ProductRepository.validateTextValue('').ok, false);
  assert.equal(ProductRepository.validateTextValue('   ').ok, false);
  assert.equal(ProductRepository.validateTextValue(null).ok, false);
  assert.equal(ProductRepository.validateTextValue(undefined).ok, false);
  assert.equal(ProductRepository.validateTextValue(NaN).ok, false);
  assert.equal(ProductRepository.validateTextValue(123).ok, false);
});

test('ProductRepository.mutateSetField() — kategoriId/produsenId/satuan ditulis in-place, 1 gate dipakai ke-3nya', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', kategoriId: '', produsenId: '', satuan: '' };
  assert.equal(ProductRepository.mutateSetField(p, 'kategoriId', 'kat_baru').ok, true);
  assert.equal(p.kategoriId, 'kat_baru');
  assert.equal(ProductRepository.mutateSetField(p, 'produsenId', 'prd_baru').ok, true);
  assert.equal(p.produsenId, 'prd_baru');
  assert.equal(ProductRepository.mutateSetField(p, 'satuan', 'pcs').ok, true);
  assert.equal(p.satuan, 'pcs');
});

test('ProductRepository.mutateSetField() — value tidak valid: field TIDAK disentuh sama sekali (fail-safe)', () => {
  const { ProductRepository } = loadRepo();
  // UPDATE Modul 15 (sesi lain): sebelum Modul 15, kategoriId='' DITOLAK
  // gate ini (assersi lama di sini). Modul 15 SENGAJA memperluas gate
  // supaya kategoriId/produsenId (bukan satuan) menerima '' sbg "clear"
  // eksplisit (lihat tests/product-repository-clear-field-gate-mod15.
  // test.js utk cakupan penuh kasus itu) — jadi assersi '' dipindah ke
  // `satuan` di sini (field yang TIDAK ikut pengecualian Modul 15, masih
  // menolak '' PERSIS seperti sebelumnya), supaya test ini tetap murni
  // menguji fail-safe umum (value tidak valid -> field tidak disentuh)
  // tanpa tabrakan dgn kontrak baru yang sengaja diubah Modul 15.
  const p = { id: 'p1', kategoriId: 'kat_lama', satuan: 'pcs_lama' };
  const r = ProductRepository.mutateSetField(p, 'satuan', '');
  assert.equal(r.ok, false);
  assert.equal(p.satuan, 'pcs_lama'); // tidak berubah
  const r2 = ProductRepository.mutateSetField(p, 'kategoriId', undefined);
  assert.equal(r2.ok, false);
  assert.equal(p.kategoriId, 'kat_lama');
});

test('ProductRepository.mutateSetField() — field di luar whitelist (hargaBeli/stock/dll.) ditolak', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaBeli: 1000 };
  assert.equal(ProductRepository.mutateSetField(p, 'hargaBeli', 'x').ok, false);
  assert.equal(p.hargaBeli, 1000);
});

test('ProductRepository.mutateSetField() — produk tidak valid (null/array/primitif) -> ok:false', () => {
  const { ProductRepository } = loadRepo();
  assert.equal(ProductRepository.mutateSetField(null, 'satuan', 'pcs').ok, false);
  assert.equal(ProductRepository.mutateSetField([], 'satuan', 'pcs').ok, false);
  assert.equal(ProductRepository.mutateSetField('x', 'satuan', 'pcs').ok, false);
});

test('update berturut-turut: mutateSetPrice/mutateSetDiskon/mutateSetField beruntun pada produk yang sama tetap konsisten', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', satuan: '' };
  ProductRepository.mutateSetPrice(p, 'hargaReseller', 5000);
  ProductRepository.mutateSetDiskon(p, 10);
  ProductRepository.mutateSetField(p, 'kategoriId', 'kat_a');
  ProductRepository.mutateSetPrice(p, 'hargaReseller', 6000); // update kedua, harus overwrite bersih
  ProductRepository.mutateSetDiskon(p, NaN); // gagal, tidak boleh ubah nilai sebelumnya
  ProductRepository.mutateSetField(p, 'produsenId', 'prd_a');
  assert.equal(p.hargaReseller, 6000);
  assert.equal(p.diskonPersen, 10); // tetap nilai valid terakhir, NaN tidak masuk
  assert.equal(p.kategoriId, 'kat_a');
  assert.equal(p.produsenId, 'prd_a');
});

// === B. Integrasi ============================================================

test('integrasi: shop-data-io-api.js commitShopRows() SET hargaReseller/satuan/kategoriId lewat gate, hasil sama seperti sebelumnya', () => {
  const D = {
    products: [{ id: 'p1', name: 'Cobek Existing', stock: 5, hargaBeli: 1000, hargaJual: 2000, hargaReseller: null, satuan: '', kategoriId: '' }],
    cobekKategori: [], produsen: [], accounts: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/business/shop-data-io-api.js'],
    { D, resolveShopKategori: () => 'kat_x', toast: () => {}, save: () => {} },
    ['ShopDataIO', 'ProductRepository'],
  );
  let priceCalls = 0, fieldCalls = 0;
  const origPrice = ctx.ProductRepository.mutateSetPrice;
  ctx.ProductRepository.mutateSetPrice = function (...args) { priceCalls++; return origPrice.apply(ctx.ProductRepository, args); };
  const origField = ctx.ProductRepository.mutateSetField;
  ctx.ProductRepository.mutateSetField = function (...args) { fieldCalls++; return origField.apply(ctx.ProductRepository, args); };

  const rows = [{ nama: 'Cobek Existing', hargaReseller: 1800, satuan: 'pcs', kategori: 'Cobek' }];
  const summary = ctx.ShopDataIO.commitShopRows(rows);
  assert.ok(summary.ok);
  assert.equal(D.products[0].hargaReseller, 1800);
  assert.equal(D.products[0].satuan, 'pcs');
  assert.equal(D.products[0].kategoriId, 'kat_x');
  assert.ok(priceCalls >= 1, 'hargaReseller harus lewat ProductRepository.mutateSetPrice()');
  assert.ok(fieldCalls >= 2, 'satuan & kategoriId harus lewat ProductRepository.mutateSetField()');
});

test('integrasi: shop-data-io-api.js commitShopRows() nilai kosong/undefined TIDAK menimpa data lama (partial-update tetap terjaga)', () => {
  const D = {
    products: [{ id: 'p1', name: 'Cobek Existing', stock: 5, hargaBeli: 1000, hargaJual: 2000, hargaReseller: 999, satuan: 'lusin', kategoriId: 'kat_lama' }],
    cobekKategori: [], produsen: [], accounts: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/business/shop-data-io-api.js'],
    { D, resolveShopKategori: () => '', toast: () => {}, save: () => {} },
    ['ShopDataIO'],
  );
  const rows = [{ nama: 'Cobek Existing' }]; // tidak kirim hargaReseller/satuan/kategori sama sekali
  ctx.ShopDataIO.commitShopRows(rows);
  assert.equal(D.products[0].hargaReseller, 999);
  assert.equal(D.products[0].satuan, 'lusin');
  assert.equal(D.products[0].kategoriId, 'kat_lama');
});

test('integrasi: cobek-io.js ImportShopExcel.commit() SET hargaReseller/diskonPersen/kategoriId/produsenId lewat gate, hasil sama seperti sebelumnya', () => {
  const D = {
    products: [{ id: 'p1', name: 'Lumpang 15cm', stock: 2, hargaBeli: 10000, hargaJual: 20000, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '' }],
    produsen: [{ id: 'prd1', name: 'Toko Batu' }], cobekKategori: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-io.js'],
    {
      D,
      resolveShopKategori: () => 'kat_y',
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      toast: () => {},
      save: () => {},
      closeModal: () => {},
      renderProdusenList: () => {},
      uid: (() => { let n = 0; return () => 'uid_' + (++n); })(),
      Etalase: { renderList: () => {}, renderKategoriList: () => {}, renderModalStat: () => {} },
      PriceRekoWidget: { render: () => {} },
      StockRekoWidget: { render: () => {} },
    },
    ['ImportShopExcel', 'ProductRepository'],
  );
  let priceCalls = 0, diskonCalls = 0, fieldCalls = 0;
  const origPrice = ctx.ProductRepository.mutateSetPrice;
  ctx.ProductRepository.mutateSetPrice = function (...args) { priceCalls++; return origPrice.apply(ctx.ProductRepository, args); };
  const origDiskon = ctx.ProductRepository.mutateSetDiskon;
  ctx.ProductRepository.mutateSetDiskon = function (...args) { diskonCalls++; return origDiskon.apply(ctx.ProductRepository, args); };
  const origField = ctx.ProductRepository.mutateSetField;
  ctx.ProductRepository.mutateSetField = function (...args) { fieldCalls++; return origField.apply(ctx.ProductRepository, args); };

  ctx.ImportShopExcel.target = 'produk';
  ctx.ImportShopExcel.parsedRows = [
    { name: 'Lumpang 15cm', stock: 6, hargaBeli: 12000, hargaJual: 24000, hargaReseller: 9000, diskonPersen: 15, kategori: 'Lumpang', produsen: 'Toko Batu' },
  ];
  ctx.ImportShopExcel.commit();
  assert.equal(D.products[0].hargaReseller, 9000);
  assert.equal(D.products[0].diskonPersen, 15);
  assert.equal(D.products[0].kategoriId, 'kat_y');
  assert.equal(D.products[0].produsenId, 'prd1');
  assert.ok(priceCalls >= 1, 'hargaReseller harus lewat mutateSetPrice()');
  assert.ok(diskonCalls >= 1, 'diskonPersen harus lewat mutateSetDiskon()');
  assert.ok(fieldCalls >= 2, 'kategoriId & produsenId harus lewat mutateSetField()');
});

test('integrasi: cobek-io.js ImportShopExcel.commit() menolak diskonPersen korup (NaN), produk existing TIDAK ketimpa nilai rusak', () => {
  const D = {
    products: [{ id: 'p1', name: 'Lumpang 15cm', stock: 2, hargaBeli: 10000, hargaJual: 20000, hargaReseller: null, diskonPersen: 5, kategoriId: '', produsenId: '' }],
    produsen: [], cobekKategori: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-io.js'],
    {
      D,
      resolveShopKategori: () => '',
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      toast: () => {},
      save: () => {},
      closeModal: () => {},
      renderProdusenList: () => {},
      uid: (() => { let n = 0; return () => 'uid_' + (++n); })(),
      Etalase: { renderList: () => {}, renderKategoriList: () => {}, renderModalStat: () => {} },
      PriceRekoWidget: { render: () => {} },
      StockRekoWidget: { render: () => {} },
    },
    ['ImportShopExcel'],
  );
  ctx.ImportShopExcel.target = 'produk';
  ctx.ImportShopExcel.parsedRows = [
    { name: 'Lumpang 15cm', stock: 6, hargaBeli: 12000, hargaJual: 24000, hargaReseller: null, diskonPersen: NaN, kategori: '', produsen: '' },
  ];
  ctx.ImportShopExcel.commit();
  assert.equal(D.products[0].diskonPersen, 5); // tidak berubah, TIDAK jadi NaN
  assert.equal(D.products[0].hargaBeli, 12000); // field lain (valid) tetap ke-update, gate Modul 4 tidak regresi
});

test('integrasi: cobek-etalase.js Etalase.save() (edit produk) SET produsenId lewat gate, hasil sama seperti sebelumnya', () => {
  const D = {
    products: [{ id: 'p1', name: 'Cobek 20cm', stock: 5, hargaBeli: 10000, hargaJual: 20000, hargaReseller: null, diskonPersen: 0, kategoriId: '', beratPerUnit: 0, panjang: 0, lebar: 0, tinggi: 0, ownership: 'SELF', produsenId: '', hargaByProdusen: {} }],
    produsen: [{ id: 'prd1', name: 'Toko Batu' }], cobekKategori: [], accounts: [{ id: 'acc1' }],
  };
  const fakeDocument = {
    getElementById(id) {
      const vals = {
        pName: { value: 'Cobek 20cm' }, pStock: { value: '5' }, pBeli: { value: '10000' },
        pJual: { value: '20000' }, pReseller: { value: '' }, pDiskon: { value: '0' },
        pKategori: { value: '' }, pProdusen: { value: 'prd1' }, pAcc: { value: 'acc1' },
        pOwnership: { value: 'SELF' },
        pBeratPerUnit: { value: '0' }, pPanjang: { value: '0' }, pLebar: { value: '0' }, pTinggi: { value: '0' },
      };
      return vals[id] || null;
    },
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/generic/attribute-store.js', 'modules/shop/cobek-etalase.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      toast: () => {},
      save: () => {},
      withSaveGuard: (key, modalId, fn) => fn(),
      closeModal: () => {},
      resolveShopKategori: () => '',
    },
    ['ProductRepository', 'Etalase'],
  );
  let fieldCalls = 0;
  const origField = ctx.ProductRepository.mutateSetField;
  ctx.ProductRepository.mutateSetField = function (...args) { fieldCalls++; return origField.apply(ctx.ProductRepository, args); };
  ctx.Etalase.editIdx = 0;
  ctx.Etalase.renderList = () => {};
  ctx.Etalase.renderModalStat = () => {};
  if (typeof ctx.Etalase.save === 'function') {
    try { ctx.Etalase.save(); } catch (e) { /* DOM-heavy render lain di luar scope, cek hasil data saja */ }
  }
  assert.equal(D.products[0].produsenId, 'prd1');
  assert.ok(fieldCalls >= 1, 'Etalase.save() harus lewat ProductRepository.mutateSetField() utk produsenId');
});
