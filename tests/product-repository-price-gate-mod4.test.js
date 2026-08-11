'use strict';
// tests/product-repository-price-gate-mod4.test.js — Modul 4 (Product
// Repository, sesi ini): Price Mutation Gate.
//
// Cakupan:
//   A. Unit — ProductRepository.validatePriceValue()/mutateSetPrice() secara
//      langsung (isolasi, cuma file product-repository.js).
//   B. Integrasi — 5 titik call-site yang di-wire sesi ini
//      (shop-data-io-api.js/cobek-io.js/cobek-tx-cart.js/cobek-pricing.js/
//      cobek-etalase.js) benar-benar memanggil gate (bukan cuma fallback
//      lama) & hasil akhir `.hargaBeli`/`.hargaJual` identik dgn business
//      logic lama (backward compatible) utk nilai valid, PLUS validasi baru
//      (NaN/Infinity/nilai bukan angka TIDAK menimpa harga jadi korup) yang
//      SEBELUM sesi ini tidak ada di titik manapun.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadRepo() {
  return loadSource(['modules/shop/generic/product-repository.js'], {}, ['ProductRepository']);
}

// === A. Unit: ProductRepository price gate ==================================

test('ProductRepository.validatePriceValue() — angka valid diklem >=0', () => {
  const { ProductRepository } = loadRepo();
  const r1 = ProductRepository.validatePriceValue(15000);
  assert.equal(r1.ok, true); assert.equal(r1.value, 15000);
  const r2 = ProductRepository.validatePriceValue(0);
  assert.equal(r2.ok, true); assert.equal(r2.value, 0);
  const r3 = ProductRepository.validatePriceValue(-500);
  assert.equal(r3.ok, true); assert.equal(r3.value, 0); // negatif diklem ke 0
});

test('ProductRepository.validatePriceValue() — NaN/Infinity/bukan-angka -> ok:false, TIDAK menghasilkan harga korup', () => {
  const { ProductRepository } = loadRepo();
  assert.equal(ProductRepository.validatePriceValue(NaN).ok, false);
  assert.equal(ProductRepository.validatePriceValue(Infinity).ok, false);
  assert.equal(ProductRepository.validatePriceValue(-Infinity).ok, false);
  assert.equal(ProductRepository.validatePriceValue('20000').ok, false);
  assert.equal(ProductRepository.validatePriceValue(undefined).ok, false);
  assert.equal(ProductRepository.validatePriceValue(null).ok, false);
});

test('ProductRepository.mutateSetPrice() — menulis .hargaBeli/.hargaJual IN-PLACE ke referensi objek asli', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaBeli: 1000, hargaJual: 2000 };
  const r1 = ProductRepository.mutateSetPrice(p, 'hargaBeli', 5000);
  assert.equal(r1.ok, true); assert.equal(r1.value, 5000);
  assert.equal(p.hargaBeli, 5000); // mutasi in-place beneran, bukan salinan
  const r2 = ProductRepository.mutateSetPrice(p, 'hargaJual', 9000);
  assert.equal(r2.ok, true);
  assert.equal(p.hargaJual, 9000);
});

test('ProductRepository.mutateSetPrice() — value tidak valid: field TIDAK disentuh sama sekali (fail-safe, bukan partial write)', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaBeli: 1000, hargaJual: 2000 };
  const r = ProductRepository.mutateSetPrice(p, 'hargaJual', NaN);
  assert.equal(r.ok, false);
  assert.equal(p.hargaJual, 2000); // tidak berubah, TIDAK jadi NaN

  const r2 = ProductRepository.mutateSetPrice(p, 'hargaBeli', undefined);
  assert.equal(r2.ok, false);
  assert.equal(p.hargaBeli, 1000); // tidak berubah, TIDAK jadi undefined
});

test('ProductRepository.mutateSetPrice() — field di luar scope (mis. stock) ditolak', () => {
  // Catatan: `hargaReseller` DULU di luar scope gate ini (Modul 4), tapi
  // sejak Modul 5 (lihat tests/product-repository-attribute-gate-mod5.test.js)
  // sudah masuk scope mutateSetPrice() sbg field ketiga — assert
  // penolakannya DIPINDAH ke sana, bukan dihapus, supaya test tetap
  // merepresentasikan perilaku TERKINI (bukan Modul 4 semata).
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', hargaBeli: 1000, hargaJual: 2000, hargaReseller: null, stock: 5 };
  assert.equal(ProductRepository.mutateSetPrice(p, 'stock', 10).ok, false);
  assert.equal(p.stock, 5); // tidak tersentuh
});

