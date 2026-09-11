'use strict';
// tests/cobek-shop-5-titik-sisa-sesi-c.test.js — Sesi C-lanjutan Shop/Cobek,
// 5 titik sisa (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi C /
// SESSION-NOTE-sesi-c-lanjutan-shop-cobek-product-updated.md "Sengaja belum
// dikerjakan sesi ini"). Sesi sebelumnya (v1642) sudah menutup CRUD inti
// produk & kategori (cobek-etalase.js, lihat
// tests/cobek-etalase-aibus-emit-sesi-c.test.js) — sesi ini menutup sisa 5
// titik yang ditunda:
//
// 1. cobek-order.js  — Produsen.saveHarga() (harga produsen batch)
//    -> product.updated {kind:"harga-produsen",action:"batch",produsenId,productIds,count}
// 2. cobek-pricing.js — PriceRekoWidget.applyOne()/applyBulk() (price reko)
//    -> product.updated {kind:"price-reko",action:"apply-one"|"apply-bulk",...}
//    cobek-pricing.js — StockRekoWidget.applyAll() (stock reko)
//    -> product.updated {kind:"stock-reko",action:"apply-all",...}
// 3. cobek-pricing.js — WeightBulkWidget.applyOne()/applyBulk() (weight-bulk)
//    -> product.updated {kind:"weight-bulk",action:"apply-one"|"apply-bulk",...}
// 4. cobek-tx-cart.js — onTxShopStockProdusenChange() (inline create
//    Produsen dari dropdown keranjang transaksi)
//    -> product.updated {kind:"produsen",action:"create",produsenId,name}
// 5. cobek-io.js — ImportShopExcel.commit() (bulk import Excel, 2 cabang:
//    target 'produsen' & target 'etalase'/produk)
//    -> product.updated {kind:"import-excel",action:"produsen"|"etalase",created,updated}
//
// Semua emit di-guard `typeof AIBus!=="undefined"`, pola PERSIS sesi-sesi
// Sesi C sebelumnya (Akun/Zakat-PBB/Shop CRUD inti) — 1 aksi user = 1 emit
// (batch di-summary, bukan per-baris), 0 perubahan business logic lain.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function collector() {
  const events = [];
  return { events, AIBus: { emit(name, payload) { events.push({ name, payload }); } } };
}

// ---------------------------------------------------------------------
// 1. cobek-order.js — Produsen.saveHarga()
// ---------------------------------------------------------------------
test('Produsen.saveHarga() — batch harga produsen emit product.updated {kind:"harga-produsen",action:"batch"}', () => {
  const D = {
    produsen: [{ id: 'prd_1', name: 'Produsen A' }],
    products: [
      { id: 'prod_1', name: 'Cobek A', hargaByProdusen: {} },
      { id: 'prod_2', name: 'Cobek B', hargaByProdusen: {} },
    ],
  };
  const { events, AIBus } = collector();
  const inputs = [
    { getAttribute: () => 'prod_1', value: '15000' },
    { getAttribute: () => 'prod_2', value: '20000' },
  ];
  const fakeDocument = {
    querySelectorAll: () => inputs,
    getElementById: () => null,
  };
  const ctx = loadSource(
    ['modules/shop/cobek-order.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      openModal() {}, closeModal() {}, openQS() {},
      toast() {},
      save() {},
      renderProductList() {},
      AIBus,
    },
    ['Produsen'],
  );
  ctx.Produsen.hargaEditId = 'prd_1';

  ctx.Produsen.saveHarga();

  assert.equal(D.products[0].hargaByProdusen.prd_1, 15000, '0 regresi: harga produsen tetap tersimpan seperti sebelumnya');
  assert.equal(D.products[1].hargaByProdusen.prd_1, 20000);
  const ev = events.find((e) => e.name === 'product.updated');
  assert.ok(ev, 'AIBus.emit("product.updated", ...) harus terpanggil saat harga produsen batch disimpan');
  assert.equal(ev.payload.kind, 'harga-produsen');
  assert.equal(ev.payload.action, 'batch');
  assert.equal(ev.payload.produsenId, 'prd_1');
  assert.deepEqual(Array.from(ev.payload.productIds).sort(), ['prod_1', 'prod_2']);
  assert.equal(ev.payload.count, 2);
});

