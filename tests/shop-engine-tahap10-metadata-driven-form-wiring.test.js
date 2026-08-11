'use strict';
// tests/shop-engine-tahap10-metadata-driven-form-wiring.test.js — regresi
// Tahap 10 (Generic Shop Engine: Etalase.openModal()/save() direfactor jadi
// metadata-driven lewat ATTR_FORM_MAP + loop, OPSI B dikonfirmasi user — HTML
// form/modals.js TETAP statis, TIDAK ada metadata UI baru ditambah ke
// AttributeStore.DEFINITIONS). Lihat LAPORAN-TAHAP10-GENERIC-SHOP-ENGINE.md.
//
// Yang dites:
//   1. openModal() parity dgn/tanpa AttributeStore dimuat (sama pola Tahap 9,
//      diulang di sini krn openModal() kini lewat loop, bukan 5 baris manual).
//   2. save() parity dgn/tanpa AttributeStore dimuat — CREATE.
//   3. save() parity dgn/tanpa AttributeStore dimuat — EDIT.
//   4. Guard: openModal() & save() tidak throw kalau AttributeStore tidak
//      dimuat sama sekali (fallback ke p.field / DOM langsung).

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
  Object.keys(values || {}).forEach((id) => {
    store[id] = { value: values[id], classList: { toggle() {}, add() {}, remove() {} }, style: {}, innerHTML: '' };
  });
  return {
    getElementById(id) {
      if (!store[id]) store[id] = { innerHTML: '', value: '', textContent: '', classList: { toggle() {}, add() {}, remove() {} }, style: {} };
      return store[id];
    },
    querySelectorAll() { return []; },
    _store: store,
  };
}

const FILES_WITH_ATTRIBUTE_STORE = [
  'modules/shared/ownership-engine.js',
  'modules/shop/generic/category-store.js',
  'modules/shop/generic/supplier-store.js',
  'modules/shop/generic/attribute-store.js',
  'modules/shop/generic/product-store.js',
  'modules/shop/generic/product-repository.js',
  'modules/shop/cobek-etalase.js',
];
const FILES_WITHOUT_ATTRIBUTE_STORE = FILES_WITH_ATTRIBUTE_STORE.filter(
  (f) => !f.startsWith('modules/shop/generic/'),
);

function makeEtalaseCtx(D, withModules, doc) {
  return loadSource(
    withModules ? FILES_WITH_ATTRIBUTE_STORE : FILES_WITHOUT_ATTRIBUTE_STORE,
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
      openModal: () => {},
      closeModal: () => {},
      toast: () => {},
      save: () => {},
      withSaveGuard: (key, modalId, fn) => fn(),
      renderDashboard: () => {},
      renderKeuangan: () => {},
      PriceReko: { reset() {} },
    },
    ['Etalase'],
  );
}

function readForm(doc) {
  return {
    pDiskon: doc._store.pDiskon.value,
    pBeratPerUnit: doc._store.pBeratPerUnit.value,
    pPanjang: doc._store.pPanjang.value,
    pLebar: doc._store.pLebar.value,
    pTinggi: doc._store.pTinggi.value,
  };
}

test('Tahap 10 — Etalase.openModal() edit: loop ATTR_FORM_MAP hasil SAMA PERSIS dgn/tanpa AttributeStore', () => {
  const productBase = {
    id: 'p1', name: 'Lumpang 10cm+alu', stock: 5, hargaBeli: 10000, hargaJual: 20000,
    hargaReseller: null, diskonPersen: 12, kategoriId: '', beratPerUnit: 2.5,
    panjang: 20, lebar: 15, tinggi: 8, ownership: 'SELF', produsenId: '', hargaByProdusen: {},
  };
  const D1 = baseD({ products: [{ ...productBase }] });
  const docWith = makeDomStub();
  const ctxWith = makeEtalaseCtx(D1, true, docWith);
  ctxWith.Etalase.openModal(0);

  const D2 = baseD({ products: [{ ...productBase }] });
  const docWithout = makeDomStub();
  const ctxWithout = makeEtalaseCtx(D2, false, docWithout);
  ctxWithout.Etalase.openModal(0);

  assert.deepEqual(readForm(docWith), readForm(docWithout));
  assert.deepEqual(readForm(docWith), { pDiskon: 12, pBeratPerUnit: 2.5, pPanjang: 20, pLebar: 15, pTinggi: 8 });
});

