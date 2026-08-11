'use strict';
// tests/product-repository-nested-mutation-gate-mod6.test.js — Modul 6
// (Product Repository, sesi ini): Nested Attribute Mutation Gate.
//
// Lanjutan langsung Modul 3/4/5 — menutup 2 issue tersisa yang dicatat
// eksplisit di CHANGELOG-MODUL5.md §"Issue tersisa untuk Modul 6":
//   1. `cobek-tx-cart.js` — kategoriId/produsenId di alur restock kasir
//      (applyTxShopStockFromTx()) — dialihkan ke mutateSetField() (SUDAH
//      ADA sejak Modul 5, hanya wiring baru sesi ini).
//   2. `product.hargaByProdusen[produsenId]=hargaBeli` (nested map
//      per-supplier) — gate BARU: mutateSetHargaProdusen()/
//      mutateDeleteHargaProdusen(), dipakai di 3 titik
//      (cobek-order.js Produsen.saveHarga(), cobek-tx-cart.js
//      applyTxShopStockFromTx(), cobek-etalase.js Etalase.save()).
//
// Cakupan:
//   A. Unit — mutateSetHargaProdusen()/mutateDeleteHargaProdusen() langsung
//      (isolasi, cuma product-repository.js): create/update/overwrite/
//      delete/invalid-key/invalid-value/null/undefined/rollback-safe.
//   B. Integrasi — 3 call site yang di-wire sesi ini benar2 lewat gate &
//      hasil akhir identik business logic lama.

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadSource } = require('./helpers/loadSource');

// setLetGlobal() — inject nilai ke binding top-level `let`/`const` di dalam
// context vm yang sudah di-load loadSource() (mis. `curShopStockCart` di
// cobek-tx-cart.js). loadSource() TIDAK menempelkan binding let/const ke
// objek context (dicatat eksplisit di komentar loadSource.js) — assignment
// context.prop=... biasa TIDAK terbaca oleh closure yang me-reference
// binding lexical aslinya, jadi perlu dieksekusi SEBAGAI script di context
// yang sama (assignment tanpa `let`/`const` di script baru resolve ke
// binding lexical luar yang sudah ada, bukan bikin property baru).
function setLetGlobal(ctx, name, value) {
  new vm.Script(`${name} = ${JSON.stringify(value)};`, { filename: 'inject-let-global' }).runInContext(ctx);
}

function loadRepo() {
  return loadSource(['modules/shop/generic/product-repository.js'], {}, ['ProductRepository']);
}

// === A. Unit: mutateSetHargaProdusen()/mutateDeleteHargaProdusen() =========

test('ProductRepository.mutateSetHargaProdusen() — create: map belum ada, dibuat lalu diisi', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1' };
  const r = ProductRepository.mutateSetHargaProdusen(p, 'prd1', 12000);
  assert.equal(r.ok, true);
  assert.equal(r.produsenId, 'prd1');
  assert.equal(r.value, 12000);
  assert.deepEqual(JSON.parse(JSON.stringify(p.hargaByProdusen)), { prd1: 12000 });
});

test('ProductRepository.mutateSetHargaProdusen() — update: key sudah ada, value diganti', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaByProdusen: { prd1: 5000 } };
  const r = ProductRepository.mutateSetHargaProdusen(p, 'prd1', 9000);
  assert.equal(r.ok, true);
  assert.equal(p.hargaByProdusen.prd1, 9000);
});

test('ProductRepository.mutateSetHargaProdusen() — overwrite: key produsen lain di map yang sama tidak terganggu', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaByProdusen: { prd1: 5000, prd2: 7000 } };
  const r = ProductRepository.mutateSetHargaProdusen(p, 'prd1', 6000);
  assert.equal(r.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(p.hargaByProdusen)), { prd1: 6000, prd2: 7000 });
});

test('ProductRepository.mutateDeleteHargaProdusen() — delete: key ada, dihapus', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaByProdusen: { prd1: 5000, prd2: 7000 } };
  const r = ProductRepository.mutateDeleteHargaProdusen(p, 'prd1');
  assert.equal(r.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(p.hargaByProdusen)), { prd2: 7000 });
});

test('ProductRepository.mutateDeleteHargaProdusen() — idempotent: key sudah tidak ada tetap ok:true, map lain tidak berubah', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaByProdusen: { prd2: 7000 } };
  const r = ProductRepository.mutateDeleteHargaProdusen(p, 'prd1');
  assert.equal(r.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(p.hargaByProdusen)), { prd2: 7000 });
});

