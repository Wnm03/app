'use strict';
// tests/supplier-mutation-gate-mod7.test.js — Modul 7 (SupplierStore, sesi
// ini): Supplier Mutation Gate.
//
// Lanjutan langsung Modul 3-6 (ProductRepository) — SSOT baru utk sisi TULIS
// Supplier (`D.produsen`), menutup 4 titik mutasi mentah:
//   1. `Produsen.save()` (cobek-order.js) — create -> SupplierStore.mutateCreate()
//   2. `Produsen.save()` (cobek-order.js) — update -> SupplierStore.mutateUpdate()
//   3. `Produsen.delete()` (cobek-order.js)          -> SupplierStore.mutateDelete()
//   4. `OngkirCalc.saveProdusenPref()` (cobek-pricing.js) -> SupplierStore.mutateSetRoute()
//
// Cakupan:
//   A. Unit — mutateCreate()/mutateUpdate()/mutateDelete()/mutateSetRoute()
//      langsung (isolasi, cuma supplier-store.js + reuse validator
//      ProductRepository): create/update/delete/invalid-name/invalid-angka/
//      optional-fields-kosong/rollback.
//   B. Integrasi — 3 call site yang di-wire sesi ini (Produsen.save() create
//      & edit, Produsen.delete(), OngkirCalc.saveProdusenPref()) benar-benar
//      lewat gate & hasil akhir identik business logic lama.
//   C. Fallback — seluruh caller lama tetap bekerja tanpa SupplierStore
//      (guard typeof).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadStore() {
  return loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/generic/supplier-store.js'],
    {},
    ['SupplierStore', 'ProductRepository'],
  );
}

// === A. Unit ================================================================

test('SupplierStore.mutateCreate() — nama valid, contact/note diisi', () => {
  const { SupplierStore } = loadStore();
  const r = SupplierStore.mutateCreate({ name: 'UD Batu Alam', contact: '0812xxxx', note: 'supplier batu' });
  assert.equal(r.ok, true);
  assert.equal(r.supplier.name, 'UD Batu Alam');
  assert.equal(r.supplier.contact, '0812xxxx');
  assert.equal(r.supplier.note, 'supplier batu');
  assert.ok(r.supplier.id && r.supplier.id.startsWith('prd_'), 'id harus pakai prefix prd_ (mekanisme lama)');
});

test('SupplierStore.mutateCreate() — contact/note opsional, boleh kosong/tidak dikirim', () => {
  const { SupplierStore } = loadStore();
  const r = SupplierStore.mutateCreate({ name: 'Toko Baru' });
  assert.equal(r.ok, true);
  assert.equal(r.supplier.contact, '');
  assert.equal(r.supplier.note, '');
});

test('SupplierStore.mutateCreate() — nama kosong/whitespace/tidak ada ditolak', () => {
  const { SupplierStore } = loadStore();
  assert.equal(SupplierStore.mutateCreate({ name: '' }).ok, false);
  assert.equal(SupplierStore.mutateCreate({ name: '   ' }).ok, false);
  assert.equal(SupplierStore.mutateCreate({}).ok, false);
  assert.equal(SupplierStore.mutateCreate({ name: 123 }).ok, false);
});

test('SupplierStore.mutateCreate() — fields tidak valid (null/array/primitif) -> ok:false', () => {
  const { SupplierStore } = loadStore();
  assert.equal(SupplierStore.mutateCreate(null).ok, false);
  assert.equal(SupplierStore.mutateCreate([]).ok, false);
  assert.equal(SupplierStore.mutateCreate('x').ok, false);
});

test('SupplierStore.mutateUpdate() — update in-place, nama & field lain ditulis', () => {
  const { SupplierStore } = loadStore();
  const pr = { id: 'prd1', name: 'Lama', contact: '', note: '' };
  const r = SupplierStore.mutateUpdate(pr, { name: 'Baru', contact: '0899', note: 'catatan baru' });
  assert.equal(r.ok, true);
  assert.equal(pr.name, 'Baru');
  assert.equal(pr.contact, '0899');
  assert.equal(pr.note, 'catatan baru');
});

