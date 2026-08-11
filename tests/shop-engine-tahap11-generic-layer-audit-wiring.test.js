'use strict';
// tests/shop-engine-tahap11-generic-layer-audit-wiring.test.js — regresi
// Tahap 11 (Generic Shop Engine: audit sisa hardcode READ-only yang aman
// dimigrasikan ke Generic Layer). Lihat LAPORAN-TAHAP11-GENERIC-SHOP-ENGINE.md
// untuk daftar lengkap hasil audit (yang dimigrasi vs sengaja tidak).
//
// Titik yang di-wire sesi ini, semua dites parity dgn/tanpa modul Generic
// Layer dimuat:
//   1. Etalase.openModal() — pKategori/pBeli/pJual/pReseller (PricingService/
//      ProductStore.getCategory).
//   2. DeliveryPlanUI.calc() — berat/dimensi produk diserahkan ke
//      TripEngine.weight()/volume() (ProductStore.getWeight()/getDimensions()).
//   3. runGlobalSearch() — harga jual produk di hasil pencarian
//      (PricingService.getRetail()).

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

// --- 1. Etalase.openModal() — pKategori/pBeli/pJual/pReseller -------------

const FILES_WITH_GENERIC = [
  'modules/shared/ownership-engine.js',
  'modules/shop/generic/category-store.js',
  'modules/shop/generic/supplier-store.js',
  'modules/shop/generic/attribute-store.js',
  'modules/shop/generic/product-store.js',
  'modules/shop/generic/pricing-service.js',
  'modules/shop/generic/product-repository.js',
  'modules/shop/cobek-etalase.js',
];
const FILES_WITHOUT_GENERIC = FILES_WITH_GENERIC.filter((f) => !f.startsWith('modules/shop/generic/'));

function makeEtalaseCtx(D, withModules, doc) {
  return loadSource(
    withModules ? FILES_WITH_GENERIC : FILES_WITHOUT_GENERIC,
    {
      D,
      document: doc,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      uid: () => 'tx_' + Math.random().toString(36).slice(2),
      shopKategoriName: (id) => { const k = (D.cobekKategori || []).find((x) => x.id === id); return k ? k.name : ''; },
      resolveShopKategori: (name) => {
        if (!name) return '';
        let k = D.cobekKategori.find((c) => c.name === name);
        if (!k) { k = { id: 'kat_' + (D.cobekKategori.length + 1), name }; D.cobekKategori.push(k); }
        return k.id;
      },
      openModal: () => {},
      closeModal: () => {},
      toast: () => {},
      save: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
      PriceReko: { reset() {} },
    },
    ['Etalase'],
  );
}

test('Tahap 11 — Etalase.openModal() edit: pKategori/pBeli/pJual/pReseller SAMA PERSIS dgn/tanpa CategoryStore+PricingService+ProductStore dimuat', () => {
  const product = {
    id: 'p1', name: 'Cobek 15cm', stock: 4, hargaBeli: 12000, hargaJual: 25000,
    hargaReseller: 20000, diskonPersen: 0, kategoriId: 'kat1', beratPerUnit: 1,
    panjang: 0, lebar: 0, tinggi: 0, ownership: 'SELF', produsenId: '', hargaByProdusen: {},
  };
  const cobekKategori = [{ id: 'kat1', name: 'Cobek Batu' }];

  const D1 = baseD({ products: [{ ...product }], cobekKategori: [...cobekKategori] });
  const doc1 = makeDomStub();
  const ctx1 = makeEtalaseCtx(D1, true, doc1);
  ctx1.Etalase.openModal(0);

  const D2 = baseD({ products: [{ ...product }], cobekKategori: [...cobekKategori] });
  const doc2 = makeDomStub();
  const ctx2 = makeEtalaseCtx(D2, false, doc2);
  ctx2.Etalase.openModal(0);

  const read = (doc) => ({
    pKategori: doc._store.pKategori.value,
    pBeli: doc._store.pBeli.value,
    pJual: doc._store.pJual.value,
    pReseller: doc._store.pReseller.value,
  });

  assert.deepEqual(read(doc1), read(doc2));
  assert.deepEqual(read(doc1), { pKategori: 'Cobek Batu', pBeli: 12000, pJual: 25000, pReseller: 20000 });
});

