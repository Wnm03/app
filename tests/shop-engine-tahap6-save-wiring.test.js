'use strict';
// tests/shop-engine-tahap6-save-wiring.test.js — regresi Tahap 6 (Generic Shop
// Engine: Etalase.save() memakai ProductRepository.createProduct()/
// updateProduct(), keputusan konservatif yang dikonfirmasi user — lihat
// LAPORAN-TAHAP5-GENERIC-SHOP-ENGINE.md §rekomendasi).
//
// Titik yang di-wire sesi ini (HANYA Etalase.save(), tidak menyentuh
// duplicateProduct()/Tahap 5 yang sudah ada):
// 1. Create (this.editIdx===null): ProductRepository.createProduct(fields)
//    -> D.products.push(hasil.product) — mekanisme insert TETAP .push().
// 2. Edit (this.editIdx!==null): ProductRepository.updateProduct(product,
//    fields) dipakai HANYA utk menghitung hasil merge (PURE), lalu
//    Object.assign(product, hasil.product) — objek ASLI di D.products[idx]
//    TETAP SAMA REFERENSINYA (identitas objek tidak berubah).
// 3. Guard typeof ProductRepository — kalau tidak dimuat, fallback ke
//    Object.assign/object-literal lama (0 perubahan perilaku existing).
// 4. Supplier price (produsenId/hargaByProdusen) TETAP manual, tidak lewat
//    ProductRepository (di luar scope-nya, sesuai audit Tahap 3).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    {
      products: [], cobekKategori: [], cobek: [], produsen: [],
      accounts: [{ id: 'acc1' }], transactions: [], profile: {},
      inventoryTransfers: [], deliveryPlans: [],
    },
    extra,
  );
}

function makeDomStub(values) {
  const store = {};
  Object.keys(values).forEach((id) => {
    store[id] = { value: values[id], classList: { toggle() {}, add() {}, remove() {} }, style: {}, innerHTML: '' };
  });
  return {
    getElementById(id) {
      if (!store[id]) store[id] = { innerHTML: '', value: '', classList: { toggle() {}, add() {}, remove() {} }, style: {} };
      return store[id];
    },
    querySelectorAll() { return []; },
    _store: store,
  };
}

const FILES_WITH_PRODUCT_REPOSITORY = [
  'modules/shared/ownership-engine.js',
  'modules/shop/generic/category-store.js',
  'modules/shop/generic/supplier-store.js',
  'modules/shop/generic/attribute-store.js',
  'modules/shop/generic/product-store.js',
  'modules/shop/generic/product-repository.js',
  'modules/shop/cobek-etalase.js',
];
const FILES_WITHOUT_PRODUCT_REPOSITORY = FILES_WITH_PRODUCT_REPOSITORY.filter(
  (f) => !f.startsWith('modules/shop/generic/'),
);

function makeEtalaseCtx(D, withProductRepository, domValues) {
  const doc = makeDomStub(domValues);
  const calls = { save: 0, toast: [] };
  const ctx = loadSource(
    withProductRepository ? FILES_WITH_PRODUCT_REPOSITORY : FILES_WITHOUT_PRODUCT_REPOSITORY,
    {
      D,
      document: doc,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      uid: () => 'tx_' + Math.random().toString(36).slice(2),
      resolveShopKategori: (name) => {
        if (!name) return '';
        let k = D.cobekKategori.find((c) => c.name === name);
        if (!k) { k = { id: 'kat_' + (D.cobekKategori.length + 1), name }; D.cobekKategori.push(k); }
        return k.id;
      },
      shopKategoriName: (id) => { const k = (D.cobekKategori || []).find((x) => x.id === id); return k ? k.name : ''; },
      closeModal: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
      save: () => { calls.save += 1; },
      withSaveGuard: (key, modalId, fn) => fn(),
      toast: (msg) => { calls.toast.push(msg); },
    },
    ['Etalase'],
  );
  return { ctx, doc, calls };
}