test('SupplierStore.mutateUpdate() — nama kosong ditolak, supplier TIDAK berubah sama sekali', () => {
  const { SupplierStore } = loadStore();
  const pr = { id: 'prd1', name: 'Lama', contact: 'x', note: 'y' };
  const r = SupplierStore.mutateUpdate(pr, { name: '', contact: 'BARU', note: 'BARU' });
  assert.equal(r.ok, false);
  assert.equal(pr.name, 'Lama');
  assert.equal(pr.contact, 'x');
  assert.equal(pr.note, 'y');
});

test('SupplierStore.mutateUpdate() — key contact/note yang tidak dikirim tidak menimpa nilai lama', () => {
  const { SupplierStore } = loadStore();
  const pr = { id: 'prd1', name: 'Lama', contact: 'kontak-lama', note: 'catatan-lama' };
  const r = SupplierStore.mutateUpdate(pr, { name: 'Baru' });
  assert.equal(r.ok, true);
  assert.equal(pr.contact, 'kontak-lama');
  assert.equal(pr.note, 'catatan-lama');
});

test('SupplierStore.mutateUpdate() — supplier/changes tidak valid -> ok:false', () => {
  const { SupplierStore } = loadStore();
  assert.equal(SupplierStore.mutateUpdate(null, { name: 'x' }).ok, false);
  assert.equal(SupplierStore.mutateUpdate({ id: 'p1' }, null).ok, false);
  assert.equal(SupplierStore.mutateUpdate([], { name: 'x' }).ok, false);
});

test('SupplierStore.mutateDelete() — id ada, dihapus, array baru (input tidak dimutasi)', () => {
  const { SupplierStore } = loadStore();
  const suppliers = [{ id: 'prd1', name: 'A' }, { id: 'prd2', name: 'B' }];
  const r = SupplierStore.mutateDelete(suppliers, 'prd1');
  assert.equal(r.ok, true);
  assert.deepEqual(r.suppliers.map((s) => s.id), ['prd2']);
  assert.equal(suppliers.length, 2, 'array input TIDAK boleh dimutasi (pure)');
});

test('SupplierStore.mutateDelete() — id tidak ketemu tetap ok:true, array tidak berubah isinya', () => {
  const { SupplierStore } = loadStore();
  const suppliers = [{ id: 'prd1', name: 'A' }];
  const r = SupplierStore.mutateDelete(suppliers, 'tidak-ada');
  assert.equal(r.ok, true);
  assert.deepEqual(r.suppliers.map((s) => s.id), ['prd1']);
});

test('SupplierStore.mutateDelete() — suppliers bukan array / id tidak valid -> ok:false', () => {
  const { SupplierStore } = loadStore();
  assert.equal(SupplierStore.mutateDelete(null, 'prd1').ok, false);
  assert.equal(SupplierStore.mutateDelete([{ id: 'prd1' }], '').ok, false);
});

test('SupplierStore.mutateSetRoute() — angka valid, ditulis in-place', () => {
  const { SupplierStore } = loadStore();
  const pr = { id: 'prd1', name: 'A' };
  const r = SupplierStore.mutateSetRoute(pr, 20, 3000);
  assert.equal(r.ok, true);
  assert.equal(pr.jarakKm, 20);
  assert.equal(pr.biayaPerKm, 3000);
});

test('SupplierStore.mutateSetRoute() — nilai negatif diklem ke 0 (aturan sama validatePriceValue())', () => {
  const { SupplierStore } = loadStore();
  const pr = { id: 'prd1', name: 'A' };
  const r = SupplierStore.mutateSetRoute(pr, -5, 3000);
  assert.equal(r.ok, true);
  assert.equal(pr.jarakKm, 0);
});

test('SupplierStore.mutateSetRoute() — NaN/Infinity/string ditolak, supplier TIDAK disentuh', () => {
  const { SupplierStore } = loadStore();
  const pr = { id: 'prd1', name: 'A', jarakKm: 10, biayaPerKm: 1000 };
  const r1 = SupplierStore.mutateSetRoute(pr, NaN, 1000);
  assert.equal(r1.ok, false);
  assert.equal(pr.jarakKm, 10, 'jarakKm lama TIDAK boleh berubah kalau gagal');
  const r2 = SupplierStore.mutateSetRoute(pr, 10, 'bukan-angka');
  assert.equal(r2.ok, false);
  assert.equal(pr.biayaPerKm, 1000, 'biayaPerKm lama TIDAK boleh berubah kalau gagal');
});

