'use strict';
// tests/shop-engine-tahap3-wiring.test.js — regresi Tahap 3 (Generic Shop
// Engine: ProductStore/AttributeStore integration). Membandingkan hasil
// dgn vs TANPA ProductStore dimuat di titik-titik yang di-wire sesi ini —
// harus IDENTIK di kedua kondisi (pola sama persis
// tests/shop-engine-tahap2-wiring.test.js).
//
// Titik yang diwire:
// 1. BusinessFlowPresenter._transferItems()/costPerKg()/transportCostPerProduct()
//    (Dashboard/Report — modules/shop/business-flow-presenter.js): baca
//    berat/dimensi produk lewat ProductStore.getWeight()/getDimensions().
// 2. Etalase.renderList() (Product — modules/shop/cobek-etalase.js): nama
//    kategori/produsen + badge "berat belum diisi" lewat
//    ProductStore.getCategory()/getSupplier()/getWeight().

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    {
      products: [], cobekKategori: [], cobek: [], produsen: [],
      accounts: [], transactions: [], profile: {},
      inventoryTransfers: [], deliveryPlans: [],
    },
    extra,
  );
}

const BFP_FILES_WITH_PRODUCTSTORE = [
  'modules/shared/ownership-engine.js',
  'modules/shop/cobek-etalase.js',
  'modules/shop/cobek-pricing.js',
  'modules/shop/cobek-order.js',
  'modules/shop/purchase-engine.js',
  'modules/shop/inventory-engine.js',
  'modules/shop/profit-engine.js',
  'modules/shop/trip-engine.js',
  'modules/shop/shop-business-engine-presenter.js',
  'modules/shop/trip-presenter.js',
  'modules/shop/generic/category-store.js',
  'modules/shop/generic/supplier-store.js',
  'modules/shop/generic/attribute-store.js',
  'modules/shop/generic/product-store.js',
  'modules/shop/business-flow-presenter.js',
];

const BFP_FILES_WITHOUT_PRODUCTSTORE = BFP_FILES_WITH_PRODUCTSTORE.filter(
  (f) => !f.startsWith('modules/shop/generic/'),
);

function makeBfpCtx(D, withProductStore) {
  return loadSource(
    withProductStore ? BFP_FILES_WITH_PRODUCTSTORE : BFP_FILES_WITHOUT_PRODUCTSTORE,
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    },
    withProductStore ? ['BusinessFlowPresenter', 'ProductStore'] : ['BusinessFlowPresenter'],
  );
}

test('BusinessFlowPresenter.transferTotals() (pakai _transferItems) — identik dgn/tanpa ProductStore', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Cobek 20cm', beratPerUnit: 2.5, panjang: 20, lebar: 15, tinggi: 8 }],
  });
  const items = [{ productId: 'p1', qty: 4 }];
  const withPS = makeBfpCtx(D, true).BusinessFlowPresenter.transferTotals(items);
  const withoutPS = makeBfpCtx(D, false).BusinessFlowPresenter.transferTotals(items);
  assert.equal(JSON.stringify(withPS), JSON.stringify(withoutPS));
});

test('BusinessFlowPresenter.costPerKg() — identik dgn/tanpa ProductStore', () => {
  const D = baseD({
    products: [{ id: 'p1', name: 'Cobek 20cm', hargaBeli: 1000, beratPerUnit: 2 }],
    cobek: [{ id: 't1', total: 100000, profit: 30000, ongkir: 5000, date: new Date().toISOString(), items: [{ productId: 'p1', qty: 5, name: 'Cobek 20cm' }] }],
  });
  const withPS = makeBfpCtx(D, true).BusinessFlowPresenter.costPerKg('t1');
  const withoutPS = makeBfpCtx(D, false).BusinessFlowPresenter.costPerKg('t1');
  assert.equal(JSON.stringify(withPS), JSON.stringify(withoutPS));
  assert.equal(withPS.ok, true);
  assert.equal(withPS.totalKg, 10);
});