const FORM_NEW = {
  pName: 'Cobek Batu 20cm', pStock: '5', pKategori: 'Dapur',
  pBeli: '10000', pJual: '20000', pReseller: '15000', pDiskon: '0',
  pBeratPerUnit: '2.5', pPanjang: '20', pLebar: '20', pTinggi: '8',
};

test('Etalase.save() create — pakai ProductRepository.createProduct(), field sama dengan sebelumnya', () => {
  const D = baseD();
  const { ctx, calls } = makeEtalaseCtx(D, true, FORM_NEW);
  ctx.Etalase.editIdx = null;
  ctx.Etalase.save();

  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.name, 'Cobek Batu 20cm');
  assert.equal(p.stock, 5);
  assert.equal(p.hargaBeli, 10000);
  assert.equal(p.hargaJual, 20000);
  assert.equal(p.beratPerUnit, 2.5);
  assert.equal(p.panjang, 20);
  assert.ok(p.id && p.id.startsWith('prod_'));
  assert.equal(Object.keys(p.hargaByProdusen).length, 0);
  assert.equal(calls.save, 1);
});

test('Etalase.save() edit — hasil identik antara withProductRepository=true dan false (parity)', () => {
  const domValues = { ...FORM_NEW, pName: 'Cobek Batu 25cm', pJual: '25000' };

  const D1 = baseD({ products: [{ id: 'p1', name: 'Lama', stock: 2, hargaBeli: 1, hargaJual: 1, hargaReseller: null, diskonPersen: 0, kategoriId: '', beratPerUnit: 0, panjang: 0, lebar: 0, tinggi: 0, ownership: 'SELF', produsenId: '', hargaByProdusen: {} }] });
  const { ctx: ctx1 } = makeEtalaseCtx(D1, true, domValues);
  ctx1.Etalase.editIdx = 0;
  ctx1.Etalase.save();

  const D2 = baseD({ products: [{ id: 'p1', name: 'Lama', stock: 2, hargaBeli: 1, hargaJual: 1, hargaReseller: null, diskonPersen: 0, kategoriId: '', beratPerUnit: 0, panjang: 0, lebar: 0, tinggi: 0, ownership: 'SELF', produsenId: '', hargaByProdusen: {} }] });
  const { ctx: ctx2 } = makeEtalaseCtx(D2, false, domValues);
  ctx2.Etalase.editIdx = 0;
  ctx2.Etalase.save();

  assert.deepEqual(D1.products[0], D2.products[0]);
});

test('Etalase.save() edit — objek di D.products[editIdx] TETAP referensi yang sama (identitas tidak berubah)', () => {
  const original = {
    id: 'p1', name: 'Lama', stock: 2, hargaBeli: 1, hargaJual: 1, hargaReseller: null,
    diskonPersen: 0, kategoriId: '', beratPerUnit: 0, panjang: 0, lebar: 0, tinggi: 0,
    ownership: 'SELF', produsenId: '', hargaByProdusen: {},
  };
  const D = baseD({ products: [original] });
  const { ctx } = makeEtalaseCtx(D, true, FORM_NEW);
  ctx.Etalase.editIdx = 0;
  ctx.Etalase.save();

  // Referensi identik (bukan cuma deep-equal) — inilah risiko utama yang
  // diaudit sebelum implementasi (lihat komentar Tahap 6 di cobek-etalase.js).
  assert.strictEqual(D.products[0], original);
  assert.equal(original.name, 'Cobek Batu 20cm');
  assert.equal(original.stock, 5);
});

test('Etalase.save() — guard typeof ProductRepository: fallback jalur lama kalau modul tidak dimuat', () => {
  const D = baseD();
  const { ctx } = makeEtalaseCtx(D, false, FORM_NEW);
  ctx.Etalase.editIdx = null;
  assert.doesNotThrow(() => ctx.Etalase.save());
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].name, 'Cobek Batu 20cm');
});
