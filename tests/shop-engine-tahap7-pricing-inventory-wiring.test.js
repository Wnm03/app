'use strict';
// tests/shop-engine-tahap7-pricing-inventory-wiring.test.js — regresi Tahap 7
// (Generic Shop Engine: Pricing & Inventory Integration).
//
// Titik yang di-wire sesi ini (lihat LAPORAN-TAHAP7-GENERIC-SHOP-ENGINE.md):
// 1. Etalase.renderList() — stockCls/stockLbl -> InventoryService.stockStatus();
//    harga jual/beli/reseller yang DITAMPILKAN -> PricingService.getRetail()/
//    getCost()/getReseller(). Rumus margin/marginPct & rumus diskon finalHarga
//    TIDAK diubah (beda basis rumus dgn PricingService.margin(), sengaja
//    dibiarkan — lihat test parity di bawah utk BUKTI angka margin & finalHarga
//    tidak berubah sama sekali).
// 2. PurchaseEngine.estimatedCost() -> PricingService.getCost().
// 3. Produsen.openHargaModal() — label "harga jual" -> PricingService.getRetail().
// 4. Order.computeTotals() -> PricingService.getReseller()/getRetail()/getCost().
// 5. calculateSmartDelivery() (via TripEngine.plan()) — modal feed ->
//    PricingService.getCost().
//
// Pola sama tests/shop-engine-tahap5-wiring.test.js: bandingkan hasil DENGAN
// generic layer (PricingService/InventoryService) dimuat vs TANPA (guard
// typeof jatuh ke fallback field asli) — harus 100% identik (parity).

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

const GENERIC_FILES = [
  'modules/shop/inventory-engine.js',
  'modules/shop/profit-engine.js',
  'modules/shop/generic/pricing-service.js',
  'modules/shop/generic/inventory-service.js',
];

// --- Etalase.renderList() -------------------------------------------------

function makeEtalaseCtx(D, withGeneric) {
  const doc = makeDomStub();
  const files = withGeneric
    ? ['modules/shop/cobek-etalase.js', ...GENERIC_FILES]
    : ['modules/shop/cobek-etalase.js'];
  const ctx = loadSource(
    files,
    {
      D,
      document: doc,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      shopKategoriName: (id) => { const k = (D.cobekKategori || []).find((x) => x.id === id); return k ? k.name : ''; },
      save: () => {},
      toast: () => {},
      askConfirm: async () => true,
    },
    ['Etalase'],
  );
  return { ctx, doc };
}

test('Etalase.renderList() — harga jual/beli/reseller & stock badge SAMA persis dgn/tanpa PricingService+InventoryService dimuat', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Cobek Batu 20cm', stock: 1, hargaBeli: 10000, hargaJual: 20000, hargaReseller: 15000, diskonPersen: 0 },
      { id: 'p2', name: 'Cobek Batu 25cm', stock: 4, hargaBeli: 12000, hargaJual: 25000, diskonPersen: 10 },
      { id: 'p3', name: 'Cobek Batu 30cm', stock: 20, hargaBeli: 15000, hargaJual: 30000, diskonPersen: 0 },
    ],
  });
  const { ctx: ctxWith, doc: docWith } = makeEtalaseCtx(D, true);
  ctxWith.Etalase.renderList();
  const { ctx: ctxWithout, doc: docWithout } = makeEtalaseCtx(D, false);
  ctxWithout.Etalase.renderList();

  assert.equal(docWith._store.productList.innerHTML, docWithout._store.productList.innerHTML,
    'output renderList() harus identik 100% dgn/tanpa generic layer (murni titik baca dipindah)');
});