test('Produsen.saveHarga() — 0 baris tersentuh (list kosong) tidak emit apa pun', () => {
  const D = { produsen: [{ id: 'prd_1', name: 'Produsen A' }], products: [] };
  const { events, AIBus } = collector();
  const fakeDocument = { querySelectorAll: () => [], getElementById: () => null };
  const ctx = loadSource(
    ['modules/shop/cobek-order.js'],
    { D, document: fakeDocument, escapeHtml: (s) => String(s), fmt: (n) => String(n), openModal() {}, closeModal() {}, toast() {}, save() {}, renderProductList() {}, AIBus },
    ['Produsen'],
  );
  ctx.Produsen.hargaEditId = 'prd_1';

  ctx.Produsen.saveHarga();

  assert.equal(events.filter((e) => e.name === 'product.updated').length, 0);
});

// ---------------------------------------------------------------------
// 2. cobek-pricing.js — PriceRekoWidget & StockRekoWidget
// ---------------------------------------------------------------------
function makePricingCtx({ D, AIBus, els = {} }) {
  const fakeDocument = { getElementById: (id) => (id in els ? els[id] : null) };
  return loadSource(
    ['modules/shop/cobek-pricing.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      toast() {},
      save() {},
      renderProductList() {},
      askConfirm: async () => true,
      Etalase: { pairSiblings: () => [], pairKey: () => null, pairLabel: (p) => p.name },
      AIBus,
    },
    ['PriceRekoWidget', 'StockRekoWidget', 'WeightBulkWidget'],
  );
}

test('PriceRekoWidget.applyOne() — emit product.updated {kind:"price-reko",action:"apply-one"}', async () => {
  const D = { products: [{ id: 'prod_1', name: 'Cobek A', hargaBeli: 10000, hargaJual: 12000, kategoriId: '' }], bbmLogs: [] };
  const { events, AIBus } = collector();
  const ctx = makePricingCtx({ D, AIBus });

  await ctx.PriceRekoWidget.applyOne('prod_1');

  const ev = events.find((e) => e.name === 'product.updated');
  assert.ok(ev, 'AIBus.emit("product.updated", ...) harus terpanggil saat price reko diterapkan (1 produk)');
  assert.equal(ev.payload.kind, 'price-reko');
  assert.equal(ev.payload.action, 'apply-one');
  assert.equal(ev.payload.productId, 'prod_1');
});

test('PriceRekoWidget.applyBulk() — emit product.updated {kind:"price-reko",action:"apply-bulk"} 1x utk seluruh batch', async () => {
  const D = {
    products: [
      { id: 'prod_1', name: 'A', hargaBeli: 10000, hargaJual: 12000, kategoriId: '' },
      { id: 'prod_2', name: 'B', hargaBeli: 20000, hargaJual: 24000, kategoriId: '' },
    ],
    bbmLogs: [],
  };
  const { events, AIBus } = collector();
  const els = { priceRekoBulkTransport: { value: '2000' }, priceRekoBulkMargin: { value: '30' } };
  const ctx = makePricingCtx({ D, AIBus, els });

  await ctx.PriceRekoWidget.applyBulk();

  const evs = events.filter((e) => e.name === 'product.updated');
  assert.equal(evs.length, 1, 'hanya 1 emit menutupi seluruh batch, bukan per-produk');
  assert.equal(evs[0].payload.kind, 'price-reko');
  assert.equal(evs[0].payload.action, 'apply-bulk');
  assert.equal(evs[0].payload.count, 2);
  assert.deepEqual(Array.from(evs[0].payload.productIds).sort(), ['prod_1', 'prod_2']);
});

test('StockRekoWidget.applyAll() — emit product.updated {kind:"stock-reko",action:"apply-all"} 1x utk seluruh batch', async () => {
  const D = {
    products: [{ id: 'prod_1', name: 'A', stock: 1 }],
    cobek: [],
  };
  const { events, AIBus } = collector();
  const ctx = makePricingCtx({ D, AIBus });

  await ctx.StockRekoWidget.applyAll();

  const evs = events.filter((e) => e.name === 'product.updated');
  assert.equal(evs.length, 1);
  assert.equal(evs[0].payload.kind, 'stock-reko');
  assert.equal(evs[0].payload.action, 'apply-all');
  assert.equal(evs[0].payload.productIds[0], 'prod_1');
});