test('BusinessFlowPresenter.transportCostPerProduct() — identik dgn/tanpa ProductStore', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Cobek 20cm', hargaBeli: 1000, beratPerUnit: 2 },
      { id: 'p2', name: 'Cobek 25cm', hargaBeli: 1500, beratPerUnit: 3 },
    ],
    cobek: [{ id: 't1', total: 100000, profit: 30000, ongkir: 8000, date: new Date().toISOString(), items: [
      { productId: 'p1', qty: 5, name: 'Cobek 20cm' },
      { productId: 'p2', qty: 2, name: 'Cobek 25cm' },
    ] }],
  });
  const withPS = makeBfpCtx(D, true).BusinessFlowPresenter.transportCostPerProduct('t1');
  const withoutPS = makeBfpCtx(D, false).BusinessFlowPresenter.transportCostPerProduct('t1');
  assert.equal(JSON.stringify(withPS), JSON.stringify(withoutPS));
});

// --- Product (Etalase.renderList) ------------------------------------------
// renderList() menyentuh document.getElementById — dites lewat DOM stub
// minimal (pola sama tests lain di proyek ini yg menguji render() tanpa
// browser sungguhan), fokus pada STRING innerHTML yang dihasilkan supaya
// nama kategori/produsen/badge berat identik dgn/tanpa ProductStore.

function makeDomStub() {
  const store = {};
  return {
    getElementById(id) {
      if (!store[id]) store[id] = { innerHTML: '', value: '', classList: { toggle() {}, add() {}, remove() {} }, style: {} };
      return store[id];
    },
    querySelectorAll() { return []; },
    _store: store,
  };
}

const ETALASE_FILES_WITH_PRODUCTSTORE = [
  'modules/shared/ownership-engine.js',
  'modules/shop/generic/category-store.js',
  'modules/shop/generic/supplier-store.js',
  'modules/shop/generic/attribute-store.js',
  'modules/shop/generic/product-store.js',
  'modules/shop/cobek-etalase.js',
];
const ETALASE_FILES_WITHOUT_PRODUCTSTORE = ETALASE_FILES_WITH_PRODUCTSTORE.filter(
  (f) => !f.startsWith('modules/shop/generic/'),
);

function makeEtalaseCtx(D, withProductStore) {
  const doc = makeDomStub();
  const ctx = loadSource(
    withProductStore ? ETALASE_FILES_WITH_PRODUCTSTORE : ETALASE_FILES_WITHOUT_PRODUCTSTORE,
    {
      D,
      document: doc,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      shopKategoriName: (id) => { const k = (D.cobekKategori || []).find((x) => x.id === id); return k ? k.name : ''; },
    },
    ['Etalase'],
  );
  return { ctx, doc };
}

test('Etalase.renderList() — nama kategori/produsen/badge berat identik dgn/tanpa ProductStore', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Cobek 20cm', hargaBeli: 1000, hargaJual: 2000, stock: 5, kategoriId: 'k1', produsenId: 's1', diskonPersen: 0 },
      { id: 'p2', name: 'Cobek 25cm (blm ada berat)', hargaBeli: 1500, hargaJual: 2500, stock: 3, kategoriId: '', produsenId: '', diskonPersen: 0 },
    ],
    cobekKategori: [{ id: 'k1', name: 'Kecil' }],
    produsen: [{ id: 's1', name: 'CV Batu Merapi' }],
    inventoryTransfers: [{ items: [{ productId: 'p2' }] }],
  });
  const { ctx: ctxWith, doc: docWith } = makeEtalaseCtx(D, true);
  ctxWith.Etalase.renderList();
  const { ctx: ctxWithout, doc: docWithout } = makeEtalaseCtx(D, false);
  ctxWithout.Etalase.renderList();
  assert.equal(docWith._store.productList.innerHTML, docWithout._store.productList.innerHTML);
  // sanity: kategori/produsen/badge memang muncul di output
  assert.match(docWith._store.productList.innerHTML, /Kecil/);
  assert.match(docWith._store.productList.innerHTML, /CV Batu Merapi/);
  assert.match(docWith._store.productList.innerHTML, /Berat belum diisi/);
});
