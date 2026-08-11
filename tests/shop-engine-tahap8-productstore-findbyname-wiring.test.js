'use strict';
// tests/shop-engine-tahap8-productstore-findbyname-wiring.test.js — regresi
// Tahap 8 (Generic Shop Engine: ProductStore.findByName() + by-name lookup
// wiring). Lihat LAPORAN-TAHAP8-GENERIC-SHOP-ENGINE.md.
//
// Yang dites:
// 1. ProductStore.findByName(name) murni sendiri — case-insensitive, null
//    kalau kosong/tidak ketemu/D belum ada, delegasi PERSIS list().find().
// 2. Parity "dengan vs tanpa ProductStore dimuat" utk 6 titik yang di-wire
//    sesi ini (guard typeof + fallback field asli):
//    a. shop-pdf-import-ui.js:149 — shopPdfImportUiRenderPreview() (preview
//       label read-only)
//    b. shop-scan-ui.js:143 — shopScanUiRenderPreview() (preview label
//       read-only)
//    c. shop-data-io-api.js:38 — ShopDataIO.commitShopRows() (commit, tapi
//       reference sama -> mutasi tetap jalan identik)
//    d. shop-data-io-api.js:172 — ShopDataIO.importShopJSON() mode 'gabung'
//       (commit, sama alasan dgn (c))
//    e. shop-data-io-api.js:259 — ShopCsvImport._renderPreview() (preview
//       created/updated count, read-only)
//    f. shop-data-io-api.js:368 — ShopJsonIO._renderPreview() (preview
//       created/updated count, read-only)

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides = {}) {
  return {
    products: [],
    produsen: [],
    cobekKategori: [],
    ...overrides,
  };
}

function makeDocStub() {
  const store = {};
  return {
    getElementById(id) {
      if (!store[id]) store[id] = { innerHTML: '', value: '', disabled: false };
      return store[id];
    },
    _store: store,
  };
}

const PRODUCT_STORE_FILE = 'modules/shop/generic/product-store.js';

// === 1. ProductStore.findByName() murni ===================================

test('ProductStore.findByName() — case-insensitive, delegasi list().find(), null kalau kosong/tidak ketemu', () => {
  const D = makeD({
    products: [
      { id: 'p1', name: 'Cobek Batu 20cm' },
      { id: 'p2', name: 'Lumpang 10cm+alu' },
    ],
  });
  const ctx = loadSource([PRODUCT_STORE_FILE], { D }, ['ProductStore']);
  assert.equal(ctx.ProductStore.findByName('cobek batu 20cm').id, 'p1');
  assert.equal(ctx.ProductStore.findByName('LUMPANG 10CM+ALU').id, 'p2');
  assert.equal(ctx.ProductStore.findByName('Tidak Ada'), null);
  assert.equal(ctx.ProductStore.findByName(''), null);
  assert.equal(ctx.ProductStore.findByName(null), null);
});

test('ProductStore.findByName() — [] kalau D/D.products belum ada (guard sama seperti list())', () => {
  const ctx = loadSource([PRODUCT_STORE_FILE], {}, ['ProductStore']);
  assert.equal(ctx.ProductStore.findByName('apa saja'), null);
});

// === 2a/2b. shop-pdf-import-ui.js & shop-scan-ui.js — preview label ========

function makePdfImportCtx(D, withProductStore) {
  const files = withProductStore
    ? ['modules/business/shop-pdf-import-ui.js', PRODUCT_STORE_FILE]
    : ['modules/business/shop-pdf-import-ui.js'];
  const doc = makeDocStub();
  const ctx = loadSource(
    files,
    { D, document: doc, escapeHtml: (s) => String(s) },
    ['_shopPdfImportRows'],
  );
  return { ctx, doc };
}

test('shopPdfImportUiRenderPreview() — status "update"/"baru" SAMA persis dgn/tanpa ProductStore dimuat', () => {
  const D = makeD({
    products: [{ id: 'p1', name: 'Lumpang 10cm+alu', hargaBeli: 30000 }],
  });
  const rows = [
    { nama: 'Lumpang 10cm+alu', kategori: '', harga: 30000, included: true },
    { nama: 'Produk Baru', kategori: '', harga: 5000, included: true },
  ];

  const { ctx: withCtx, doc: withDoc } = makePdfImportCtx(D, true);
  withCtx._shopPdfImportRows.push(...rows);
  withCtx.shopPdfImportUiRenderPreview();

  const { ctx: withoutCtx, doc: withoutDoc } = makePdfImportCtx(D, false);
  withoutCtx._shopPdfImportRows.push(...rows);
  withoutCtx.shopPdfImportUiRenderPreview();

  const htmlWith = withDoc._store.shopPdfImportPreview.innerHTML;
  const htmlWithout = withoutDoc._store.shopPdfImportPreview.innerHTML;
  assert.equal(htmlWith, htmlWithout);
  assert.match(htmlWith, /Lumpang 10cm\+alu[\s\S]*🔄 update/);
  assert.match(htmlWith, /Produk Baru[\s\S]*🆕 baru/);
});