test('Tahap 11 — Etalase.openModal() edit: hargaReseller kosong -> pReseller tetap "" (kaidah lama tidak berubah)', () => {
  const product = {
    id: 'p2', name: 'Lumpang 10cm', stock: 2, hargaBeli: 5000, hargaJual: 9000,
    hargaReseller: null, diskonPersen: 0, kategoriId: '', beratPerUnit: 0,
    panjang: 0, lebar: 0, tinggi: 0, ownership: 'SELF', produsenId: '', hargaByProdusen: {},
  };
  const D1 = baseD({ products: [{ ...product }] });
  const doc1 = makeDomStub();
  const ctx1 = makeEtalaseCtx(D1, true, doc1);
  ctx1.Etalase.openModal(0);

  const D2 = baseD({ products: [{ ...product }] });
  const doc2 = makeDomStub();
  const ctx2 = makeEtalaseCtx(D2, false, doc2);
  ctx2.Etalase.openModal(0);

  assert.equal(doc1._store.pReseller.value, '');
  assert.equal(doc2._store.pReseller.value, '');
  assert.equal(doc1._store.pKategori.value, '');
});

test('Tahap 11 — Etalase.openModal() mode Tambah: pKategori/pBeli/pJual/pReseller kosong dgn/tanpa modul Generic Layer', () => {
  const D1 = baseD();
  const doc1 = makeDomStub();
  const ctx1 = makeEtalaseCtx(D1, true, doc1);
  ctx1.Etalase.openModal();

  const D2 = baseD();
  const doc2 = makeDomStub();
  const ctx2 = makeEtalaseCtx(D2, false, doc2);
  ctx2.Etalase.openModal();

  const read = (doc) => ({
    pKategori: doc._store.pKategori.value,
    pBeli: doc._store.pBeli.value,
    pJual: doc._store.pJual.value,
    pReseller: doc._store.pReseller.value,
  });
  assert.deepEqual(read(doc1), read(doc2));
  assert.deepEqual(read(doc1), { pKategori: '', pBeli: '', pJual: '', pReseller: '' });
});

// --- 2. DeliveryPlanUI.calc() — berat/dimensi via ProductStore -------------

function makeDeliveryCtx(D, withProductStore, doc, tripEngineMock) {
  const files = withProductStore
    ? ['modules/shop/generic/attribute-store.js', 'modules/shop/generic/product-store.js', 'modules/shop/delivery-plan-ui.js']
    : ['modules/shop/delivery-plan-ui.js'];
  return loadSource(
    files,
    {
      D,
      document: doc,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      TripEngine: tripEngineMock,
    },
    ['DeliveryPlanUI'],
  );
}

function makeDeliveryDomStub(values) {
  return makeDomStub(values);
}

function makeTripEngineMock(calls) {
  return {
    plan() {
      return { ok: true, productName: 'Produk Uji', plan: {}, profit: {} };
    },
    weight(params) {
      calls.weight.push(params);
      return { ok: true, totalKg: (params.beratPerUnit || 0) * (params.qty || 0) };
    },
    volume(params) {
      calls.volume.push(params);
      return { ok: true, totalM3: (params.panjang || 0) * (params.lebar || 0) * (params.tinggi || 0) * (params.qty || 0) / 1e6 };
    },
  };
}

