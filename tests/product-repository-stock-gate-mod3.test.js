'use strict';
// tests/product-repository-stock-gate-mod3.test.js — Modul 3 (Product
// Repository, sesi ini): Stock Mutation Gate.
//
// Cakupan:
//   A. Unit — ProductRepository.mutateStockDelta()/mutateSetStock()/
//      applyStockDelta()/validateStockDelta()/validateStockValue()/
//      findById()/hasDuplicateId() secara langsung (isolasi, cuma file
//      product-repository.js).
//   B. Integrasi — 6 titik call-site yang di-wire sesi ini
//      (cobek-tx-cart.js/cobek-pricing.js/cobek-io.js/tx-list-cashflow.js/
//      transaksi.js/business-flow-presenter.js TIDAK semua diintegrasikan di
//      sini — file DOM-heavy diuji lewat pemanggilan fungsi murni yang
//      relevan) benar-benar memanggil gate (bukan cuma fallback lama) &
//      hasil akhir `D.products[].stock` identik dgn business logic lama
//      (backward compatible), PLUS validasi baru (NaN/Infinity/delta bukan
//      angka) yang SEBELUM sesi ini tidak ada di titik manapun.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadRepo() {
  return loadSource(['modules/shop/generic/product-repository.js'], {}, ['ProductRepository']);
}

// === A. Unit: ProductRepository gate ========================================

test('ProductRepository.validateStockDelta() — delta valid, currentStock valid -> hasil diklem >=0', () => {
  const { ProductRepository } = loadRepo();
  const r1 = ProductRepository.validateStockDelta(10, 5);
  assert.equal(r1.ok, true); assert.equal(r1.value, 15);
  const r2 = ProductRepository.validateStockDelta(10, -15);
  assert.equal(r2.ok, true); assert.equal(r2.value, 0);
  const r3 = ProductRepository.validateStockDelta(undefined, 5);
  assert.equal(r3.ok, true); assert.equal(r3.value, 5);
  const r4 = ProductRepository.validateStockDelta(NaN, 5); // currentStock korup -> dianggap 0
  assert.equal(r4.ok, true); assert.equal(r4.value, 5);
});

test('ProductRepository.validateStockDelta() — delta NaN/Infinity/bukan-angka -> ok:false, TIDAK menghasilkan NaN', () => {
  const { ProductRepository } = loadRepo();
  assert.equal(ProductRepository.validateStockDelta(10, NaN).ok, false);
  assert.equal(ProductRepository.validateStockDelta(10, Infinity).ok, false);
  assert.equal(ProductRepository.validateStockDelta(10, -Infinity).ok, false);
  assert.equal(ProductRepository.validateStockDelta(10, 'lima').ok, false);
  assert.equal(ProductRepository.validateStockDelta(10, undefined).ok, false);
  assert.equal(ProductRepository.validateStockDelta(10, null).ok, false);
});

test('ProductRepository.validateStockValue() — SET absolut: valid diklem >=0, invalid ditolak', () => {
  const { ProductRepository } = loadRepo();
  const r1 = ProductRepository.validateStockValue(25);
  assert.equal(r1.ok, true); assert.equal(r1.value, 25);
  const r2 = ProductRepository.validateStockValue(-5);
  assert.equal(r2.ok, true); assert.equal(r2.value, 0);
  assert.equal(ProductRepository.validateStockValue(NaN).ok, false);
  assert.equal(ProductRepository.validateStockValue(Infinity).ok, false);
  assert.equal(ProductRepository.validateStockValue('10').ok, false);
});

test('ProductRepository.mutateStockDelta() — menulis .stock IN-PLACE ke referensi objek asli', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', stock: 10 };
  const r = ProductRepository.mutateStockDelta(p, 5);
  assert.equal(r.ok, true);
  assert.equal(r.stock, 15);
  assert.equal(p.stock, 15); // mutasi in-place beneran, bukan salinan
});