test('Etalase.renderList() — stock badge pakai ambang InventoryService.stockStatus() (low<=2, mid<=5, ok>5)', () => {
  const D = baseD({
    products: [
      { id: 'p1', name: 'Menipis', stock: 2, hargaBeli: 1000, hargaJual: 2000, diskonPersen: 0 },
      { id: 'p2', name: 'Terbatas', stock: 5, hargaBeli: 1000, hargaJual: 2000, diskonPersen: 0 },
      { id: 'p3', name: 'Aman', stock: 6, hargaBeli: 1000, hargaJual: 2000, diskonPersen: 0 },
    ],
  });
  const { ctx, doc } = makeEtalaseCtx(D, true);
  ctx.Etalase.renderList();
  const html = doc._store.productList.innerHTML;
  assert.match(html, /stock-low"[\s\S]*?Menipis[\s\S]*?2 pcs · Menipis/);
  assert.match(html, /stock-mid"[\s\S]*?Terbatas[\s\S]*?5 pcs · Terbatas/);
  assert.match(html, /stock-ok"[\s\S]*?Aman[\s\S]*?6 pcs · Aman/);
});

test('Etalase.renderList() — margin/marginPct (markup thd hargaBeli) TIDAK berubah walau PricingService dimuat (basis rumus beda, sengaja tidak dimigrasi)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'X', stock: 10, hargaBeli: 10000, hargaJual: 15000, diskonPersen: 0 }] });
  const { ctx, doc } = makeEtalaseCtx(D, true);
  ctx.Etalase.renderList();
  // margin=5000, marginPct=Math.round(5000/10000*100)=50 (markup thd hargaBeli)
  assert.match(doc._store.productList.innerHTML, /\+Rp 5000 \(50%\)/);
});

test('Etalase.renderList() — finalHarga diskon TIDAK berubah (tetap Math.round(hargaJual*(1-diskonPersen/100)))', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'X', stock: 10, hargaBeli: 8000, hargaJual: 10000, diskonPersen: 10 }] });
  const { ctx, doc } = makeEtalaseCtx(D, true);
  ctx.Etalase.renderList();
  // finalHarga = round(10000*0.9) = 9000
  assert.match(doc._store.productList.innerHTML, /Rp 9000/);
  assert.match(doc._store.productList.innerHTML, /shop-price-strike">Rp 10000/);
});

test('Etalase.renderList() — tidak throw kalau PricingService/InventoryService belum dimuat (backward compatible)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'X', stock: 3, hargaBeli: 1000, hargaJual: 2000, diskonPersen: 0 }] });
  const { ctx } = makeEtalaseCtx(D, false);
  assert.doesNotThrow(() => ctx.Etalase.renderList());
});

// --- PurchaseEngine.estimatedCost() ---------------------------------------

function makePurchaseCtx(withGeneric) {
  const files = withGeneric
    ? ['modules/shop/purchase-engine.js', ...GENERIC_FILES]
    : ['modules/shop/purchase-engine.js'];
  return loadSource(files, {}, ['PurchaseEngine']);
}

test('PurchaseEngine.estimatedCost() — totalCost SAMA persis dgn/tanpa PricingService dimuat', () => {
  const scanResult = [
    { product: { id: 'p1', hargaBeli: 10000 }, restockQty: 5 },
    { product: { id: 'p2', hargaBeli: 7500 }, restockQty: 2 },
    { product: { id: 'p3', hargaBeli: 5000 }, restockQty: 0 },
  ];
  const ctxWith = makePurchaseCtx(true);
  const ctxWithout = makePurchaseCtx(false);
  const rWith = ctxWith.PurchaseEngine.estimatedCost(scanResult);
  const rWithout = ctxWithout.PurchaseEngine.estimatedCost(scanResult);
  assert.equal(rWith.totalCost, 65000);
  assert.equal(rWith.totalCost, rWithout.totalCost);
});

test('PurchaseEngine.estimatedCost() — item tanpa hargaBeli dianggap 0, tidak throw', () => {
  const ctx = makePurchaseCtx(true);
  const r = ctx.PurchaseEngine.estimatedCost([{ product: { id: 'p1' }, restockQty: 3 }]);
  assert.equal(r.totalCost, 0);
});

// --- Produsen.openHargaModal() — label harga jual -------------------------

function makeOrderCtx(D, withGeneric) {
  const doc = makeDomStub();
  const files = withGeneric
    ? ['modules/shop/cobek-order.js', ...GENERIC_FILES]
    : ['modules/shop/cobek-order.js'];
  const ctx = loadSource(
    files,
    {
      D,
      document: doc,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      openModal: () => {},
      openQS: () => {},
      save: () => {},
      toast: () => {},
    },
    ['Produsen', 'Order'],
  );
  return { ctx, doc };
}

test('Produsen.openHargaModal() — label "harga jual" SAMA persis dgn/tanpa PricingService dimuat', () => {
  const D = baseD({
    produsen: [{ id: 'pr1', name: 'CV Batu Merapi' }],
    products: [{ id: 'p1', name: 'Cobek 20cm', hargaJual: 25000, hargaByProdusen: { pr1: 12000 } }],
  });
  const { ctx: ctxWith, doc: docWith } = makeOrderCtx(D, true);
  ctxWith.Produsen.openHargaModal('pr1');
  const { ctx: ctxWithout, doc: docWithout } = makeOrderCtx(D, false);
  ctxWithout.Produsen.openHargaModal('pr1');
  assert.equal(docWith._store.produsenHargaList.innerHTML, docWithout._store.produsenHargaList.innerHTML);
  assert.match(docWith._store.produsenHargaList.innerHTML, /harga jual Rp 25000/);
  assert.match(docWith._store.produsenHargaList.innerHTML, /value="12000"/);
});