test('Tahap 11 — DeliveryPlanUI.calc(): berat/dimensi diserahkan ke TripEngine.weight()/volume() SAMA PERSIS dgn/tanpa ProductStore dimuat', () => {
  const product = {
    id: 'p1', name: 'Cobek Besar', stock: 3, hargaBeli: 10000, hargaJual: 20000,
    beratPerUnit: 2.5, panjang: 20, lebar: 15, tinggi: 10,
  };
  const domValues = { dpProduct: 'p1', dpQty: '4', dpProdusen: '', dpKmKonsumen: '', dpBiayaKmKonsumen: '', dpVehicle: '', dpMarginPct: '' };

  const D1 = baseD({ products: [{ ...product }] });
  const doc1 = makeDeliveryDomStub(domValues);
  const calls1 = { weight: [], volume: [] };
  const ctx1 = makeDeliveryCtx(D1, true, doc1, makeTripEngineMock(calls1));
  ctx1.DeliveryPlanUI.calc();

  const D2 = baseD({ products: [{ ...product }] });
  const doc2 = makeDeliveryDomStub(domValues);
  const calls2 = { weight: [], volume: [] };
  const ctx2 = makeDeliveryCtx(D2, false, doc2, makeTripEngineMock(calls2));
  ctx2.DeliveryPlanUI.calc();

  assert.equal(calls1.weight.length, 1);
  assert.equal(calls2.weight.length, 1);
  assert.equal(calls1.weight[0].beratPerUnit, 2.5);
  assert.equal(calls2.weight[0].beratPerUnit, 2.5);
  assert.equal(calls1.weight[0].qty, 4);

  assert.equal(calls1.volume.length, 1);
  assert.equal(calls2.volume.length, 1);
  assert.deepEqual(
    { p: calls1.volume[0].panjang, l: calls1.volume[0].lebar, t: calls1.volume[0].tinggi },
    { p: 20, l: 15, t: 10 },
  );
  assert.deepEqual(
    { p: calls2.volume[0].panjang, l: calls2.volume[0].lebar, t: calls2.volume[0].tinggi },
    { p: 20, l: 15, t: 10 },
  );
});

test('Tahap 11 — DeliveryPlanUI.calc(): produk tanpa berat/dimensi -> TripEngine.weight()/volume() TIDAK dipanggil (kaidah lama tidak berubah)', () => {
  const product = { id: 'p2', name: 'Cobek Tanpa Dimensi', stock: 1, hargaBeli: 5000, hargaJual: 9000 };
  const domValues = { dpProduct: 'p2', dpQty: '1', dpProdusen: '', dpKmKonsumen: '', dpBiayaKmKonsumen: '', dpVehicle: '', dpMarginPct: '' };
  const D = baseD({ products: [{ ...product }] });
  const doc = makeDeliveryDomStub(domValues);
  const calls = { weight: [], volume: [] };
  const ctx = makeDeliveryCtx(D, true, doc, makeTripEngineMock(calls));
  assert.doesNotThrow(() => ctx.DeliveryPlanUI.calc());
  assert.equal(calls.weight.length, 0);
  assert.equal(calls.volume.length, 0);
});

// --- 3. runGlobalSearch() — harga jual via PricingService ------------------

function makeGlobalSearchCtx(D, withPricingService, doc) {
  const files = withPricingService
    ? ['modules/shop/generic/pricing-service.js', 'global-search.js']
    : ['global-search.js'];
  return loadSource(
    files,
    {
      D,
      document: doc,
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      escapeHtml: (s) => String(s),
      openModal: () => {},
      closeModal: () => {},
      showPage: () => {},
    },
    ['runGlobalSearch'],
  );
}

test('Tahap 11 — runGlobalSearch(): harga jual produk di hasil pencarian SAMA PERSIS dgn/tanpa PricingService dimuat', () => {
  const baseSearchD = () => ({
    products: [{ id: 'p1', name: 'Cobek Cari', stock: 3, hargaBeli: 8000, hargaJual: 15000 }],
    transactions: [], bills: [], cobek: [], servisLogs: [], bbmLogs: [], targets: [], eduFunds: [],
  });
  const domValues = { globalSearchInput: 'cobek cari', globalSearchResults: '' };

  const D1 = baseSearchD();
  const doc1 = makeDomStub(domValues);
  const ctx1 = makeGlobalSearchCtx(D1, true, doc1);
  ctx1.runGlobalSearch();

  const D2 = baseSearchD();
  const doc2 = makeDomStub(domValues);
  const ctx2 = makeGlobalSearchCtx(D2, false, doc2);
  ctx2.runGlobalSearch();

  assert.equal(doc1._store.globalSearchResults.innerHTML, doc2._store.globalSearchResults.innerHTML);
  assert.ok(doc1._store.globalSearchResults.innerHTML.includes('Rp 15000'));
});