function makeScanCtx(D, withProductStore) {
  const files = withProductStore
    ? ['modules/business/shop-scan-ui.js', PRODUCT_STORE_FILE]
    : ['modules/business/shop-scan-ui.js'];
  const doc = makeDocStub();
  const ctx = loadSource(
    files,
    { D, document: doc, escapeHtml: (s) => String(s) },
    ['_shopScanRows'],
  );
  return { ctx, doc };
}

test('shopScanUiRenderPreview() — status "update"/"baru" SAMA persis dgn/tanpa ProductStore dimuat', () => {
  const D = makeD({
    products: [{ id: 'p1', name: 'Cobek 13cm', hargaJual: 22000 }],
  });
  const rows = [
    { nama: 'Cobek 13cm', kategori: '', harga: 22000, included: true },
    { nama: 'Produk Baru Scan', kategori: '', harga: 7000, included: true },
  ];

  const { ctx: withCtx, doc: withDoc } = makeScanCtx(D, true);
  withCtx._shopScanRows.push(...rows);
  withCtx.shopScanUiRenderPreview();

  const { ctx: withoutCtx, doc: withoutDoc } = makeScanCtx(D, false);
  withoutCtx._shopScanRows.push(...rows);
  withoutCtx.shopScanUiRenderPreview();

  const htmlWith = withDoc._store.shopScanPreview.innerHTML;
  const htmlWithout = withoutDoc._store.shopScanPreview.innerHTML;
  assert.equal(htmlWith, htmlWithout);
  assert.match(htmlWith, /Cobek 13cm[\s\S]*🔄 update/);
  assert.match(htmlWith, /Produk Baru Scan[\s\S]*🆕 baru/);
});

// === 2c/2d/2e/2f. shop-data-io-api.js — commit & preview ===================

function makeDataIoCtx(D, withProductStore) {
  const files = withProductStore
    ? ['modules/shop/cobek-tx-cart.js', 'modules/business/shop-data-io-api.js', PRODUCT_STORE_FILE]
    : ['modules/shop/cobek-tx-cart.js', 'modules/business/shop-data-io-api.js'];
  const doc = makeDocStub();
  return {
    ctx: loadSource(
      files,
      {
        D,
        document: doc,
        SCHEMA_VERSION: 4,
        save: () => {},
        uid: (() => { let n = 0; return () => 'uid_' + (n++); })(),
        openModal: () => {},
        closeModal: () => {},
        toast: () => {},
        escapeHtml: (s) => String(s),
        fmtFull: (n) => 'Rp ' + n,
        renderProductList: () => {},
        askConfirm: async () => true,
      },
      ['ShopDataIO', 'ShopCsvImport', 'ShopJsonIO'],
    ),
    doc,
  };
}

test('ShopDataIO.commitShopRows() — hasil (created/updated + field produk) SAMA persis dgn/tanpa ProductStore dimuat', () => {
  const rowsIn = [
    { nama: 'Lumpang 10cm+alu', hargaBeli: 31000, hargaJual: 45000, stok: 8, satuan: 'pcs' },
    { nama: 'Produk Baru Commit', hargaBeli: 9000, hargaJual: 15000, stok: 3, satuan: 'pcs' },
  ];

  const D1 = makeD({ products: [{ id: 'p1', name: 'Lumpang 10cm+alu', hargaBeli: 30000, hargaJual: 40000, stock: 5 }] });
  const { ctx: withCtx } = makeDataIoCtx(D1, true);
  const resWith = withCtx.ShopDataIO.commitShopRows(rowsIn);

  const D2 = makeD({ products: [{ id: 'p1', name: 'Lumpang 10cm+alu', hargaBeli: 30000, hargaJual: 40000, stock: 5 }] });
  const { ctx: withoutCtx } = makeDataIoCtx(D2, false);
  const resWithout = withoutCtx.ShopDataIO.commitShopRows(rowsIn);

  // resWith/resWithout datang dari 2 vm context terpisah (realm beda), jadi
  // Object.prototype-nya beda referensi -> assert.deepEqual/deepStrictEqual
  // akan gagal walau ISI-nya identik (bandingkan lewat JSON round-trip
  // supaya yang dibandingkan murni nilai, bukan identitas objek/prototype).
  assert.deepEqual(JSON.parse(JSON.stringify(resWith)), JSON.parse(JSON.stringify(resWithout)));
  assert.equal(resWith.created, 1);
  assert.equal(resWith.updated, 1);
  // Reference tetap live: produk existing termutasi, bukan objek baru.
  assert.equal(D1.products.find((p) => p.id === 'p1').hargaBeli, 31000);
  assert.equal(D2.products.find((p) => p.id === 'p1').hargaBeli, 31000);
});