test('ProductRepository.mutateSetHargaProdusen() — invalid key (kosong/whitespace/null/undefined/angka) ditolak, map TIDAK disentuh', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaByProdusen: { prd1: 5000 } };
  assert.equal(ProductRepository.mutateSetHargaProdusen(p, '', 9000).ok, false);
  assert.equal(ProductRepository.mutateSetHargaProdusen(p, '   ', 9000).ok, false);
  assert.equal(ProductRepository.mutateSetHargaProdusen(p, null, 9000).ok, false);
  assert.equal(ProductRepository.mutateSetHargaProdusen(p, undefined, 9000).ok, false);
  assert.equal(ProductRepository.mutateSetHargaProdusen(p, 123, 9000).ok, false);
  assert.deepEqual(JSON.parse(JSON.stringify(p.hargaByProdusen)), { prd1: 5000 }); // tidak berubah sama sekali
});

test('ProductRepository.mutateSetHargaProdusen() — invalid value (NaN/Infinity/string/undefined) ditolak, map TIDAK disentuh', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaByProdusen: { prd1: 5000 } };
  assert.equal(ProductRepository.mutateSetHargaProdusen(p, 'prd1', NaN).ok, false);
  assert.equal(ProductRepository.mutateSetHargaProdusen(p, 'prd1', Infinity).ok, false);
  assert.equal(ProductRepository.mutateSetHargaProdusen(p, 'prd1', '9000').ok, false);
  assert.equal(ProductRepository.mutateSetHargaProdusen(p, 'prd1', undefined).ok, false);
  assert.deepEqual(JSON.parse(JSON.stringify(p.hargaByProdusen)), { prd1: 5000 }); // tetap nilai lama, TIDAK jadi NaN
});

test('ProductRepository.mutateSetHargaProdusen() — value null ditolak (beda dari hargaReseller — di sini null bukan "belum diisi")', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaByProdusen: { prd1: 5000 } };
  const r = ProductRepository.mutateSetHargaProdusen(p, 'prd1', null);
  assert.equal(r.ok, false);
  assert.equal(p.hargaByProdusen.prd1, 5000);
});

test('ProductRepository.mutateSetHargaProdusen() — value negatif diklem ke 0 (aturan sama validatePriceValue())', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1' };
  const r = ProductRepository.mutateSetHargaProdusen(p, 'prd1', -500);
  assert.equal(r.ok, true);
  assert.equal(p.hargaByProdusen.prd1, 0);
});

test('ProductRepository.mutateSetHargaProdusen()/mutateDeleteHargaProdusen() — produk tidak valid (null/array/primitif) -> ok:false', () => {
  const { ProductRepository } = loadRepo();
  assert.equal(ProductRepository.mutateSetHargaProdusen(null, 'prd1', 100).ok, false);
  assert.equal(ProductRepository.mutateSetHargaProdusen([], 'prd1', 100).ok, false);
  assert.equal(ProductRepository.mutateSetHargaProdusen('x', 'prd1', 100).ok, false);
  assert.equal(ProductRepository.mutateDeleteHargaProdusen(null, 'prd1').ok, false);
  assert.equal(ProductRepository.mutateDeleteHargaProdusen([], 'prd1').ok, false);
});

test('rollback bila gagal: beberapa panggilan gate berturut-turut, satu gagal di tengah, TIDAK merusak state field lain (nested & skalar)', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', kategoriId: 'kat_lama', hargaByProdusen: { prd1: 1000 } };
  assert.equal(ProductRepository.mutateSetHargaProdusen(p, 'prd2', 2000).ok, true);
  assert.equal(ProductRepository.mutateSetField(p, 'kategoriId', 'kat_baru').ok, true);
  assert.equal(ProductRepository.mutateSetHargaProdusen(p, 'prd1', NaN).ok, false); // gagal di tengah
  assert.equal(ProductRepository.mutateDeleteHargaProdusen(p, 'prd2').ok, true);
  // state akhir: prd1 tetap 1000 lama (panggilan gagal tidak menyentuh), prd2 terhapus,
  // kategoriId tetap 'kat_baru' dari panggilan sukses sebelumnya (tidak ikut rollback)
  assert.deepEqual(JSON.parse(JSON.stringify(p.hargaByProdusen)), { prd1: 1000 });
  assert.equal(p.kategoriId, 'kat_baru');
});

// === B. Integrasi ===========================================================