test('Tahap 10 — guard: openModal() tidak throw kalau AttributeStore tidak dimuat sama sekali', () => {
  const D = baseD({
    products: [{
      id: 'p3', name: 'Cobek 13cm', stock: 3, hargaBeli: 5000, hargaJual: 9000,
      hargaReseller: null, diskonPersen: 5, kategoriId: '', beratPerUnit: 1.2,
      panjang: 13, lebar: 13, tinggi: 6, ownership: 'SELF', produsenId: '', hargaByProdusen: {},
    }],
  });
  const doc = makeDomStub();
  const ctx = makeEtalaseCtx(D, false, doc);
  assert.doesNotThrow(() => ctx.Etalase.openModal(0));
  assert.deepEqual(readForm(doc), { pDiskon: 5, pBeratPerUnit: 1.2, pPanjang: 13, pLebar: 13, pTinggi: 6 });
});

test('Tahap 10 — Etalase.save() CREATE: attrVals loop hasil SAMA PERSIS dgn/tanpa ProductRepository/AttributeStore', () => {
  const domValues = {
    pName: 'Cobek Baru', pStock: '10', pKategori: 'Batu', pBeli: '5000', pJual: '9000',
    pReseller: '', pDiskon: '15', pBeratPerUnit: '1.5', pPanjang: '12', pLebar: '10', pTinggi: '5',
  };

  const D1 = baseD();
  const doc1 = makeDomStub(domValues);
  const ctx1 = makeEtalaseCtx(D1, true, doc1);
  ctx1.Etalase.editIdx = null;
  ctx1.Etalase.save();

  const D2 = baseD();
  const doc2 = makeDomStub(domValues);
  const ctx2 = makeEtalaseCtx(D2, false, doc2);
  ctx2.Etalase.editIdx = null;
  ctx2.Etalase.save();

  const p1 = D1.products[0];
  const p2 = D2.products[0];
  assert.equal(p1.diskonPersen, 15);
  assert.equal(p1.beratPerUnit, 1.5);
  assert.equal(p1.panjang, 12);
  assert.equal(p1.lebar, 10);
  assert.equal(p1.tinggi, 5);
  assert.equal(p1.diskonPersen, p2.diskonPersen);
  assert.equal(p1.beratPerUnit, p2.beratPerUnit);
  assert.equal(p1.panjang, p2.panjang);
  assert.equal(p1.lebar, p2.lebar);
  assert.equal(p1.tinggi, p2.tinggi);
});

test('Tahap 10 — Etalase.save() EDIT: attrVals loop hasil SAMA PERSIS dgn/tanpa ProductRepository/AttributeStore, identitas objek tetap', () => {
  const domValues = {
    pName: 'Cobek Edit', pStock: '7', pKategori: '', pBeli: '4000', pJual: '8000',
    pReseller: '', pDiskon: '20', pBeratPerUnit: '2.2', pPanjang: '18', pLebar: '14', pTinggi: '9',
  };
  const existingProduct = {
    id: 'pEdit', name: 'Lama', stock: 3, hargaBeli: 1000, hargaJual: 2000, hargaReseller: null,
    diskonPersen: 0, kategoriId: '', beratPerUnit: 0, panjang: 0, lebar: 0, tinggi: 0,
    ownership: 'SELF', produsenId: '', hargaByProdusen: {},
  };

  const D1 = baseD({ products: [{ ...existingProduct }] });
  const doc1 = makeDomStub(domValues);
  const ctx1 = makeEtalaseCtx(D1, true, doc1);
  const refBefore1 = D1.products[0];
  ctx1.Etalase.editIdx = 0;
  ctx1.Etalase.save();

  const D2 = baseD({ products: [{ ...existingProduct }] });
  const doc2 = makeDomStub(domValues);
  const ctx2 = makeEtalaseCtx(D2, false, doc2);
  const refBefore2 = D2.products[0];
  ctx2.Etalase.editIdx = 0;
  ctx2.Etalase.save();

  assert.equal(D1.products[0], refBefore1, 'identitas objek D.products[idx] tidak berubah (with modules)');
  assert.equal(D2.products[0], refBefore2, 'identitas objek D.products[idx] tidak berubah (without modules)');

  const p1 = D1.products[0];
  const p2 = D2.products[0];
  assert.equal(p1.diskonPersen, 20);
  assert.equal(p1.beratPerUnit, 2.2);
  assert.equal(p1.panjang, 18);
  assert.equal(p1.lebar, 14);
  assert.equal(p1.tinggi, 9);
  assert.equal(p1.diskonPersen, p2.diskonPersen);
  assert.equal(p1.beratPerUnit, p2.beratPerUnit);
  assert.equal(p1.panjang, p2.panjang);
  assert.equal(p1.lebar, p2.lebar);
  assert.equal(p1.tinggi, p2.tinggi);
});