// --- Order.computeTotals() ------------------------------------------------

test('Order.computeTotals() — subtotal/modal SAMA persis dgn/tanpa PricingService dimuat (harga retail, tanpa diskon)', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'X', hargaBeli: 8000, hargaJual: 15000, diskonPersen: 0 }] });
  const { ctx: ctxWith, doc: docWith } = makeOrderCtx(D, true);
  docWith.getElementById('oPriceType').value = 'retail';
  docWith.getElementById('oDiskon').value = '0';
  docWith.getElementById('oOngkir').value = '0';
  ctxWith.Order.items = [{ productId: 'p1', qty: 3, hargaOverride: null }];
  const rWith = ctxWith.Order.computeTotals();

  const { ctx: ctxWithout, doc: docWithout } = makeOrderCtx(D, false);
  docWithout.getElementById('oPriceType').value = 'retail';
  docWithout.getElementById('oDiskon').value = '0';
  docWithout.getElementById('oOngkir').value = '0';
  ctxWithout.Order.items = [{ productId: 'p1', qty: 3, hargaOverride: null }];
  const rWithout = ctxWithout.Order.computeTotals();

  assert.equal(rWith.subtotal, 45000);
  assert.equal(rWith.modal, 24000);
  assert.equal(rWith.subtotal, rWithout.subtotal);
  assert.equal(rWith.modal, rWithout.modal);
});

test('Order.computeTotals() — priceType "reseller" pakai hargaReseller lewat PricingService.getReseller()', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'X', hargaBeli: 8000, hargaJual: 15000, hargaReseller: 11000, diskonPersen: 0 }] });
  const { ctx, doc } = makeOrderCtx(D, true);
  doc.getElementById('oPriceType').value = 'reseller';
  doc.getElementById('oDiskon').value = '0';
  doc.getElementById('oOngkir').value = '0';
  ctx.Order.items = [{ productId: 'p1', qty: 2, hargaOverride: null }];
  const r = ctx.Order.computeTotals();
  assert.equal(r.subtotal, 22000);
});

test('Order.computeTotals() — rumus diskon per-produk TIDAK berubah walau PricingService dimuat', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'X', hargaBeli: 5000, hargaJual: 10000, diskonPersen: 20 }] });
  const { ctx, doc } = makeOrderCtx(D, true);
  doc.getElementById('oPriceType').value = 'retail';
  doc.getElementById('oDiskon').value = '0';
  doc.getElementById('oOngkir').value = '0';
  ctx.Order.items = [{ productId: 'p1', qty: 1, hargaOverride: null }];
  const r = ctx.Order.computeTotals();
  // hargaDefault = 10000 - 10000*20/100 = 8000
  assert.equal(r.lines[0].hargaDefault, 8000);
  assert.equal(r.subtotal, 8000);
});

// --- calculateSmartDelivery() via TripEngine.plan() — modal feed ----------

function makeTripCtx(D, withGeneric) {
  const files = withGeneric
    ? [
        'modules/shop/cobek-etalase.js',
        'modules/shop/cobek-pricing.js',
        'modules/logistics/logistics-engine.js',
        'modules/logistics/logistics-service.js',
        'modules/shop/cobek-order.js',
        'modules/shop/trip-engine.js',
        ...GENERIC_FILES,
      ]
    : [
        'modules/shop/cobek-etalase.js',
        'modules/shop/cobek-pricing.js',
        'modules/logistics/logistics-engine.js',
        'modules/logistics/logistics-service.js',
        'modules/shop/cobek-order.js',
        'modules/shop/trip-engine.js',
      ];
  return loadSource(
    files,
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      openModal: () => {},
      closeModal: () => {},
    },
    ['TripEngine'],
  );
}

test('calculateSmartDelivery() (via TripEngine.plan()) — modal feed (plan.plan.price.modal) SAMA persis dgn/tanpa PricingService dimuat', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Cobek 20cm', hargaBeli: 20000, hargaJual: 40000 }] });
  const ctxWith = makeTripCtx(D, true);
  const rWith = ctxWith.TripEngine.plan({ productId: 'p1', qty: 5, metode: 'ambil' });
  const ctxWithout = makeTripCtx(D, false);
  const rWithout = ctxWithout.TripEngine.plan({ productId: 'p1', qty: 5, metode: 'ambil' });
  assert.equal(rWith.ok, true);
  assert.equal(rWith.plan.price.modal, 20000);
  assert.equal(rWith.plan.price.modal, rWithout.plan.price.modal);
});