test('integrasi: cobek-order.js Produsen.saveHarga() — SET (val>0) lewat mutateSetHargaProdusen(), hasil sama seperti sebelumnya', () => {
  const D = {
    products: [{ id: 'p1', name: 'Cobek 20cm', hargaByProdusen: {} }],
    produsen: [{ id: 'prd1', name: 'Toko Batu' }],
  };
  const fakeInputs = [{ getAttribute: () => 'p1', value: '15000' }];
  const fakeDocument = {
    getElementById: () => ({}),
    querySelectorAll: (sel) => (sel.includes('produsenHargaList') ? fakeInputs : []),
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-order.js'],
    { D, document: fakeDocument, toast: () => {}, save: () => {}, closeModal: () => {}, askConfirm: async () => true, renderProductList: () => {} },
    ['Produsen', 'ProductRepository'],
  );
  let setCalls = 0;
  const origSet = ctx.ProductRepository.mutateSetHargaProdusen;
  ctx.ProductRepository.mutateSetHargaProdusen = function (...args) { setCalls++; return origSet.apply(ctx.ProductRepository, args); };
  ctx.Produsen.hargaEditId = 'prd1';
  ctx.Produsen.renderList = () => {};
  ctx.Produsen.saveHarga();
  assert.equal(D.products[0].hargaByProdusen.prd1, 15000);
  assert.ok(setCalls >= 1, 'SET hargaByProdusen harus lewat ProductRepository.mutateSetHargaProdusen()');
});

test('integrasi: cobek-order.js Produsen.saveHarga() — DELETE (val<=0/kosong) lewat mutateDeleteHargaProdusen(), hasil sama seperti sebelumnya', () => {
  const D = {
    products: [{ id: 'p1', name: 'Cobek 20cm', hargaByProdusen: { prd1: 8000 } }],
    produsen: [{ id: 'prd1', name: 'Toko Batu' }],
  };
  const fakeInputs = [{ getAttribute: () => 'p1', value: '0' }];
  const fakeDocument = {
    getElementById: () => ({}),
    querySelectorAll: (sel) => (sel.includes('produsenHargaList') ? fakeInputs : []),
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-order.js'],
    { D, document: fakeDocument, toast: () => {}, save: () => {}, closeModal: () => {}, askConfirm: async () => true, renderProductList: () => {} },
    ['Produsen', 'ProductRepository'],
  );
  let delCalls = 0;
  const origDel = ctx.ProductRepository.mutateDeleteHargaProdusen;
  ctx.ProductRepository.mutateDeleteHargaProdusen = function (...args) { delCalls++; return origDel.apply(ctx.ProductRepository, args); };
  ctx.Produsen.hargaEditId = 'prd1';
  ctx.Produsen.renderList = () => {};
  ctx.Produsen.saveHarga();
  assert.equal(D.products[0].hargaByProdusen.prd1, undefined);
  assert.ok(delCalls >= 1, 'DELETE hargaByProdusen harus lewat ProductRepository.mutateDeleteHargaProdusen()');
});

test('integrasi: cobek-tx-cart.js applyTxShopStockFromTx() — restock produk existing: kategoriId/produsenId/hargaByProdusen lewat gate', () => {
  const D = {
    products: [{ id: 'p1', name: 'Semen', stock: 3, hargaBeli: 50000, hargaJual: 60000, kategoriId: '', produsenId: '', hargaByProdusen: {} }],
    cobekKategori: [],
    transactions: [{ id: 'tx1' }],
  };
  let uidN = 0;
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-tx-cart.js'],
    { D, uid: () => 'uid_' + (++uidN), toast: () => {}, renderProductList: () => {}, fmtFull: (n) => String(n) },
    ['ProductRepository'],
  );
  let fieldCalls = 0, nestedCalls = 0;
  const origField = ctx.ProductRepository.mutateSetField;
  ctx.ProductRepository.mutateSetField = function (...args) { fieldCalls++; return origField.apply(ctx.ProductRepository, args); };
  const origNested = ctx.ProductRepository.mutateSetHargaProdusen;
  ctx.ProductRepository.mutateSetHargaProdusen = function (...args) { nestedCalls++; return origNested.apply(ctx.ProductRepository, args); };

  setLetGlobal(ctx, 'curShopStockCart', [
    { isNew: false, productId: 'p1', kategoriInput: 'Bahan Bangunan', qty: 5, hargaBeli: 52000, hargaJual: 60000, produsenId: 'prd1' },
  ]);
  ctx.applyTxShopStockFromTx('tx1', '', null);

  const p = D.products[0];
  assert.equal(p.stock, 8);
  assert.equal(p.hargaBeli, 52000);
  assert.equal(p.produsenId, 'prd1');
  assert.equal(p.hargaByProdusen.prd1, 52000);
  assert.ok(p.kategoriId, 'kategoriId harus ter-set (via resolveShopKategori + gate)');
  assert.ok(fieldCalls >= 2, 'kategoriId & produsenId harus lewat ProductRepository.mutateSetField()');
  assert.ok(nestedCalls >= 1, 'hargaByProdusen harus lewat ProductRepository.mutateSetHargaProdusen()');
});