test('ProductRepository.mutateSetPrice() — produk tidak valid (null/array/primitif) -> ok:false', () => {
  const { ProductRepository } = loadRepo();
  assert.equal(ProductRepository.mutateSetPrice(null, 'hargaJual', 5000).ok, false);
  assert.equal(ProductRepository.mutateSetPrice([], 'hargaJual', 5000).ok, false);
  assert.equal(ProductRepository.mutateSetPrice('x', 'hargaJual', 5000).ok, false);
});

// === B. Integrasi: 5 call-site =============================================

test('integrasi: shop-data-io-api.js commitShopRows() SET hargaBeli/hargaJual valid lewat gate, hasil sama seperti sebelumnya', () => {
  const D = {
    products: [{ id: 'p1', name: 'Cobek Existing', stock: 5, hargaBeli: 1000, hargaJual: 2000 }],
    cobekKategori: [], produsen: [], accounts: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/business/shop-data-io-api.js'],
    { D, resolveShopKategori: () => '', toast: () => {}, save: () => {} },
    ['ShopDataIO', 'ProductRepository'],
  );
  let gateCalls = 0;
  const orig = ctx.ProductRepository.mutateSetPrice;
  ctx.ProductRepository.mutateSetPrice = function (...args) {
    gateCalls++;
    return orig.apply(ctx.ProductRepository, args);
  };
  const rows = [{ nama: 'Cobek Existing', hargaBeli: 9999, hargaJual: 19999 }];
  const summary = ctx.ShopDataIO.commitShopRows(rows);
  assert.ok(summary.ok);
  assert.equal(D.products[0].hargaBeli, 9999);
  assert.equal(D.products[0].hargaJual, 19999);
  assert.ok(gateCalls >= 2, 'commitShopRows() harus lewat ProductRepository.mutateSetPrice() utk hargaBeli & hargaJual');
});

test('integrasi: shop-data-io-api.js commitShopRows() menolak hargaBeli/hargaJual korup (NaN), TIDAK menulis NaN ke produk', () => {
  const D = {
    products: [{ id: 'p1', name: 'Cobek Existing', stock: 5, hargaBeli: 1000, hargaJual: 2000 }],
    cobekKategori: [], produsen: [], accounts: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/business/shop-data-io-api.js'],
    { D, resolveShopKategori: () => '', toast: () => {}, save: () => {} },
    ['ShopDataIO'],
  );
  const rows = [{ nama: 'Cobek Existing', hargaBeli: NaN, hargaJual: 25000, stok: 8 }];
  const summary = ctx.ShopDataIO.commitShopRows(rows);
  assert.ok(summary);
  assert.equal(D.products[0].hargaBeli, 1000); // tidak berubah, TIDAK jadi NaN
  assert.equal(D.products[0].hargaJual, 25000); // field lain (valid) tetap ke-update
  assert.equal(D.products[0].stock, 8); // stok (gate Modul 3) tetap jalan normal
});

test('integrasi: cobek-io.js ImportShopExcel.commit() (Excel produk existing) SET harga lewat gate, hasil sama seperti sebelumnya', () => {
  const D = {
    products: [{ id: 'p1', name: 'Lumpang 15cm', stock: 2, hargaBeli: 10000, hargaJual: 20000 }],
    produsen: [], cobekKategori: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-io.js'],
    {
      D,
      resolveShopKategori: () => '',
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      toast: () => {},
      save: () => {},
      closeModal: () => {},
      renderProdusenList: () => {},
      uid: (() => { let n = 0; return () => 'uid_' + (++n); })(),
      Etalase: { renderList: () => {}, renderKategoriList: () => {}, renderModalStat: () => {} },
      PriceRekoWidget: { render: () => {} },
      StockRekoWidget: { render: () => {} },
    },
    ['ImportShopExcel', 'ProductRepository'],
  );
  let gateCalls = 0;
  const orig = ctx.ProductRepository.mutateSetPrice;
  ctx.ProductRepository.mutateSetPrice = function (...args) {
    gateCalls++;
    return orig.apply(ctx.ProductRepository, args);
  };
  ctx.ImportShopExcel.target = 'produk';
  ctx.ImportShopExcel.parsedRows = [
    { name: 'Lumpang 15cm', stock: 6, hargaBeli: 12000, hargaJual: 24000, hargaReseller: null, diskonPersen: 0, kategori: '', produsen: '' },
  ];
  ctx.ImportShopExcel.commit();
  assert.equal(D.products[0].hargaBeli, 12000);
  assert.equal(D.products[0].hargaJual, 24000);
  assert.equal(D.products[0].stock, 6);
  assert.ok(gateCalls >= 2, 'ImportShopExcel.commit() harus lewat ProductRepository.mutateSetPrice() utk hargaBeli & hargaJual');
});