test('SupplierStore.mutateSetRoute() — supplier tidak valid -> ok:false', () => {
  const { SupplierStore } = loadStore();
  assert.equal(SupplierStore.mutateSetRoute(null, 10, 1000).ok, false);
  assert.equal(SupplierStore.mutateSetRoute([], 10, 1000).ok, false);
});

// === B. Integrasi ===========================================================

test('integrasi: cobek-order.js Produsen.save() — CREATE lewat SupplierStore.mutateCreate()', () => {
  const D = { produsen: [], products: [] };
  const fakeDocument = {
    getElementById: (id) => {
      if (id === 'prName') return { value: 'UD Batu Baru' };
      if (id === 'prContact') return { value: '0812' };
      if (id === 'prNote') return { value: 'catatan' };
      return {};
    },
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/generic/supplier-store.js', 'modules/shop/cobek-order.js'],
    { D, document: fakeDocument, toast: () => {}, save: () => {}, closeModal: () => {}, askConfirm: async () => true, withSaveGuard: (key, modalId, fn) => fn() },
    ['Produsen', 'SupplierStore'],
  );
  let createCalls = 0;
  const origCreate = ctx.SupplierStore.mutateCreate;
  ctx.SupplierStore.mutateCreate = function (...args) { createCalls++; return origCreate.apply(ctx.SupplierStore, args); };
  ctx.Produsen.editId = null;
  ctx.Produsen.renderList = () => {};
  ctx.Produsen.save();
  assert.equal(D.produsen.length, 1);
  assert.equal(D.produsen[0].name, 'UD Batu Baru');
  assert.equal(D.produsen[0].contact, '0812');
  assert.ok(createCalls >= 1, 'create harus lewat SupplierStore.mutateCreate()');
});

test('integrasi: cobek-order.js Produsen.save() — UPDATE lewat SupplierStore.mutateUpdate()', () => {
  const D = { produsen: [{ id: 'prd1', name: 'Lama', contact: '', note: '' }], products: [] };
  const fakeDocument = {
    getElementById: (id) => {
      if (id === 'prName') return { value: 'Baru' };
      if (id === 'prContact') return { value: '0899' };
      if (id === 'prNote') return { value: 'update' };
      return {};
    },
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/generic/supplier-store.js', 'modules/shop/cobek-order.js'],
    { D, document: fakeDocument, toast: () => {}, save: () => {}, closeModal: () => {}, askConfirm: async () => true, withSaveGuard: (key, modalId, fn) => fn() },
    ['Produsen', 'SupplierStore'],
  );
  let updateCalls = 0;
  const origUpdate = ctx.SupplierStore.mutateUpdate;
  ctx.SupplierStore.mutateUpdate = function (...args) { updateCalls++; return origUpdate.apply(ctx.SupplierStore, args); };
  ctx.Produsen.editId = 'prd1';
  ctx.Produsen.renderList = () => {};
  ctx.Produsen.save();
  assert.equal(D.produsen[0].name, 'Baru');
  assert.equal(D.produsen[0].contact, '0899');
  assert.ok(updateCalls >= 1, 'update harus lewat SupplierStore.mutateUpdate()');
});

test('integrasi: cobek-order.js Produsen.delete() — lewat SupplierStore.mutateDelete(), produsenId produk terkait tetap ter-clear', () => {
  const D = {
    produsen: [{ id: 'prd1', name: 'A' }, { id: 'prd2', name: 'B' }],
    products: [{ id: 'p1', produsenId: 'prd1' }, { id: 'p2', produsenId: 'prd2' }],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/generic/supplier-store.js', 'modules/shop/cobek-order.js'],
    { D, document: { getElementById: () => ({}) }, toast: () => {}, save: () => {}, askConfirm: async () => true },
    ['Produsen', 'SupplierStore'],
  );
  let deleteCalls = 0;
  const origDelete = ctx.SupplierStore.mutateDelete;
  ctx.SupplierStore.mutateDelete = function (...args) { deleteCalls++; return origDelete.apply(ctx.SupplierStore, args); };
  ctx.Produsen.renderList = () => {};
  return ctx.Produsen.delete('prd1').then(() => {
    assert.deepEqual(D.produsen.map((s) => s.id), ['prd2']);
    assert.equal(D.products[0].produsenId, '', 'sisi-efek clear produsenId produk TETAP jalan (di luar scope gate, sengaja raw)');
    assert.equal(D.products[1].produsenId, 'prd2');
    assert.ok(deleteCalls >= 1, 'delete harus lewat SupplierStore.mutateDelete()');
  });
});