test('integrasi: cobek-tx-cart.js applyTxShopStockFromTx() — produk baru (isNew): kategoriId awal via createProduct() field merge (Modul 11, bukan mutateSetField() gate), TIDAK error', () => {
  const D = {
    products: [],
    cobekKategori: [],
    transactions: [{ id: 'tx1' }],
  };
  let uidN = 0;
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-tx-cart.js'],
    { D, uid: () => 'uid_' + (++uidN), toast: () => {}, renderProductList: () => {}, fmtFull: (n) => String(n) },
    ['ProductRepository'],
  );
  setLetGlobal(ctx, 'curShopStockCart', [
    { isNew: true, name: 'Produk Baru', kategoriInput: 'Kategori X', qty: 10, hargaBeli: 1000, hargaJual: 1500, produsenId: 'prd9' },
  ]);
  ctx.applyTxShopStockFromTx('tx1', '', null);
  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.stock, 10);
  assert.equal(p.produsenId, 'prd9');
  assert.equal(p.hargaByProdusen.prd9, 1000);
});

test('integrasi: cobek-etalase.js Etalase.save() (edit produk) — SET hargaByProdusen lewat gate, hasil sama seperti sebelumnya', () => {
  const D = {
    products: [{ id: 'p1', name: 'Cobek 20cm', stock: 5, hargaBeli: 10000, hargaJual: 20000, hargaReseller: null, diskonPersen: 0, kategoriId: '', beratPerUnit: 0, panjang: 0, lebar: 0, tinggi: 0, ownership: 'SELF', produsenId: '', hargaByProdusen: {} }],
    produsen: [{ id: 'prd1', name: 'Toko Batu' }], cobekKategori: [], accounts: [{ id: 'acc1' }],
  };
  const fakeDocument = {
    getElementById(id) {
      const vals = {
        pName: { value: 'Cobek 20cm' }, pStock: { value: '5' }, pBeli: { value: '11000' },
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
  let nestedCalls = 0;
  const origNested = ctx.ProductRepository.mutateSetHargaProdusen;
  ctx.ProductRepository.mutateSetHargaProdusen = function (...args) { nestedCalls++; return origNested.apply(ctx.ProductRepository, args); };
  ctx.Etalase.editIdx = 0;
  ctx.Etalase.renderList = () => {};
  ctx.Etalase.renderModalStat = () => {};
  if (typeof ctx.Etalase.save === 'function') {
    try { ctx.Etalase.save(); } catch (e) { /* DOM-heavy render lain di luar scope */ }
  }
  assert.equal(D.products[0].hargaByProdusen.prd1, 11000);
  assert.ok(nestedCalls >= 1, 'Etalase.save() harus lewat ProductRepository.mutateSetHargaProdusen() utk hargaByProdusen');
});

test('integrasi: seluruh caller lama tetap bekerja tanpa ProductRepository (fallback mentah, guard typeof)', () => {
  // Simulasi modul tidak dimuat: HANYA cobek-order.js (tanpa product-repository.js)
  const D = {
    products: [{ id: 'p1', name: 'Cobek 20cm', hargaByProdusen: { prd1: 5000 } }],
    produsen: [{ id: 'prd1', name: 'Toko Batu' }],
  };
  const fakeInputs = [{ getAttribute: () => 'p1', value: '9000' }];
  const fakeDocument = {
    getElementById: () => ({}),
    querySelectorAll: (sel) => (sel.includes('produsenHargaList') ? fakeInputs : []),
  };
  const ctx = loadSource(
    ['modules/shop/cobek-order.js'], // ProductRepository TIDAK dimuat sama sekali
    { D, document: fakeDocument, toast: () => {}, save: () => {}, closeModal: () => {}, askConfirm: async () => true, renderProductList: () => {} },
    ['Produsen'],
  );
  assert.equal(typeof ctx.ProductRepository, 'undefined');
  ctx.Produsen.hargaEditId = 'prd1';
  ctx.Produsen.renderList = () => {};
  ctx.Produsen.saveHarga();
  assert.equal(D.products[0].hargaByProdusen.prd1, 9000); // fallback mentah tetap jalan
});