test('StockRekoWidget.applyAll() — tidak ada saran restock berlaku (0 diterapkan) tidak emit apa pun', async () => {
  const D = { products: [], cobek: [] };
  const { events, AIBus } = collector();
  const ctx = makePricingCtx({ D, AIBus });

  await ctx.StockRekoWidget.applyAll();

  assert.equal(events.filter((e) => e.name === 'product.updated').length, 0);
});

// ---------------------------------------------------------------------
// 3. cobek-pricing.js — WeightBulkWidget
// ---------------------------------------------------------------------
test('WeightBulkWidget.applyOne() — emit product.updated {kind:"weight-bulk",action:"apply-one"}', () => {
  const D = { products: [{ id: 'prod_1', name: 'A', beratPerUnit: null }] };
  const { events, AIBus } = collector();
  const els = { weightBulkInput_prod_1: { value: '0.5' } };
  const ctx = makePricingCtx({ D, AIBus, els });

  ctx.WeightBulkWidget.applyOne('prod_1');

  const ev = events.find((e) => e.name === 'product.updated');
  assert.ok(ev, 'AIBus.emit("product.updated", ...) harus terpanggil saat berat 1 produk disimpan');
  assert.equal(ev.payload.kind, 'weight-bulk');
  assert.equal(ev.payload.action, 'apply-one');
  assert.equal(ev.payload.productId, 'prod_1');
  assert.equal(ev.payload.beratPerUnit, 0.5);
});

test('WeightBulkWidget.applyBulk() — emit product.updated {kind:"weight-bulk",action:"apply-bulk"} 1x utk seluruh batch', async () => {
  const D = {
    products: [
      { id: 'prod_1', name: 'A', beratPerUnit: null },
      { id: 'prod_2', name: 'B', beratPerUnit: null },
    ],
  };
  const { events, AIBus } = collector();
  const els = {
    weightBulkInput_prod_1: { value: '0.5' },
    weightBulkInput_prod_2: { value: '1.2' },
  };
  const ctx = makePricingCtx({ D, AIBus, els });

  await ctx.WeightBulkWidget.applyBulk();

  const evs = events.filter((e) => e.name === 'product.updated');
  assert.equal(evs.length, 1, 'hanya 1 emit menutupi seluruh batch, bukan per-produk');
  assert.equal(evs[0].payload.kind, 'weight-bulk');
  assert.equal(evs[0].payload.action, 'apply-bulk');
  assert.equal(evs[0].payload.count, 2);
  assert.deepEqual(Array.from(evs[0].payload.productIds).sort(), ['prod_1', 'prod_2']);
});

// ---------------------------------------------------------------------
// 4. cobek-tx-cart.js — onTxShopStockProdusenChange() (inline create Produsen)
// ---------------------------------------------------------------------
test('onTxShopStockProdusenChange() — buat produsen baru inline emit product.updated {kind:"produsen",action:"create"}', async () => {
  const D = { produsen: [], products: [], cobekKategori: [] };
  const { events, AIBus } = collector();
  const prodSelEl = { value: '__new__' };
  const els = { txShopStockProdusen: prodSelEl, txShopStockItem: null };
  const fakeDocument = { getElementById: (id) => (id in els ? els[id] : null) };
  const ctx = loadSource(
    ['modules/shop/cobek-tx-cart.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      uid: (() => { let n = 1; return () => 'u' + n++; })(),
      save() {},
      showPromptModal: async () => 'Produsen Inline Baru',
      AIBus,
    },
    ['curShopStockCart'],
  );
  // populateTxShopStockSelect() (dipanggil di dalam fungsi ini) butuh banyak
  // dependency render lain (renderShopStockCartList, onTxShopStockItemChange,
  // dst) yang tidak relevan buat tes emit ini — di-stub no-op (fungsi ASLI
  // yang dites tetap onTxShopStockProdusenChange(), bukan ini).
  ctx.populateTxShopStockSelect = () => {};

  await ctx.onTxShopStockProdusenChange();

  assert.equal(D.produsen.length, 1, '0 regresi: produsen baru tetap tertambah seperti sebelumnya');
  assert.equal(D.produsen[0].name, 'Produsen Inline Baru');
  const ev = events.find((e) => e.name === 'product.updated');
  assert.ok(ev, 'AIBus.emit("product.updated", ...) harus terpanggil saat produsen baru dibuat inline dari keranjang');
  assert.equal(ev.payload.kind, 'produsen');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.produsenId, D.produsen[0].id);
  assert.equal(ev.payload.name, 'Produsen Inline Baru');
});

