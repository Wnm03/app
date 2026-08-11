'use strict';
// tests/category-mutation-gate-mod8.test.js — Modul 8 (CategoryStore, sesi
// ini): Category Mutation Gate.
//
// Lanjutan langsung Modul 3-7 (ProductRepository/SupplierStore) — SSOT baru
// utk sisi TULIS Category (`D.cobekKategori`), menutup 3 titik mutasi mentah:
//   1. `resolveShopKategori()` (cobek-tx-cart.js)     -> CategoryStore.mutateResolve()
//   2. `Etalase.addKategoriManual()` cabang edit (cobek-etalase.js)
//                                                       -> CategoryStore.mutateRename()
//   3. `Etalase.delKategori()` (cobek-etalase.js)       -> CategoryStore.mutateDelete()
//
// Cakupan:
//   A. Unit — mutateResolve()/mutateRename()/mutateDelete() langsung
//      (isolasi, cuma category-store.js + reuse validator ProductRepository).
//   B. Integrasi — 2 call site yang di-wire sesi ini benar-benar lewat gate
//      & hasil akhir identik business logic lama.
//   C. Fallback — caller lama tetap bekerja tanpa CategoryStore (guard typeof).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadStore() {
  return loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/generic/category-store.js'],
    {},
    ['CategoryStore', 'ProductRepository'],
  );
}

// === A. Unit ================================================================

test('CategoryStore.mutateResolve() — nama baru -> kategori dibuat, id ck_ prefix', () => {
  const { CategoryStore } = loadStore();
  const r = CategoryStore.mutateResolve([], 'Batu Alam');
  assert.equal(r.ok, true);
  assert.equal(r.created, true);
  assert.equal(r.categories.length, 1);
  assert.equal(r.categories[0].name, 'Batu Alam');
  assert.ok(r.id.startsWith('ck_'), 'id harus pakai prefix ck_ (mekanisme lama)');
});

test('CategoryStore.mutateResolve() — nama sudah ada (case-insensitive) -> reuse, tidak duplikat', () => {
  const { CategoryStore } = loadStore();
  const existing = [{ id: 'ck_1', name: 'Batu Alam' }];
  const r = CategoryStore.mutateResolve(existing, 'batu alam');
  assert.equal(r.ok, true);
  assert.equal(r.created, false);
  assert.equal(r.id, 'ck_1');
  assert.equal(r.categories, existing, 'array TIDAK boleh diganti kalau tidak ada yang dibuat');
});

test('CategoryStore.mutateResolve() — input asli TIDAK dimutasi (PURE)', () => {
  const { CategoryStore } = loadStore();
  const existing = [{ id: 'ck_1', name: 'Lama' }];
  const r = CategoryStore.mutateResolve(existing, 'Baru');
  assert.equal(existing.length, 1, 'array lama tidak boleh berubah panjang');
  assert.equal(r.categories.length, 2);
});

test('CategoryStore.mutateResolve() — nama kosong/whitespace/tidak valid ditolak, tidak membuat kategori', () => {
  const { CategoryStore } = loadStore();
  assert.equal(CategoryStore.mutateResolve([], '').ok, false);
  assert.equal(CategoryStore.mutateResolve([], '   ').ok, false);
  assert.equal(CategoryStore.mutateResolve([], 123).ok, false);
  assert.equal(CategoryStore.mutateResolve([], undefined).ok, false);
});

test('CategoryStore.mutateResolve() — categories tidak valid (bukan array) -> ok:false', () => {
  const { CategoryStore } = loadStore();
  assert.equal(CategoryStore.mutateResolve(null, 'x').ok, false);
  assert.equal(CategoryStore.mutateResolve({}, 'x').ok, false);
});

test('CategoryStore.mutateRename() — nama valid ditulis in-place', () => {
  const { CategoryStore } = loadStore();
  const kat = { id: 'ck_1', name: 'Lama' };
  const r = CategoryStore.mutateRename(kat, 'Baru');
  assert.equal(r.ok, true);
  assert.equal(kat.name, 'Baru');
});