test('integrasi: cobek-io.js ImportShopExcel.commit() menolak harga korup (Infinity), produk existing TIDAK ketimpa harga rusak', () => {
  const D = {
    products: [{ id: 'p1', name: 'Lumpang 15cm', stock: 2, hargaBeli: 10000, hargaJual: 20000 }],
    produsen: [], cobekKategori: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-io.js'],
    {
      D,
      resolveShopKategori: () => '',
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      toast: () => {},
      save: () => {},
      closeModal: () => {},
      renderProdusenList: () => {},
      uid: (() => { let n = 0; return () => 'uid_' + (++n); })(),
      Etalase: { renderList: () => {}, renderKategoriList: () => {}, renderModalStat: () => {} },
      PriceRekoWidget: { render: () => {} },
      StockRekoWidget: { render: () => {} },
    },
    ['ImportShopExcel'],
  );
  ctx.ImportShopExcel.target = 'produk';
  ctx.ImportShopExcel.parsedRows = [
    { name: 'Lumpang 15cm', stock: 2, hargaBeli: Infinity, hargaJual: 24000, hargaReseller: null, diskonPersen: 0, kategori: '', produsen: '' },
  ];
  ctx.ImportShopExcel.commit();
  assert.equal(D.products[0].hargaBeli, 10000); // tidak berubah, TIDAK jadi Infinity
  assert.equal(D.products[0].hargaJual, 24000); // field lain (valid) tetap ke-update
});

test('integrasi: cobek-tx-cart.js applyTxShopStockFromTx() (restock) SET hargaBeli lewat gate, hasil sama seperti sebelumnya', () => {
  const D = {
    products: [{ id: 'prod1', name: 'Cobek 20cm', stock: 10, hargaBeli: 20000, hargaJual: 40000 }],
    cobek: [], cobekKategori: [], produsen: [],
    accounts: [{ id: 'acc1', name: 'Kas' }],
    transactions: [], piutang: [], profile: {},
  };
  const fakeDocument = {
    getElementById(id) {
      if (id === 'txAddShopStock') return { checked: true };
      if (id === 'txShopStockPanel') return { style: { display: 'block' } };
      return null;
    },
  };
  const ctx = loadSource(
    [
      'modules/shop/generic/product-repository.js',
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/shop/cobek-order.js',
      'modules/shop/cobek-tx-cart.js',
    ],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      uid: (() => { let n = 0; return () => 'uid_' + (++n); })(),
      toast: () => {},
      save: () => {},
      askConfirm: async () => true,
      resolveShopKategori: () => '',
      renderProductList: () => {},
      Pelanggan: { _acList: () => [], onFieldInput: () => {}, select: () => {}, key: () => null },
    },
    ['ProductRepository', 'curShopStockCart'],
  );
  let gateCalls = 0;
  const orig = ctx.ProductRepository.mutateSetPrice;
  ctx.ProductRepository.mutateSetPrice = function (...args) {
    gateCalls++;
    return orig.apply(ctx.ProductRepository, args);
  };
  ctx.curShopStockCart.push({ productId: 'prod1', isNew: false, name: 'Cobek 20cm', qty: 5, hargaBeli: 21000, produsenId: '', kategoriInput: '', hargaJual: 0 });
  ctx.applyTxShopStockFromTx('tx1', 'restock test', null);
  assert.equal(D.products[0].hargaBeli, 21000); // sama persis business logic lama
  assert.equal(D.products[0].stock, 15); // 10 + 5, gate Modul 3 tetap jalan
  assert.ok(gateCalls > 0, 'applyTxShopStockFromTx() harus lewat ProductRepository.mutateSetPrice() utk hargaBeli');
});

test('integrasi: cobek-pricing.js PriceRekoWidget.applyOne() SET hargaJual lewat gate, hasil sama seperti sebelumnya', async () => {
  const D = {
    products: [{ id: 'p1', name: 'Cobek 20cm', hargaBeli: 20000, hargaJual: 35000, kategoriId: '', stock: 5 }],
    cobekKategori: [], bbmLogs: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-pricing.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      save: () => {},
      toast: () => {},
      renderProductList: () => {},
      askConfirm: async () => true,
      Etalase: { pairSiblings: () => [] }, // produk tanpa pasangan ukuran -> fallback avgMarginForKategori
    },
    ['ProductRepository', 'PriceRekoWidget'],
  );
  let gateCalls = 0;
  const orig = ctx.ProductRepository.mutateSetPrice;
  ctx.ProductRepository.mutateSetPrice = function (...args) {
    gateCalls++;
    return orig.apply(ctx.ProductRepository, args);
  };
  await ctx.PriceRekoWidget.applyOne('p1');
  assert.ok(gateCalls > 0, 'applyOne() harus lewat ProductRepository.mutateSetPrice()');
  assert.equal(D.products[0].hargaJual, ctx.PriceRekoWidget.recommend(D.products[0]));
});

