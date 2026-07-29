'use strict';
// tests/shop-pdf-import.test.js — cakupan Bagian B (Shop Import/Export:
// Scan/PDF/CSV/JSON), §B.3.2 Import PDF, Sesi N+7 (setelah Sesi N+6
// commitShopRows()+Import CSV) di
// DESIGN_torsi-vehicle-selector_shop-import-export-2.md.
//
// Sesi ini TIDAK menambah engine baca-PDF/parser/commit baru — 100% reuse:
//   - Baca PDF: VehicleCatalogImport.extractPdfText() (Tahap 5, sudah dites
//     di tests/vehicle-catalog-import.test.js) — TIDAK dites ulang di sini.
//   - Parse baris: ImportKatalog.parseText(text), wrapper baru TIPIS di
//     atas ImportKatalog._parse() yang SUDAH ADA & sudah teruji via
//     preview() (importKatalogModal) — dites di sini supaya kontraknya
//     (identik dgn _parse(), dipakai bareng paste manual & PDF) terjaga.
//   - Commit: ShopDataIO.commitShopRows() (Sesi N+6, sudah dites lengkap di
//     tests/shop-data-io-csv-import.test.js) — di sini HANYA dites lewat
//     mapping target Harga Beli/Harga Jual yang jadi kontribusi baru sesi
//     ini (shop-pdf-import-ui.js, lapisan UI/DOM SENGAJA tidak dites
//     langsung di sini, pola sama vehicle-catalog-import-ui.js/honda-pdf-
//     import-ui.js yang juga tidak ada test file terpisah).

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
    ['modules/shop/cobek-tx-cart.js', 'modules/business/shop-data-io-api.js', 'modules/shop/cobek-io.js', 'modules/business/shop-pdf-import-ui.js'],
    {
      D,
      save: () => {},
      uid: (() => { let n = 0; return () => 'uid_' + (n++); })(),
      openModal: () => {},
      closeModal: () => {},
      toast: () => {},
      escapeHtml: (s) => s,
      fmtFull: (n) => 'Rp ' + n,
      // cobek-io.js mendefinisikan renderProductList() globalnya sendiri
      // (memanggil Etalase/PriceRekoWidget/StockRekoWidget) — stub
      // dependency-nya di sini (bukan renderProductList itu sendiri, biar
      // tidak tertimpa function declaration di cobek-io.js).
      Etalase: { renderList: () => {}, renderKategoriList: () => {}, renderModalStat: () => {} },
      PriceRekoWidget: { render: () => {} },
      StockRekoWidget: { render: () => {} },
    },
    ['ShopDataIO', 'ImportKatalog', 'ShopPdfImportUI', '_shopPdfImportRows'],
  );
}

// --- ImportKatalog.parseText() — kontrak reuse _parse() ---

test('ImportKatalog.parseText() — format "Nama Rp30.000" & "Nama 60rb" kebaca sama seperti _parse()', () => {
  const ctx = makeCtx(makeD());
  const text = 'Lumpang\nLumpang 10cm+alu\tRp30.000\nLumpang 11-12cm+alu\tRp35.000\n\nCOBEK\ncobek 13-14cm+muntu 60rb';
  const viaParseText = ctx.ImportKatalog.parseText(text);
  const viaParseInternal = ctx.ImportKatalog._parse(text);
  assert.equal(JSON.stringify(viaParseText), JSON.stringify(viaParseInternal), 'parseText() harus identik dgn _parse() — 1 sumber kebenaran');
  assert.equal(viaParseText.length, 3);
  assert.equal(viaParseText[0].name, 'Lumpang 10cm+alu');
  assert.equal(viaParseText[0].price, 30000);
  assert.equal(viaParseText[0].kategori, 'Lumpang');
  assert.equal(viaParseText[2].name, 'cobek 13-14cm+muntu');
  assert.equal(viaParseText[2].price, 60000);
  assert.equal(viaParseText[2].kategori, 'COBEK');
});