test('CategoryStore.mutateRename() — nama kosong ditolak, category TIDAK berubah sama sekali', () => {
  const { CategoryStore } = loadStore();
  const kat = { id: 'ck_1', name: 'Lama' };
  const r = CategoryStore.mutateRename(kat, '   ');
  assert.equal(r.ok, false);
  assert.equal(kat.name, 'Lama');
});

test('CategoryStore.mutateRename() — category tidak valid (null/array/primitif) -> ok:false', () => {
  const { CategoryStore } = loadStore();
  assert.equal(CategoryStore.mutateRename(null, 'x').ok, false);
  assert.equal(CategoryStore.mutateRename([], 'x').ok, false);
  assert.equal(CategoryStore.mutateRename('x', 'x').ok, false);
});

test('CategoryStore.mutateDelete() — hapus by id, balikin array baru (PURE)', () => {
  const { CategoryStore } = loadStore();
  const cats = [{ id: 'ck_1', name: 'A' }, { id: 'ck_2', name: 'B' }];
  const r = CategoryStore.mutateDelete(cats, 'ck_1');
  assert.equal(r.ok, true);
  assert.deepEqual(r.categories.map((c) => c.id), ['ck_2']);
  assert.equal(cats.length, 2, 'array input asli TIDAK boleh dimutasi');
});

test('CategoryStore.mutateDelete() — id tidak ketemu tetap ok:true, array tidak berubah isi', () => {
  const { CategoryStore } = loadStore();
  const cats = [{ id: 'ck_1', name: 'A' }];
  const r = CategoryStore.mutateDelete(cats, 'ck_ghaib');
  assert.equal(r.ok, true);
  assert.equal(r.categories.length, 1);
});

test('CategoryStore.mutateDelete() — id/categories tidak valid -> ok:false', () => {
  const { CategoryStore } = loadStore();
  assert.equal(CategoryStore.mutateDelete(null, 'ck_1').ok, false);
  assert.equal(CategoryStore.mutateDelete([{ id: 'ck_1' }], '').ok, false);
  assert.equal(CategoryStore.mutateDelete([{ id: 'ck_1' }], '   ').ok, false);
});

test('CategoryStore.label()/find()/list() — read path lama tetap utuh (tidak disentuh sesi ini)', () => {
  const D = { cobekKategori: [{ id: 'ck_1', name: 'Kecil' }] };
  const ctx = loadSource(['modules/shop/generic/category-store.js'], { D }, ['CategoryStore']);
  assert.equal(ctx.CategoryStore.list().length, 1);
  assert.equal(ctx.CategoryStore.label('ck_1'), 'Kecil');
  assert.equal(ctx.CategoryStore.label('ck_ghaib'), '');
});

// === B. Integrasi ===========================================================

test('integrasi: cobek-tx-cart.js resolveShopKategori() — lewat CategoryStore.mutateResolve()', () => {
  const D = { cobekKategori: [] };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/generic/category-store.js', 'modules/shop/cobek-tx-cart.js'],
    { D, document: { getElementById: () => ({}) } },
    ['resolveShopKategori', 'CategoryStore'],
  );
  let resolveCalls = 0;
  const orig = ctx.CategoryStore.mutateResolve;
  ctx.CategoryStore.mutateResolve = function (...args) { resolveCalls++; return orig.apply(ctx.CategoryStore, args); };
  const id1 = ctx.resolveShopKategori('Sedang');
  const id2 = ctx.resolveShopKategori('sedang');
  assert.equal(D.cobekKategori.length, 1, 'kategori sama (case-insensitive) tidak boleh duplikat');
  assert.equal(id1, id2);
  assert.ok(resolveCalls >= 2, 'resolveShopKategori harus lewat CategoryStore.mutateResolve()');
  assert.equal(ctx.resolveShopKategori(''), '', 'string kosong tetap balik "" (perilaku lama)');
});