test('ShopDataIO.importShopJSON(mode gabung) — hasil SAMA persis dgn/tanpa ProductStore dimuat', () => {
  const imp = {
    products: [
      { name: 'Lumpang 10cm+alu', hargaBeli: 32000 },
      { name: 'Produk Baru Json', hargaBeli: 6000, hargaJual: 9000 },
    ],
    produsen: [],
  };

  const D1 = makeD({ products: [{ id: 'p1', name: 'Lumpang 10cm+alu', hargaBeli: 30000 }] });
  const { ctx: withCtx } = makeDataIoCtx(D1, true);
  const resWith = withCtx.ShopDataIO.importShopJSON(imp, 'gabung');

  const D2 = makeD({ products: [{ id: 'p1', name: 'Lumpang 10cm+alu', hargaBeli: 30000 }] });
  const { ctx: withoutCtx } = makeDataIoCtx(D2, false);
  const resWithout = withoutCtx.ShopDataIO.importShopJSON(imp, 'gabung');

  // Sama alasan dgn test commitShopRows() di atas — bandingkan via JSON
  // round-trip supaya tidak kena mismatch prototype lintas-realm vm.
  assert.deepEqual(JSON.parse(JSON.stringify(resWith)), JSON.parse(JSON.stringify(resWithout)));
  assert.equal(resWith.created, 1);
  assert.equal(resWith.updated, 1);
  assert.equal(D1.products.find((p) => p.id === 'p1').hargaBeli, 32000);
  assert.equal(D2.products.find((p) => p.id === 'p1').hargaBeli, 32000);
});

test('ShopCsvImport._renderPreview() — hitung created/updated & label SAMA persis dgn/tanpa ProductStore dimuat', () => {
  const D = makeD({ products: [{ id: 'p1', name: 'Cobek 13cm' }] });
  const rows = [
    { nama: 'Cobek 13cm', hargaJual: 20000, stok: 5, satuan: 'pcs' },
    { nama: 'Baru CSV', hargaJual: 10000, stok: 2, satuan: 'pcs' },
  ];

  const { ctx: withCtx, doc: withDoc } = makeDataIoCtx(D, true);
  withCtx.ShopCsvImport.parsedRows = rows;
  withCtx.ShopCsvImport._renderPreview();

  const { ctx: withoutCtx, doc: withoutDoc } = makeDataIoCtx(D, false);
  withoutCtx.ShopCsvImport.parsedRows = rows;
  withoutCtx.ShopCsvImport._renderPreview();

  const htmlWith = withDoc._store.shopCsvImportPreview.innerHTML;
  const htmlWithout = withoutDoc._store.shopCsvImportPreview.innerHTML;
  assert.equal(htmlWith, htmlWithout);
  assert.match(htmlWith, /1 baru, 1 update/);
});

test('ShopJsonIO._renderPreview() (mode gabung) — hitung created/updated SAMA persis dgn/tanpa ProductStore dimuat', () => {
  const D = makeD({ products: [{ id: 'p1', name: 'Lumpang 11cm' }], produsen: [] });
  const parsed = {
    products: [
      { name: 'Lumpang 11cm', hargaJual: 28000 },
      { name: 'Baru Json Preview', hargaJual: 12000 },
    ],
    produsen: [],
  };

  const { ctx: withCtx, doc: withDoc } = makeDataIoCtx(D, true);
  withCtx.ShopJsonIO.mode = 'gabung';
  withCtx.ShopJsonIO.parsed = parsed;
  withCtx.ShopJsonIO._renderPreview();

  const { ctx: withoutCtx, doc: withoutDoc } = makeDataIoCtx(D, false);
  withoutCtx.ShopJsonIO.mode = 'gabung';
  withoutCtx.ShopJsonIO.parsed = parsed;
  withoutCtx.ShopJsonIO._renderPreview();

  const htmlWith = withDoc._store.shopJsonImportPreview.innerHTML;
  const htmlWithout = withoutDoc._store.shopJsonImportPreview.innerHTML;
  assert.equal(htmlWith, htmlWithout);
  assert.match(htmlWith, /<b>1<\/b> baru, <b>1<\/b> update/);
});

// === 3. ShopExport.etalaseRows() TIDAK diubah (sanity, bukan regresi baru) =

test('ShopExport.etalaseRows() tetap pakai p.stock (TIDAK disentuh Tahap 8)', () => {
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'modules/shop/cobek-io.js'),
    'utf8',
  );
  const start = src.indexOf('etalaseRows(){');
  const braceOpen = src.indexOf('{', start);
  let depth = 1, i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  const body = src.slice(braceOpen, i);
  assert.match(body, /p\.stock/);
  assert.doesNotMatch(body, /ProductStore/);
});