test('ImportKatalog.parseText() — baris tanpa harga di ujung dianggap kategori, bukan produk', () => {
  const ctx = makeCtx(makeD());
  const text = 'Kategori Tanpa Harga\nProduk A\tRp10.000';
  const rows = ctx.ImportKatalog.parseText(text);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Produk A');
  assert.equal(rows[0].kategori, 'Kategori Tanpa Harga');
});

test('ImportKatalog.parseText() — teks kosong -> array kosong', () => {
  const ctx = makeCtx(makeD());
  assert.equal(ctx.ImportKatalog.parseText('').length, 0);
  assert.equal(ctx.ImportKatalog.parseText(undefined).length, 0);
});

// --- Mapping row target Harga Beli/Harga Jual -> ShopDataIO.commitShopRows() ---
// Mensimulasikan alur ShopPdfImportUI.commit(): baris hasil parseText()
// dipetakan {nama, kategori, hargaBeli|hargaJual} tergantung target yang
// dipilih user, lalu dipipa ke ShopDataIO.commitShopRows() yang SAMA dgn
// Import CSV (0 logic commit baru).

test('commit rows dgn target "beli" (default) -> mengisi hargaBeli, TIDAK mengisi hargaJual', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // set state internal sesuai hasil parseText() (mensimulasikan onFileChange()
  // tanpa perlu jalankan pipeline PDF/DOM sungguhan)
  ctx._shopPdfImportRows.push({ nama: 'Lumpang 10cm', kategori: 'Lumpang', harga: 20000, sourceFile: 'katalog.pdf', included: true });
  ctx.ShopPdfImportUI.setTarget('beli');
  ctx.ShopPdfImportUI.commit();
  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.name, 'Lumpang 10cm');
  assert.equal(p.hargaBeli, 20000);
  assert.equal(p.hargaJual, 0);
});

test('commit rows dgn target "jual" -> mengisi hargaJual, TIDAK mengisi hargaBeli', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx._shopPdfImportRows.push({ nama: 'Cobek 13cm', kategori: 'COBEK', harga: 45000, sourceFile: 'katalog.pdf', included: true });
  ctx.ShopPdfImportUI.setTarget('jual');
  ctx.ShopPdfImportUI.commit();
  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.name, 'Cobek 13cm');
  assert.equal(p.hargaJual, 45000);
  assert.equal(p.hargaBeli, 0);
});

test('commit -- baris yang tidak dicentang (included:false) diabaikan', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx._shopPdfImportRows.push({ nama: 'Produk Dicentang', harga: 10000, included: true });
  ctx._shopPdfImportRows.push({ nama: 'Produk Tidak Dicentang', harga: 20000, included: false });
  ctx.ShopPdfImportUI.setTarget('beli');
  ctx.ShopPdfImportUI.commit();
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].name, 'Produk Dicentang');
});

test('integrasi: parseText() -> mapping target -> commitShopRows() end-to-end', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const text = 'Lumpang\nLumpang 10cm+alu\tRp30.000\nLumpang 11-12cm+alu\tRp35.000';
  const parsed = ctx.ImportKatalog.parseText(text);
  parsed.forEach((r) => {
    ctx._shopPdfImportRows.push({ nama: r.name, kategori: r.kategori, harga: r.price, included: true });
  });
  ctx.ShopPdfImportUI.setTarget('beli');
  ctx.ShopPdfImportUI.commit();
  assert.equal(D.products.length, 2);
  assert.equal(D.products.find((p) => p.name === 'Lumpang 10cm+alu').hargaBeli, 30000);
  assert.equal(D.products.find((p) => p.name === 'Lumpang 11-12cm+alu').hargaBeli, 35000);
  assert.ok(D.cobekKategori.find((c) => c.name === 'Lumpang'), 'kategori ikut dibuat via resolveShopKategori (reuse commitShopRows)');
});