test('integrasi: cobek-pricing.js OngkirCalc.saveProdusenPref() — lewat SupplierStore.mutateSetRoute()', () => {
  const D = { produsen: [{ id: 'prd1', name: 'Toko Batu' }] };
  const fakeDocument = {
    getElementById: (id) => {
      if (id === 'pProdusen') return { value: 'prd1' };
      if (id === 'ongkirKmProdusen') return { value: '20' };
      if (id === 'ongkirBiayaProdusen') return { value: '3000' };
      return {};
    },
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/generic/supplier-store.js', 'modules/shop/cobek-pricing.js'],
    { D, document: fakeDocument, toast: () => {}, save: () => {}, fmt: (n) => String(n) },
    ['OngkirCalc', 'SupplierStore'],
  );
  let routeCalls = 0;
  const origRoute = ctx.SupplierStore.mutateSetRoute;
  ctx.SupplierStore.mutateSetRoute = function (...args) { routeCalls++; return origRoute.apply(ctx.SupplierStore, args); };
  ctx.OngkirCalc.prefillFromProdusen = () => {};
  ctx.OngkirCalc.saveProdusenPref();
  assert.equal(D.produsen[0].jarakKm, 20);
  assert.equal(D.produsen[0].biayaPerKm, 3000);
  assert.ok(routeCalls >= 1, 'saveProdusenPref harus lewat SupplierStore.mutateSetRoute()');
});

// === C. Fallback (tanpa SupplierStore) =====================================

test('integrasi: seluruh caller lama tetap bekerja tanpa SupplierStore (fallback mentah, guard typeof)', () => {
  const D = {
    produsen: [{ id: 'prd1', name: 'Lama', contact: '', note: '' }],
    products: [{ id: 'p1', produsenId: 'prd1' }],
  };
  const fakeDocumentOrder = {
    getElementById: (id) => {
      if (id === 'prName') return { value: 'Produk Tanpa Gate' };
      if (id === 'prContact') return { value: '' };
      if (id === 'prNote') return { value: '' };
      return {};
    },
  };
  const ctxOrder = loadSource(
    ['modules/shop/cobek-order.js'],
    { D, document: fakeDocumentOrder, toast: () => {}, save: () => {}, closeModal: () => {}, askConfirm: async () => true, withSaveGuard: (key, modalId, fn) => fn() },
    ['Produsen'],
  );
  ctxOrder.Produsen.editId = null;
  ctxOrder.Produsen.renderList = () => {};
  ctxOrder.Produsen.save();
  assert.equal(D.produsen.length, 2);
  assert.equal(D.produsen[1].name, 'Produk Tanpa Gate');

  const fakeDocumentPricing = {
    getElementById: (id) => {
      if (id === 'pProdusen') return { value: 'prd1' };
      if (id === 'ongkirKmProdusen') return { value: '15' };
      if (id === 'ongkirBiayaProdusen') return { value: '2500' };
      return {};
    },
  };
  const ctxPricing = loadSource(
    ['modules/shop/cobek-pricing.js'],
    { D, document: fakeDocumentPricing, toast: () => {}, save: () => {}, fmt: (n) => String(n) },
    ['OngkirCalc'],
  );
  ctxPricing.OngkirCalc.prefillFromProdusen = () => {};
  ctxPricing.OngkirCalc.saveProdusenPref();
  assert.equal(D.produsen[0].jarakKm, 15);
  assert.equal(D.produsen[0].biayaPerKm, 2500);
});
