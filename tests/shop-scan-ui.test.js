'use strict';
// tests/shop-scan-ui.test.js — cakupan Bagian B (Shop Import/Export:
// Scan/PDF/CSV/JSON), §B.3.1 Scan, Sesi N+8 (setelah Sesi N+7 Import PDF
// Shop) di DESIGN_torsi-vehicle-selector_shop-import-export-2.md.
//
// Sesi ini TIDAK menambah engine OCR/parser/commit baru — 100% reuse:
//   - ocrRecognize() (scan-ocr.js) — pipeline OCR yang SUDAH ADA & sudah
//     teruji (dipakai scanReceipt()/BillMultiScan/UniversalScan), TIDAK
//     dites ulang di sini (di luar cakupan file ini — akses jaringan/model
//     Tesseract nyata tidak dijalankan dalam unit test).
//   - ImportKatalog.parseText() — sudah dites lengkap di
//     tests/shop-pdf-import.test.js (1 sumber kebenaran parsing, dipakai
//     bareng Scan sesi ini), TIDAK dites ulang di sini.
//   - ShopDataIO.commitShopRows() — sudah dites lengkap di
//     tests/shop-data-io-csv-import.test.js — di sini HANYA dites lewat
//     mapping target Harga Beli/Harga Jual (kontribusi baru shop-scan-ui.js,
//     pola sama persis tests/shop-pdf-import.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides = {}) {
  return {
    products: [],
    cobekKategori: [],
    ...overrides,
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shop/cobek-tx-cart.js', 'modules/business/shop-data-io-api.js', 'modules/shop/cobek-io.js', 'modules/business/shop-scan-ui.js'],
    {
      D,
      save: () => {},
      uid: (() => { let n = 0; return () => 'uid_' + (n++); })(),
      openModal: () => {},
      closeModal: () => {},
      toast: () => {},
      escapeHtml: (s) => s,
      fmtFull: (n) => 'Rp ' + n,
      scanErrorMessage: (err) => (err && err.message) || 'error',
      // cobek-io.js mendefinisikan renderProductList() globalnya sendiri
      // (memanggil Etalase/PriceRekoWidget/StockRekoWidget) — stub
      // dependency-nya di sini (bukan renderProductList itu sendiri, biar
      // tidak tertimpa function declaration di cobek-io.js).
      Etalase: { renderList: () => {}, renderKategoriList: () => {}, renderModalStat: () => {} },
      PriceRekoWidget: { render: () => {} },
      StockRekoWidget: { render: () => {} },
    },
    ['ShopDataIO', 'ImportKatalog', 'ShopScanUI', '_shopScanRows'],
  );
}

// --- Mapping row target Harga Beli/Harga Jual -> ShopDataIO.commitShopRows() ---
// Mensimulasikan alur ShopScanUI.commit(): baris hasil parseText() (via OCR)
// dipetakan {nama, kategori, hargaBeli|hargaJual} tergantung target yang
// dipilih user, lalu dipipa ke ShopDataIO.commitShopRows() yang SAMA dgn
// Import CSV/PDF (0 logic commit baru).

test('commit rows dgn target "beli" (default) -> mengisi hargaBeli, TIDAK mengisi hargaJual', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx._shopScanRows.push({ nama: 'Lumpang 10cm', kategori: 'Lumpang', harga: 20000, included: true });
  ctx.ShopScanUI.setTarget('beli');
  ctx.ShopScanUI.commit();
  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.name, 'Lumpang 10cm');
  assert.equal(p.hargaBeli, 20000);
  assert.equal(p.hargaJual, 0);
});

test('commit rows dgn target "jual" -> mengisi hargaJual, TIDAK mengisi hargaBeli', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx._shopScanRows.push({ nama: 'Cobek 13cm', kategori: 'COBEK', harga: 45000, included: true });
  ctx.ShopScanUI.setTarget('jual');
  ctx.ShopScanUI.commit();
  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.name, 'Cobek 13cm');
  assert.equal(p.hargaJual, 45000);
  assert.equal(p.hargaBeli, 0);
});

test('commit -- baris yang tidak dicentang (included:false) diabaikan', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx._shopScanRows.push({ nama: 'Produk Dicentang', harga: 10000, included: true });
  ctx._shopScanRows.push({ nama: 'Produk Tidak Dicentang', harga: 20000, included: false });
  ctx.ShopScanUI.setTarget('beli');
  ctx.ShopScanUI.commit();
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].name, 'Produk Dicentang');
});

test('commit -- baris tanpa nama diabaikan meski included:true', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx._shopScanRows.push({ nama: '', harga: 10000, included: true });
  ctx.ShopScanUI.setTarget('beli');
  ctx.ShopScanUI.commit();
  assert.equal(D.products.length, 0);
});

test('commit -- tidak ada baris tercentang sama sekali -> D.products tetap kosong', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.ShopScanUI.setTarget('beli');
  ctx.ShopScanUI.commit();
  assert.equal(D.products.length, 0);
});

test('integrasi: ImportKatalog.parseText() -> mapping target -> commitShopRows() end-to-end (simulasi hasil OCR)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const text = 'Lumpang\nLumpang 10cm+alu\tRp30.000\nLumpang 11-12cm+alu\tRp35.000';
  const parsed = ctx.ImportKatalog.parseText(text);
  parsed.forEach((r) => {
    ctx._shopScanRows.push({ nama: r.name, kategori: r.kategori, harga: r.price, included: true });
  });
  ctx.ShopScanUI.setTarget('beli');
  ctx.ShopScanUI.commit();
  assert.equal(D.products.length, 2);
  assert.equal(D.products.find((p) => p.name === 'Lumpang 10cm+alu').hargaBeli, 30000);
  assert.equal(D.products.find((p) => p.name === 'Lumpang 11-12cm+alu').hargaBeli, 35000);
  assert.ok(D.cobekKategori.find((c) => c.name === 'Lumpang'), 'kategori ikut dibuat via resolveShopKategori (reuse commitShopRows)');
});

test('update existing product by name (case-insensitive) -- konsisten pola commitShopRows() yang sama', () => {
  const D = makeD({
    products: [
      { id: 'p1', name: 'Lumpang 10cm', stock: 5, hargaBeli: 15000, hargaJual: 25000, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {}, satuan: '' },
    ],
  });
  const ctx = makeCtx(D);
  ctx._shopScanRows.push({ nama: 'lumpang 10cm', harga: 18000, included: true });
  ctx.ShopScanUI.setTarget('beli');
  ctx.ShopScanUI.commit();
  assert.equal(D.products.length, 1, 'tidak bikin produk dobel, harus match-by-name case-insensitive');
  assert.equal(D.products[0].hargaBeli, 18000);
  assert.equal(D.products[0].hargaJual, 25000, 'field yang tidak dikirim (hargaJual) tidak ikut ditimpa');
});