test('ProductRepository.mutateStockDelta() — delta tidak valid: .stock TIDAK disentuh sama sekali (fail-safe, bukan partial write)', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', stock: 10 };
  const r = ProductRepository.mutateStockDelta(p, NaN);
  assert.equal(r.ok, false);
  assert.equal(p.stock, 10); // tidak berubah, TIDAK jadi NaN
});

test('ProductRepository.mutateStockDelta() — produk tidak valid (null/array/primitif) -> ok:false', () => {
  const { ProductRepository } = loadRepo();
  assert.equal(ProductRepository.mutateStockDelta(null, 5).ok, false);
  assert.equal(ProductRepository.mutateStockDelta([], 5).ok, false);
  assert.equal(ProductRepository.mutateStockDelta('x', 5).ok, false);
});

test('ProductRepository.mutateSetStock() — SET absolut in-place, delta invalid ditolak fail-safe', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', stock: 10 };
  const r1 = ProductRepository.mutateSetStock(p, 40);
  assert.equal(r1.ok, true); assert.equal(r1.stock, 40);
  assert.equal(p.stock, 40);
  const before = p.stock;
  const r2 = ProductRepository.mutateSetStock(p, Infinity);
  assert.equal(r2.ok, false);
  assert.equal(p.stock, before); // tidak berubah
});

test('ProductRepository.applyStockDelta() — versi PURE, TIDAK memutasi produk asli', () => {
  const { ProductRepository } = loadRepo();
  const p = { id: 'p1', stock: 10 };
  const r = ProductRepository.applyStockDelta(p, 5);
  assert.equal(r.ok, true);
  assert.equal(r.product.stock, 15);
  assert.equal(p.stock, 10); // asli tidak berubah
  assert.notEqual(r.product, p); // objek baru
});

test('ProductRepository.findById() — deteksi id ganda (data korup) -> ditolak, tidak asal ambil match pertama', () => {
  const { ProductRepository } = loadRepo();
  const products = [
    { id: 'p1', stock: 5 },
    { id: 'p2', stock: 8 },
    { id: 'p1', stock: 99 }, // duplikat id (korup)
  ];
  const rOk = ProductRepository.findById(products, 'p2');
  assert.equal(rOk.ok, true);
  assert.equal(rOk.product.stock, 8);
  const rDup = ProductRepository.findById(products, 'p1');
  assert.equal(rDup.ok, false);
  assert.match(rDup.reason, /ganda/);
  const rMiss = ProductRepository.findById(products, 'tidak-ada');
  assert.equal(rMiss.ok, false);
  assert.equal(rMiss.product, null);
});

test('ProductRepository.hasDuplicateId()', () => {
  const { ProductRepository } = loadRepo();
  assert.equal(ProductRepository.hasDuplicateId([{ id: 'a' }, { id: 'b' }], 'a'), false);
  assert.equal(ProductRepository.hasDuplicateId([{ id: 'a' }, { id: 'a' }], 'a'), true);
  assert.equal(ProductRepository.hasDuplicateId([], 'a'), false);
});