test('integrasi: cobek-pricing.js PriceRekoWidget.applyBulk() SET hargaJual lewat gate utk semua target, hasil sama seperti sebelumnya', async () => {
  const D = {
    products: [
      { id: 'p1', name: 'Cobek 20cm', hargaBeli: 20000, hargaJual: 0, kategoriId: '', stock: 5 },
      { id: 'p2', name: 'Cobek 25cm', hargaBeli: 30000, hargaJual: 0, kategoriId: '', stock: 3 },
    ],
    cobekKategori: [], bbmLogs: [],
  };
  const fakeDocument = {
    getElementById(id) {
      if (id === 'priceRekoBulkTransport') return { value: '2000' };
      if (id === 'priceRekoBulkMargin') return { value: '25' };
      return null;
    },
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-pricing.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      save: () => {},
      toast: () => {},
      renderProductList: () => {},
      askConfirm: async () => true,
    },
    ['ProductRepository', 'PriceRekoWidget', 'PriceReko'],
  );
  let gateCalls = 0;
  const orig = ctx.ProductRepository.mutateSetPrice;
  ctx.ProductRepository.mutateSetPrice = function (...args) {
    gateCalls++;
    return orig.apply(ctx.ProductRepository, args);
  };
  await ctx.PriceRekoWidget.applyBulk();
  // (hargaBeli + transport) * (1 + margin/100), sama rumus lama
  assert.equal(D.products[0].hargaJual, ctx.PriceReko.roundNice((20000 + 2000) * 1.25));
  assert.equal(D.products[1].hargaJual, ctx.PriceReko.roundNice((30000 + 2000) * 1.25));
  assert.ok(gateCalls >= 2, 'applyBulk() harus lewat ProductRepository.mutateSetPrice() utk tiap target');
});

test('integrasi: cobek-etalase.js Etalase.syncPairedPrice() sinkron hargaJual siblings lewat gate, hasil sama seperti sebelumnya', () => {
  const D = {
    products: [
      { id: 'p1', name: 'Cobek Bulat 15cm', hargaJual: 30000, priceGroupId: null },
      { id: 'p2', name: 'Cobek Bulat 20cm', hargaJual: 25000, priceGroupId: null },
    ],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-etalase.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      save: () => {},
      toast: () => {},
    },
    ['ProductRepository', 'Etalase'],
  );
  // syncPairedPrice() bergantung pada linkedSiblings() -> pairSiblings()/groupSiblings().
  // Pakai priceGroupId manual (jalur groupSiblings, tidak bergantung parseSizeName) supaya
  // test fokus ke gate harga, bukan parser nama produk.
  D.products[0].priceGroupId = 'pg1';
  D.products[1].priceGroupId = 'pg1';
  let gateCalls = 0;
  const orig = ctx.ProductRepository.mutateSetPrice;
  ctx.ProductRepository.mutateSetPrice = function (...args) {
    gateCalls++;
    return orig.apply(ctx.ProductRepository, args);
  };
  ctx.Etalase.renderList = () => {}; // stub render, DOM-heavy, di luar scope test ini
  ctx.Etalase.syncPairedPrice(D.products[0]);
  assert.equal(D.products[1].hargaJual, 30000); // ikut disamakan ke produk yg baru diedit
  assert.ok(gateCalls > 0, 'syncPairedPrice() harus lewat ProductRepository.mutateSetPrice()');
});

test('integrasi: cobek-etalase.js Etalase.confirmMerge() SET hargaJual gabungan lewat gate ke semua anggota grup', () => {
  const D = {
    products: [
      { id: 'p1', name: 'Cobek A', hargaJual: 10000 },
      { id: 'p2', name: 'Cobek B', hargaJual: 12000 },
    ],
  };
  const fakeDocument = {
    getElementById(id) {
      if (id === 'mergeProductPrice') return { value: '15000' };
      return null;
    },
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-etalase.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      save: () => {},
      toast: () => {},
      closeModal: () => {},
    },
    ['ProductRepository', 'Etalase'],
  );
  ctx.Etalase.mergeSelectedIds = new Set(['p1', 'p2']);
  ctx.Etalase.renderList = () => {}; // stub render, DOM-heavy, di luar scope test ini
  let gateCalls = 0;
  const orig = ctx.ProductRepository.mutateSetPrice;
  ctx.ProductRepository.mutateSetPrice = function (...args) {
    gateCalls++;
    return orig.apply(ctx.ProductRepository, args);
  };
  ctx.Etalase.confirmMerge();
  assert.equal(D.products[0].hargaJual, 15000);
  assert.equal(D.products[1].hargaJual, 15000);
  assert.equal(D.products[0].priceGroupId, D.products[1].priceGroupId);
  assert.ok(gateCalls >= 2, 'confirmMerge() harus lewat ProductRepository.mutateSetPrice() utk tiap anggota grup');
});