test('integrasi: cobek-etalase.js Etalase.addKategoriManual() cabang edit — lewat CategoryStore.mutateRename()', () => {
  const D = { cobekKategori: [{ id: 'ck_1', name: 'Kecil' }], products: [] };
  const inputEl = { value: 'Sedang' };
  const fakeDocument = {
    getElementById: (id) => {
      if (id === 'cobekKategoriNewInput') return inputEl;
      if (id === 'cobekKategoriAddBtn') return { textContent: '' };
      if (id === 'cobekKategoriCancelBtn') return { style: {} };
      return { style: {} };
    },
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/generic/category-store.js', 'modules/shop/cobek-etalase.js'],
    { D, document: fakeDocument, toast: () => {}, save: () => {}, askConfirm: async () => true, escapeHtml: (s) => s },
    ['Etalase', 'CategoryStore'],
  );
  let renameCalls = 0;
  const orig = ctx.CategoryStore.mutateRename;
  ctx.CategoryStore.mutateRename = function (...args) { renameCalls++; return orig.apply(ctx.CategoryStore, args); };
  ctx.Etalase.katEditId = 'ck_1';
  ctx.Etalase.renderKategoriList = () => {};
  ctx.Etalase.renderList = () => {};
  ctx.Etalase.addKategoriManual();
  assert.equal(D.cobekKategori[0].name, 'Sedang');
  assert.ok(renameCalls >= 1, 'rename harus lewat CategoryStore.mutateRename()');
});

test('integrasi: cobek-etalase.js Etalase.delKategori() — lewat CategoryStore.mutateDelete(), kategoriId produk terkait tetap ter-clear', () => {
  const D = {
    cobekKategori: [{ id: 'ck_1', name: 'A' }, { id: 'ck_2', name: 'B' }],
    products: [{ id: 'p1', kategoriId: 'ck_1' }, { id: 'p2', kategoriId: 'ck_2' }],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/generic/category-store.js', 'modules/shop/cobek-etalase.js'],
    { D, document: { getElementById: () => ({ style: {} }) }, toast: () => {}, save: () => {}, askConfirm: async () => true, escapeHtml: (s) => s },
    ['Etalase', 'CategoryStore'],
  );
  let deleteCalls = 0;
  const orig = ctx.CategoryStore.mutateDelete;
  ctx.CategoryStore.mutateDelete = function (...args) { deleteCalls++; return orig.apply(ctx.CategoryStore, args); };
  ctx.Etalase.renderKategoriList = () => {};
  ctx.Etalase.renderList = () => {};
  return ctx.Etalase.delKategori('ck_1').then(() => {
    assert.deepEqual(D.cobekKategori.map((c) => c.id), ['ck_2']);
    assert.equal(D.products[0].kategoriId, '', 'sisi-efek clear kategoriId produk TETAP jalan (di luar scope gate, sengaja raw)');
    assert.equal(D.products[1].kategoriId, 'ck_2');
    assert.ok(deleteCalls >= 1, 'delete harus lewat CategoryStore.mutateDelete()');
  });
});

// === C. Fallback (tanpa CategoryStore) =====================================

test('integrasi: seluruh caller lama tetap bekerja tanpa CategoryStore (fallback mentah, guard typeof)', () => {
  const D = { cobekKategori: [], products: [] };
  const ctxCart = loadSource(
    ['modules/shop/cobek-tx-cart.js'],
    { D, document: { getElementById: () => ({}) }, uid: () => Date.now() },
    ['resolveShopKategori'],
  );
  const id = ctxCart.resolveShopKategori('Tanpa Gate');
  assert.equal(D.cobekKategori.length, 1);
  assert.equal(D.cobekKategori[0].id, id);

  const D2 = { cobekKategori: [{ id: 'ck_1', name: 'Lama' }], products: [] };
  const inputEl = { value: 'Ganti' };
  const fakeDocument = {
    getElementById: (id2) => {
      if (id2 === 'cobekKategoriNewInput') return inputEl;
      return { style: {} };
    },
  };
  const ctxEtalase = loadSource(
    ['modules/shop/cobek-etalase.js'],
    { D: D2, document: fakeDocument, toast: () => {}, save: () => {}, askConfirm: async () => true, escapeHtml: (s) => s },
    ['Etalase'],
  );
  ctxEtalase.Etalase.katEditId = 'ck_1';
  ctxEtalase.Etalase.renderKategoriList = () => {};
  ctxEtalase.Etalase.renderList = () => {};
  ctxEtalase.Etalase.addKategoriManual();
  assert.equal(D2.cobekKategori[0].name, 'Ganti');
});