test('onTxShopStockProdusenChange() — dibatalkan (nama kosong) tidak emit apa pun', async () => {
  const D = { produsen: [], products: [], cobekKategori: [] };
  const { events, AIBus } = collector();
  const prodSelEl = { value: '__new__' };
  const els = { txShopStockProdusen: prodSelEl, txShopStockItem: null };
  const fakeDocument = { getElementById: (id) => (id in els ? els[id] : null) };
  const ctx = loadSource(
    ['modules/shop/cobek-tx-cart.js'],
    { D, document: fakeDocument, escapeHtml: (s) => String(s), uid: () => 'u1', save() {}, showPromptModal: async () => '', AIBus },
    ['curShopStockCart'],
  );
  ctx.populateTxShopStockSelect = () => {};

  await ctx.onTxShopStockProdusenChange();

  assert.equal(D.produsen.length, 0);
  assert.equal(events.filter((e) => e.name === 'product.updated').length, 0);
});

// ---------------------------------------------------------------------
// 5. cobek-io.js — ImportShopExcel.commit() (bulk import Excel)
// ---------------------------------------------------------------------
function makeIoCtx({ D, AIBus }) {
  const fakeDocument = { getElementById: () => null };
  const ctx = loadSource(
    ['modules/shop/cobek-io.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      fmtFull: (n) => String(n),
      toast() {},
      save() {},
      closeModal() {},
      uid: (() => { let n = 1; return () => 'u' + n++; })(),
      resolveShopKategori: () => '',
      AIBus,
    },
    ['ImportShopExcel'],
  );
  // cobek-io.js sendiri MENDEKLARASIKAN renderProductList()/renderProdusenList()
  // (wrapper ke Etalase.renderList() dkk) sbg `function` top-level di file
  // yang sama — deklarasi itu MENIMPA stub apa pun yang dikirim lewat
  // extraGlobals (function declaration selalu menang saat script dieksekusi
  // di context yang sama). Override di sini, SETELAH load, supaya tes ini
  // murni fokus ke ImportShopExcel.commit() tanpa perlu stub Etalase penuh.
  ctx.renderProductList = () => {};
  ctx.renderProdusenList = () => {};
  return ctx;
}

test('ImportShopExcel.commit() — target produsen, emit product.updated {kind:"import-excel",action:"produsen"}', () => {
  const D = { produsen: [], products: [] };
  const { events, AIBus } = collector();
  const ctx = makeIoCtx({ D, AIBus });
  ctx.ImportShopExcel.target = 'produsen';
  ctx.ImportShopExcel.parsedRows = [
    { name: 'Produsen Baru', kontak: '', catatan: '', jarakKm: '', biayaPerKm: '' },
  ];

  ctx.ImportShopExcel.commit();

  assert.equal(D.produsen.length, 1, '0 regresi: produsen tetap tertambah seperti sebelumnya');
  const ev = events.find((e) => e.name === 'product.updated');
  assert.ok(ev, 'AIBus.emit("product.updated", ...) harus terpanggil saat bulk import produsen selesai');
  assert.equal(ev.payload.kind, 'import-excel');
  assert.equal(ev.payload.action, 'produsen');
  assert.equal(ev.payload.created, 1);
  assert.equal(ev.payload.updated, 0);
});

test('ImportShopExcel.commit() — target etalase (produk), emit product.updated {kind:"import-excel",action:"etalase"}', () => {
  const D = { produsen: [], products: [{ id: 'prod_1', name: 'Existing', stock: 1, hargaBeli: 0, hargaJual: 0, diskonPersen: 0, hargaByProdusen: {} }] };
  const { events, AIBus } = collector();
  const ctx = makeIoCtx({ D, AIBus });
  ctx.ImportShopExcel.target = 'etalase';
  ctx.ImportShopExcel.parsedRows = [
    { name: 'Existing', kategori: '', produsen: '', stock: 5, hargaBeli: 1000, hargaJual: 2000, hargaReseller: null, diskonPersen: 0 },
    { name: 'Baru', kategori: '', produsen: '', stock: 3, hargaBeli: 500, hargaJual: 1500, hargaReseller: null, diskonPersen: 0 },
  ];

  ctx.ImportShopExcel.commit();

  assert.equal(D.products.length, 2, '0 regresi: produk baru tetap tertambah seperti sebelumnya');
  const ev = events.find((e) => e.name === 'product.updated');
  assert.ok(ev, 'AIBus.emit("product.updated", ...) harus terpanggil saat bulk import etalase selesai');
  assert.equal(ev.payload.kind, 'import-excel');
  assert.equal(ev.payload.action, 'etalase');
  assert.equal(ev.payload.created, 1);
  assert.equal(ev.payload.updated, 1);
});

