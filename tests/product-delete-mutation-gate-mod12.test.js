'use strict';
// tests/product-delete-mutation-gate-mod12.test.js — Modul 12 (sesi ini):
// Product Delete Mutation Gate.
//
// Lanjutan langsung Modul 3-11 (ProductRepository, Tahap 4+) — satu-satunya
// mutasi mentah tersisa yang di-audit ulang sesi ini di seluruh
// `modules/shop/*.js` (grep `D.products.push`/`D.produsen.push`/
// `D.products.splice`/`D.produsen.splice`): `Etalase.delete(i)`
// (`cobek-etalase.js`) — `D.products.splice(i,1)` mentah, 0 validasi.
//
// BEDA dari Modul 3-11: TIDAK ADA gate delete produk sebelumnya di
// ProductRepository (beda dari SupplierStore.mutateDelete()/
// CategoryStore.mutateDelete() yang sudah dipakai Modul 7/8) — sesi ini
// membuat method BARU (`ProductRepository.mutateDelete()`, PURE, pola SAMA
// PERSIS SupplierStore.mutateDelete()), sekecil mungkin, khusus utk 1 titik
// ini (bukan wiring ke gate lama seperti Modul 10/11).
//
// Cakupan:
//   A. Unit — ProductRepository.mutateDelete() langsung (isolasi): id ada
//      dihapus (array baru, input tidak dimutasi), id tidak ketemu tetap
//      ok:true (idempotent), products bukan array / id tidak valid -> ok:false.
//   B. Integrasi — Etalase.delete(i) (cobek-etalase.js) benar-benar lewat
//      ProductRepository.mutateDelete(), produk lain di array tidak
//      berubah, urutan array sisanya tetap sama.
//   C. Fallback — tanpa ProductRepository, splice by index PERSIS sama
//      seperti sebelum Modul 12 (guard typeof).
//   D. Edge case index basi (produk di index itu sudah tidak ada) — fallback
//      raw splice PERSIS perilaku lama, 0 perubahan pada kasus tepi ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadRepo() {
  return loadSource(
    ['modules/shop/generic/product-repository.js'],
    {},
    ['ProductRepository'],
  );
}

// === A. Unit =================================================================

test('ProductRepository.mutateDelete() — id ada, dihapus, array baru (input tidak dimutasi)', () => {
  const { ProductRepository } = loadRepo();
  const products = [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }];
  const r = ProductRepository.mutateDelete(products, 'p1');
  assert.equal(r.ok, true);
  assert.deepEqual(r.products.map((p) => p.id), ['p2']);
  assert.equal(products.length, 2, 'array input TIDAK dimutasi (masih 2 item)');
});

test('ProductRepository.mutateDelete() — id tidak ketemu tetap ok:true, array tidak berubah isinya', () => {
  const { ProductRepository } = loadRepo();
  const products = [{ id: 'p1', name: 'A' }];
  const r = ProductRepository.mutateDelete(products, 'tidak-ada');
  assert.equal(r.ok, true);
  assert.deepEqual(r.products.map((p) => p.id), ['p1']);
});

test('ProductRepository.mutateDelete() — products bukan array / id tidak valid -> ok:false', () => {
  const { ProductRepository } = loadRepo();
  assert.equal(ProductRepository.mutateDelete(null, 'p1').ok, false);
  assert.equal(ProductRepository.mutateDelete([{ id: 'p1' }], '').ok, false);
  assert.equal(ProductRepository.mutateDelete([{ id: 'p1' }], '   ').ok, false);
  assert.equal(ProductRepository.mutateDelete([{ id: 'p1' }], undefined).ok, false);
});

test('ProductRepository.mutateDelete() — hapus di tengah array, urutan sisanya tetap sama', () => {
  const { ProductRepository } = loadRepo();
  const products = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];
  const r = ProductRepository.mutateDelete(products, 'p2');
  assert.equal(r.ok, true);
  assert.deepEqual(r.products.map((p) => p.id), ['p1', 'p3']);
});

// === B. Integrasi =============================================================

test('integrasi: cobek-etalase.js Etalase.delete(i) — lewat ProductRepository.mutateDelete(), produk lain tidak berubah', () => {
  const D = {
    products: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }, { id: 'p3', name: 'C' }],
    produsen: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-etalase.js'],
    { D, document: { getElementById: () => ({ style: {} }) }, toast: () => {}, save: () => {}, askConfirm: async () => true, escapeHtml: (s) => s },
    ['Etalase', 'ProductRepository'],
  );
  let deleteCalls = 0;
  const orig = ctx.ProductRepository.mutateDelete;
  ctx.ProductRepository.mutateDelete = function (...args) { deleteCalls++; return orig.apply(ctx.ProductRepository, args); };
  ctx.Etalase.renderList = () => {};
  return ctx.Etalase.delete(1).then(() => {
    assert.deepEqual(D.products.map((p) => p.id), ['p1', 'p3'], 'p2 (index 1) terhapus, p1/p3 tetap ada & urutan sama');
    assert.ok(deleteCalls >= 1, 'delete harus lewat ProductRepository.mutateDelete()');
  });
});

test('integrasi: Etalase.delete(i) — batal (askConfirm false) tidak menghapus apa pun', () => {
  const D = { products: [{ id: 'p1' }, { id: 'p2' }], produsen: [] };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-etalase.js'],
    { D, document: { getElementById: () => ({ style: {} }) }, toast: () => {}, save: () => {}, askConfirm: async () => false, escapeHtml: (s) => s },
    ['Etalase'],
  );
  ctx.Etalase.renderList = () => {};
  return ctx.Etalase.delete(0).then(() => {
    assert.equal(D.products.length, 2, 'askConfirm false -> 0 perubahan (perilaku lama tidak berubah)');
  });
});

// === C. Fallback (tanpa ProductRepository) ===================================

test('integrasi: Etalase.delete(i) — tanpa ProductRepository, fallback splice by index PERSIS lama', () => {
  const D = { products: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }], produsen: [] };
  const ctx = loadSource(
    ['modules/shop/cobek-etalase.js'],
    { D, document: { getElementById: () => ({ style: {} }) }, toast: () => {}, save: () => {}, askConfirm: async () => true, escapeHtml: (s) => s },
    ['Etalase'],
  );
  ctx.Etalase.renderList = () => {};
  return ctx.Etalase.delete(1).then(() => {
    assert.deepEqual(D.products.map((p) => p.id), ['p1', 'p3']);
  });
});

// === D. Edge case: index basi ================================================

test('integrasi: Etalase.delete(i) — index basi (produk sudah tidak ada di index itu) -> fallback raw splice, 0 error', () => {
  const D = { products: [{ id: 'p1' }, { id: 'p2' }], produsen: [] };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-etalase.js'],
    { D, document: { getElementById: () => ({ style: {} }) }, toast: () => {}, save: () => {}, askConfirm: async () => true, escapeHtml: (s) => s },
    ['Etalase'],
  );
  ctx.Etalase.renderList = () => {};
  return ctx.Etalase.delete(99).then(() => {
    // splice(99,1) mentah pada array panjang 2 -> no-op, SAMA PERSIS perilaku
    // sebelum Modul 12 (0 error, 0 perubahan array).
    assert.equal(D.products.length, 2);
  });
});