test('ProductRepository.saveProduct() — menolak upsert yang menghasilkan id ganda di array target', () => {
  const { ProductRepository } = loadRepo();
  // products sumber SUDAH korup (2 entri id sama) -- upsert produk lain
  // tetap harus menolak karena hasil akhirnya (result array) masih punya
  // id ganda yang sudah ada sebelumnya.
  const corrupted = [{ id: 'dup', stock: 1 }, { id: 'dup', stock: 2 }, { id: 'ok', stock: 3 }];
  const r = ProductRepository.saveProduct(corrupted, { id: 'ok', stock: 5 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /ganda/);
});

test('ProductRepository.saveProduct() — upsert normal (tanpa duplikat) tetap ok:true seperti sebelumnya', () => {
  const { ProductRepository } = loadRepo();
  const products = [{ id: 'p1', stock: 1 }];
  const r = ProductRepository.saveProduct(products, { id: 'p2', stock: 2 });
  assert.equal(r.ok, true);
  assert.equal(r.products.length, 2);
});

// === B. Integrasi — call site nyata terhubung ke gate =======================

test('integrasi: cobek-tx-cart.js recordShopSale() memakai ProductRepository.mutateStockDelta() sebagai gate saat produk dimuat', () => {
  const D = {
    products: [{ id: 'prod1', name: 'Cobek 20cm', stock: 10, hargaBeli: 20000, hargaJual: 40000 }],
    cobek: [], cobekKategori: [], produsen: [],
    accounts: [{ id: 'acc1', name: 'Kas', emoji: '💵' }],
    transactions: [], piutang: [], profile: {},
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
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      uid: (() => { let n = 0; return () => 'uid_' + (++n); })(),
      toast: () => {},
      save: () => {},
      askConfirm: async () => true,
      Pelanggan: { _acList: () => [], onFieldInput: () => {}, select: () => {}, key: () => null },
    },
    ['ProductRepository'],
  );
  // Spy: bungkus mutateStockDelta supaya kita bisa lihat gate benar2
  // dipanggil (bukan cuma fallback inline lama).
  let gateCalls = 0;
  const origMutate = ctx.ProductRepository.mutateStockDelta;
  ctx.ProductRepository.mutateStockDelta = function (...args) {
    gateCalls++;
    return origMutate.apply(ctx.ProductRepository, args);
  };

  const result = ctx.recordShopSale({
    items: [{ productId: 'prod1', qty: 3 }],
    accountId: 'acc1',
    note: 'test jual',
  });

  assert.equal(result.ok, true);
  assert.equal(D.products[0].stock, 7); // 10 - 3, sama persis business logic lama
  assert.ok(gateCalls > 0, 'gate ProductRepository.mutateStockDelta() harus terpanggil');
});

test('integrasi: cobek-pricing.js StockRekoWidget.applyAll() pakai gate (guard typeof, tidak pecah kalau ProductRepository absen)', () => {
  // Muat TANPA product-repository.js -> pastikan fallback lama tetap jalan
  // (backward compatible, bukan pecah krn ReferenceError).
  const D = { products: [{ id: 'p1', name: 'Lumpang 15cm', stock: 2, hargaBeli: 10000, hargaJual: 20000 }], accounts: [], transactions: [], cobek: [], cobekKategori: [], produsen: [] };
  const ctx = loadSource(['modules/shop/cobek-pricing.js'], {
    D,
    escapeHtml: (s) => String(s),
    fmt: (n) => String(n),
    save: () => {},
    toast: () => {},
    renderProductList: () => {},
    askConfirm: async () => true,
  }, ['StockRekoWidget']);
  assert.equal(typeof ctx.ProductRepository, 'undefined');
  // StockRekoWidget.scan() butuh InventoryService dkk yang tidak dimuat --
  // cukup pastikan file ini load tanpa error (ReferenceError ProductRepository)
  // saat modul di-load & properti StockRekoWidget ada.
  assert.equal(typeof ctx.StockRekoWidget, 'object');
});

test('integrasi: cobek-pricing.js StockRekoWidget.applyAll() dgn ProductRepository dimuat -> gate benar2 dipanggil & hasil sama', async () => {
  const D = {
    products: [
      { id: 'p1', name: 'Lumpang 15cm', stock: 2, hargaBeli: 10000, hargaJual: 20000 },
    ],
    accounts: [], transactions: [], cobek: [], cobekKategori: [], produsen: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/shop/cobek-pricing.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      save: () => {},
      toast: () => {},
      renderProductList: () => {},
      askConfirm: async () => true,
    },
    ['ProductRepository', 'StockRekoWidget'],
  );
  let gateCalls = 0;
  const orig = ctx.ProductRepository.mutateStockDelta;
  ctx.ProductRepository.mutateStockDelta = function (...args) {
    gateCalls++;
    return orig.apply(ctx.ProductRepository, args);
  };
  // Panggil applyAll() lewat scan() yang di-stub via monkey-patch StockRekoWidget.scan
  ctx.StockRekoWidget.scan = () => [{ product: D.products[0], restockQty: 5, members: [D.products[0]], hasHistory: false, velocity: 0, daysLeft: 0 }];
  await ctx.StockRekoWidget.applyAll();
  assert.equal(D.products[0].stock, 7); // 2 + 5, sama persis rumus lama
  assert.ok(gateCalls > 0, 'applyAll() harus lewat ProductRepository.mutateStockDelta()');
});