test('ImportShopExcel.commit() — 0 baris (parsedRows kosong) tidak emit, tetap toast peringatan lewat jalur lama', () => {
  const D = { produsen: [], products: [] };
  const { events, AIBus } = collector();
  const ctx = makeIoCtx({ D, AIBus });
  ctx.ImportShopExcel.target = 'etalase';
  ctx.ImportShopExcel.parsedRows = [];

  ctx.ImportShopExcel.commit();

  assert.equal(events.filter((e) => e.name === 'product.updated').length, 0);
});

// ---------------------------------------------------------------------
// Guard: AIBus tidak ada — semua 5 titik tetap tidak throw (pola guard lama)
// ---------------------------------------------------------------------
test('AIBus tidak ada (typeof AIBus==="undefined") — 5 titik tetap tidak throw', async () => {
  // 1. Produsen.saveHarga()
  {
    const D = { produsen: [{ id: 'prd_1', name: 'A' }], products: [{ id: 'prod_1', name: 'X', hargaByProdusen: {} }] };
    const inputs = [{ getAttribute: () => 'prod_1', value: '1000' }];
    const fakeDocument = { querySelectorAll: () => inputs, getElementById: () => null };
    const ctx = loadSource(
      ['modules/shop/cobek-order.js'],
      { D, document: fakeDocument, escapeHtml: (s) => String(s), fmt: (n) => String(n), openModal() {}, closeModal() {}, toast() {}, save() {}, renderProductList() {}, AIBus: undefined },
      ['Produsen'],
    );
    ctx.Produsen.hargaEditId = 'prd_1';
    assert.doesNotThrow(() => ctx.Produsen.saveHarga());
  }
  // 2/3. PriceRekoWidget / StockRekoWidget / WeightBulkWidget
  {
    const D = { products: [{ id: 'prod_1', name: 'A', hargaBeli: 1000, hargaJual: 1200, kategoriId: '', beratPerUnit: null, stock: 1 }], bbmLogs: [], cobek: [] };
    const ctx = makePricingCtx({ D, AIBus: undefined, els: { weightBulkInput_prod_1: { value: '0.5' } } });
    await assert.doesNotReject(async () => { await ctx.PriceRekoWidget.applyOne('prod_1'); });
    assert.doesNotThrow(() => ctx.WeightBulkWidget.applyOne('prod_1'));
  }
  // 4. onTxShopStockProdusenChange()
  {
    const D = { produsen: [], products: [], cobekKategori: [] };
    const els = { txShopStockProdusen: { value: '__new__' }, txShopStockItem: null };
    const fakeDocument = { getElementById: (id) => (id in els ? els[id] : null) };
    const ctx = loadSource(
      ['modules/shop/cobek-tx-cart.js'],
      { D, document: fakeDocument, escapeHtml: (s) => String(s), uid: () => 'u1', save() {}, showPromptModal: async () => 'Baru', AIBus: undefined },
      ['curShopStockCart'],
    );
    ctx.populateTxShopStockSelect = () => {};
    await assert.doesNotReject(async () => { await ctx.onTxShopStockProdusenChange(); });
  }
  // 5. ImportShopExcel.commit()
  {
    const D = { produsen: [], products: [] };
    const ctx = makeIoCtx({ D, AIBus: undefined });
    ctx.ImportShopExcel.target = 'produsen';
    ctx.ImportShopExcel.parsedRows = [{ name: 'X', kontak: '', catatan: '', jarakKm: '', biayaPerKm: '' }];
    assert.doesNotThrow(() => ctx.ImportShopExcel.commit());
  }
});
