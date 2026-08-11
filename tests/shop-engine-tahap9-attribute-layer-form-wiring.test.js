'use strict';
// tests/shop-engine-tahap9-attribute-layer-form-wiring.test.js — regresi
// Tahap 9 (Generic Shop Engine: Form Produk mulai memakai Generic Attribute
// Layer). Lihat LAPORAN-TAHAP9-GENERIC-SHOP-ENGINE.md.
//
// Yang dites — HANYA sisi READ di Etalase.openModal() (5 titik yang
// di-wire sesi ini: pDiskon/pBeratPerUnit/pPanjang/pLebar/pTinggi), lewat
// parity "dengan vs tanpa AttributeStore dimuat":
//   1. Edit produk existing yang PUNYA nilai di kelima field -> form terisi
//      nilai yang sama persis di kedua kondisi.
//   2. Edit produk existing dengan nilai 0/kosong -> form tetap kosong
//      ('') di kedua kondisi (kaidah "0 dianggap belum diisi" DOM lama
//      tetap terjaga, TIDAK berubah jadi tampil "0" krn wiring ini).
//   3. Mode Tambah (p null, editIdx null) -> semua field kosong di kedua
//      kondisi (AttributeStore.getAttribute(null||{}, code) -> undefined).
//   4. Guard typeof AttributeStore: kalau modul tidak dimuat sama sekali,
//      Etalase.openModal() tidak throw & tetap terisi dari p.field langsung
//      (fallback lama).
// Etalase.save()/ProductRepository SENGAJA TIDAK disentuh sesi ini (sudah
// dites tests/shop-engine-tahap6-save-wiring.test.js) — parity test di
// sini murni sisi baca form.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    { products: [], cobekKategori: [], produsen: [], accounts: [{ id: 'acc1' }] },
    extra,
  );
}

function makeDomStub() {
  const store = {};
  return {
    getElementById(id) {
      if (!store[id]) store[id] = { value: '', innerHTML: '', textContent: '' };
      return store[id];
    },
    querySelectorAll() { return []; },
    _store: store,
  };
}

const FILES_WITH_ATTRIBUTE_STORE = [
  'modules/shared/ownership-engine.js',
  'modules/shop/generic/attribute-store.js',
  'modules/shop/cobek-etalase.js',
];
const FILES_WITHOUT_ATTRIBUTE_STORE = [
  'modules/shared/ownership-engine.js',
  'modules/shop/cobek-etalase.js',
];

function makeEtalaseCtx(D, withAttributeStore) {
  const doc = makeDomStub();
  const ctx = loadSource(
    withAttributeStore ? FILES_WITH_ATTRIBUTE_STORE : FILES_WITHOUT_ATTRIBUTE_STORE,
    {
      D,
      document: doc,
      escapeHtml: (s) => String(s),
      shopKategoriName: (id) => { const k = (D.cobekKategori || []).find((x) => x.id === id); return k ? k.name : ''; },
      openModal: () => {},
      closeModal: () => {},
      PriceReko: { reset() {} },
    },
    ['Etalase'],
  );
  return { ctx, doc };
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

test('Etalase.openModal() edit — 5 field atribut fisik terisi SAMA PERSIS dgn/tanpa AttributeStore dimuat', () => {
  const productBase = {
    id: 'p1', name: 'Lumpang 10cm+alu', stock: 5, hargaBeli: 10000, hargaJual: 20000,
    hargaReseller: null, diskonPersen: 12, kategoriId: '', beratPerUnit: 2.5,
    panjang: 20, lebar: 15, tinggi: 8, ownership: 'SELF', produsenId: '', hargaByProdusen: {},
  };

  const D1 = baseD({ products: [{ ...productBase }] });
  const { ctx: withCtx, doc: withDoc } = makeEtalaseCtx(D1, true);
  withCtx.Etalase.openModal(0);

  const D2 = baseD({ products: [{ ...productBase }] });
  const { ctx: withoutCtx, doc: withoutDoc } = makeEtalaseCtx(D2, false);
  withoutCtx.Etalase.openModal(0);

  const formWith = readForm(withDoc);
  const formWithout = readForm(withoutDoc);
  assert.deepEqual(formWith, formWithout);
  assert.deepEqual(formWith, {
    pDiskon: 12, pBeratPerUnit: 2.5, pPanjang: 20, pLebar: 15, pTinggi: 8,
  });
});

test('Etalase.openModal() edit — produk dgn nilai 0/kosong tetap tampil "" (kaidah lama TIDAK berubah)', () => {
  const productZero = {
    id: 'p2', name: 'Produk Tanpa Atribut', stock: 1, hargaBeli: 1000, hargaJual: 2000,
    hargaReseller: null, diskonPersen: 0, kategoriId: '', beratPerUnit: 0,
    panjang: 0, lebar: 0, tinggi: 0, ownership: 'SELF', produsenId: '', hargaByProdusen: {},
  };

  const D1 = baseD({ products: [{ ...productZero }] });
  const { ctx: withCtx, doc: withDoc } = makeEtalaseCtx(D1, true);
  withCtx.Etalase.openModal(0);

  const D2 = baseD({ products: [{ ...productZero }] });
  const { ctx: withoutCtx, doc: withoutDoc } = makeEtalaseCtx(D2, false);
  withoutCtx.Etalase.openModal(0);

  const formWith = readForm(withDoc);
  const formWithout = readForm(withoutDoc);
  assert.deepEqual(formWith, formWithout);
  assert.deepEqual(formWith, { pDiskon: '', pBeratPerUnit: '', pPanjang: '', pLebar: '', pTinggi: '' });
});

test('Etalase.openModal() mode Tambah (produk baru) — semua field atribut kosong dgn/tanpa AttributeStore dimuat', () => {
  const D1 = baseD();
  const { ctx: withCtx, doc: withDoc } = makeEtalaseCtx(D1, true);
  withCtx.Etalase.openModal();

  const D2 = baseD();
  const { ctx: withoutCtx, doc: withoutDoc } = makeEtalaseCtx(D2, false);
  withoutCtx.Etalase.openModal();

  const formWith = readForm(withDoc);
  const formWithout = readForm(withoutDoc);
  assert.deepEqual(formWith, formWithout);
  assert.deepEqual(formWith, { pDiskon: '', pBeratPerUnit: '', pPanjang: '', pLebar: '', pTinggi: '' });
});

test('Etalase.openModal() — guard typeof AttributeStore: tidak throw & tetap terisi dari field asli kalau modul tidak dimuat', () => {
  const D = baseD({
    products: [{
      id: 'p3', name: 'Cobek 13cm', stock: 3, hargaBeli: 5000, hargaJual: 9000,
      hargaReseller: null, diskonPersen: 5, kategoriId: '', beratPerUnit: 1.2,
      panjang: 13, lebar: 13, tinggi: 6, ownership: 'SELF', produsenId: '', hargaByProdusen: {},
    }],
  });
  const { ctx, doc } = makeEtalaseCtx(D, false);
  assert.doesNotThrow(() => ctx.Etalase.openModal(0));
  assert.deepEqual(readForm(doc), {
    pDiskon: 5, pBeratPerUnit: 1.2, pPanjang: 13, pLebar: 13, pTinggi: 6,
  });
});