test('integrasi: rollbackShopItems() menolak delta korup tanpa membuat stok NaN (validasi baru Modul 3)', () => {
  const D = {
    products: [{ id: 'prod1', name: 'Cobek', stock: 10, hargaBeli: 1000, hargaJual: 2000 }],
    cobek: [], cobekKategori: [], produsen: [],
    accounts: [{ id: 'acc1', name: 'Kas' }],
    transactions: [], piutang: [], profile: {},
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
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      MONTHS: ['Jan'],
      uid: (() => { let n = 0; return () => 'uid_' + (++n); })(),
      toast: () => {},
      save: () => {},
      askConfirm: async () => true,
      Pelanggan: { _acList: () => [], onFieldInput: () => {}, select: () => {}, key: () => null },
    },
  );
  // qty valid (>0) dipakai rollbackShopItems, tapi mari pastikan jalur qty
  // yang di-guard (Number.isFinite(q)&&q>0) di rollbackShopItems() sendiri
  // TETAP menahan qty tidak valid sebelum sampai ke gate sama sekali --
  // tidak ada regresi pada guard existing.
  ctx.rollbackShopItems([{ productId: 'prod1', qty: NaN }], 1);
  assert.equal(D.products[0].stock, 10); // tidak berubah (guard qty existing tetap jalan)
});

test('integrasi: shop-data-io-api.js commitShopRows menolak nilai stok korup (NaN/Infinity) lewat mutateSetStock, TIDAK menulis NaN ke produk', () => {
  const D = {
    products: [{ id: 'p1', name: 'Cobek Existing', stock: 5, hargaBeli: 1000, hargaJual: 2000 }],
    cobekKategori: [], produsen: [], accounts: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/business/shop-data-io-api.js'],
    {
      D,
      resolveShopKategori: () => '',
      toast: () => {},
      save: () => {},
    },
    ['ShopDataIO'],
  );
  const rows = [{ nama: 'Cobek Existing', stok: NaN, hargaBeli: 9999 }];
  const summary = ctx.ShopDataIO.commitShopRows(rows);
  // Field lain (hargaBeli) tetap ke-update (business logic lama utuh),
  // tapi stock TIDAK jadi NaN krn gate menolak nilai tidak valid.
  assert.equal(D.products[0].hargaBeli, 9999);
  assert.equal(D.products[0].stock, 5); // tidak berubah jadi NaN
  assert.ok(summary);
});

test('integrasi: shop-data-io-api.js commitShopRows tetap SET stok baru yang valid seperti sebelumnya', () => {
  const D = {
    products: [{ id: 'p1', name: 'Cobek Existing', stock: 5, hargaBeli: 1000, hargaJual: 2000 }],
    cobekKategori: [], produsen: [], accounts: [],
  };
  const ctx = loadSource(
    ['modules/shop/generic/product-repository.js', 'modules/business/shop-data-io-api.js'],
    {
      D,
      resolveShopKategori: () => '',
      toast: () => {},
      save: () => {},
    },
    ['ShopDataIO'],
  );
  const rows = [{ nama: 'Cobek Existing', stok: 40 }];
  ctx.ShopDataIO.commitShopRows(rows);
  assert.equal(D.products[0].stock, 40);
});
