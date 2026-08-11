'use strict';
// tests/import-shop-excel-header-alias.test.js — cover HEADER_ALIAS/resolveAliasValue
// yang ditambahkan di ImportShopExcel._parse() (modules/shop/cobek-io.js). Fokus HANYA
// pada _parse()/headerError (logic murni, tidak baca/tulis DOM) -- lihat catatan di
// tests/helpers/loadSource.js soal kenapa _renderPreview() (DOM) TIDAK dites di sini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  const D = { products: [], produsen: [], cobekKategori: [] };
  return loadSource(
    ['modules/shop/cobek-io.js'],
    { D, save: () => {}, uid: () => 'uid_x', toast: () => {} },
    ['ImportShopExcel'],
  );
}

test('format CSV LAMA (header spasi: "Nama Produk"/"Harga Beli"/"Harga Jual") tetap PASS', () => {
  const ctx = makeCtx();
  const rows = [
    { 'Nama Produk': 'Cobek 15cm', Kategori: 'Cobek', Produsen: '', Stok: 10, 'Harga Beli': 9000, 'Harga Jual': 15000, 'Harga Reseller': '', 'Diskon %': 0 },
  ];
  ctx.ImportShopExcel.target = 'etalase';
  ctx.ImportShopExcel._parse(rows);
  assert.equal(ctx.ImportShopExcel.parsedRows.length, 1);
  const r = ctx.ImportShopExcel.parsedRows[0];
  assert.equal(r.name, 'Cobek 15cm');
  assert.equal(r.hargaBeli, 9000);
  assert.equal(r.hargaJual, 15000);
  assert.equal(r.stock, 10);
  assert.equal(ctx.ImportShopExcel.headerError, '');
});

test('format Batu Merapi (header "Nama"/"Harga_Beli"/"Harga_Jual"/underscore) PASS via alias', () => {
  const ctx = makeCtx();
  const rows = [
    { SKU: 'CB015', Nama: 'Cobek Batu Merapi 15 cm', Kategori: 'Cobek', Harga_Beli: 9000, Harga_Jual: '', Stok: 0, Material: 'Batu Merapi' },
    { SKU: 'MT001', Nama: 'Muntu', Kategori: 'Muntu', Harga_Beli: 4000, Harga_Jual: 8000, Stok: 0 },
  ];
  ctx.ImportShopExcel.target = 'etalase';
  ctx.ImportShopExcel._parse(rows);
  assert.equal(ctx.ImportShopExcel.parsedRows.length, 2, 'kedua baris harus lolos (dulu 0/67 di app asli sebelum patch ini)');
  const [cobek, muntu] = ctx.ImportShopExcel.parsedRows;
  assert.equal(cobek.name, 'Cobek Batu Merapi 15 cm');
  assert.equal(cobek.hargaBeli, 9000);
  assert.equal(cobek.hargaJual, 0, 'Harga_Jual kosong -> Number("")||0, business logic lama tidak diubah');
  assert.equal(muntu.name, 'Muntu');
  assert.equal(muntu.hargaBeli, 4000);
  assert.equal(muntu.hargaJual, 8000);
  assert.equal(ctx.ImportShopExcel.headerError, '');
});

test('header CAMPURAN (sebagian kolom pakai nama lama, sebagian alias baru) PASS', () => {
  const ctx = makeCtx();
  const rows = [
    { 'Nama Produk': 'Lumpang 17cm', Kategori: 'Lumpang', Harga_Beli: 12000, 'Harga Jual': 20000, Stock: 5 },
  ];
  ctx.ImportShopExcel.target = 'etalase';
  ctx.ImportShopExcel._parse(rows);
  assert.equal(ctx.ImportShopExcel.parsedRows.length, 1);
  const r = ctx.ImportShopExcel.parsedRows[0];
  assert.equal(r.name, 'Lumpang 17cm', 'nama dari kolom lama "Nama Produk"');
  assert.equal(r.hargaBeli, 12000, 'harga beli dari alias "Harga_Beli"');
  assert.equal(r.hargaJual, 20000, 'harga jual dari kolom lama "Harga Jual"');
  assert.equal(r.stock, 5, 'stok dari alias "Stock"');
});

test('header TIDAK DIKENAL sama sekali (tidak ada satu pun alias nama produk) -> headerError jelas, parsedRows kosong', () => {
  const ctx = makeCtx();
  const rows = [
    { Item: 'Cobek 15cm', Price: 15000 },
  ];
  ctx.ImportShopExcel.target = 'etalase';
  ctx.ImportShopExcel._parse(rows);
  assert.equal(ctx.ImportShopExcel.parsedRows.length, 0);
  assert.ok(ctx.ImportShopExcel.headerError.length > 0, 'headerError harus terisi, bukan string kosong');
  assert.match(ctx.ImportShopExcel.headerError, /Nama Produk/);
  assert.match(ctx.ImportShopExcel.headerError, /Item, Price/, 'pesan error harus sebut kolom apa yg benar2 kebaca di file');
});

test('kolom nama ADA tapi datanya kebetulan kosong semua -> headerError TETAP kosong (bukan "header tidak dikenal")', () => {
  const ctx = makeCtx();
  const rows = [
    { 'Nama Produk': '', Kategori: 'Cobek', Stok: 0 },
  ];
  ctx.ImportShopExcel.target = 'etalase';
  ctx.ImportShopExcel._parse(rows);
  assert.equal(ctx.ImportShopExcel.parsedRows.length, 0);
  assert.equal(ctx.ImportShopExcel.headerError, '', 'kolom "Nama Produk" ada di header, cuma isinya kosong -- beda kasus dgn kolom tidak ada sama sekali');
});

test('target produsen, format lama ("Nama Produsen") tetap PASS tanpa regresi', () => {
  const ctx = makeCtx();
  const rows = [
    { 'Nama Produsen': 'CV Merapi Jaya', Kontak: '0812xxxx', Catatan: '', 'Jarak (km)': 12, 'Biaya/km': 2000 },
  ];
  ctx.ImportShopExcel.target = 'produsen';
  ctx.ImportShopExcel._parse(rows);
  assert.equal(ctx.ImportShopExcel.parsedRows.length, 1);
  assert.equal(ctx.ImportShopExcel.parsedRows[0].name, 'CV Merapi Jaya');
  assert.equal(ctx.ImportShopExcel.parsedRows[0].jarakKm, 12);
});

test('produk existing (match by name, case-insensitive di commit) tetap ter-update via kolom alias -- format data hasil parse tidak berubah', () => {
  const ctx = makeCtx();
  const rows = [
    { Nama: 'Cobek 15cm', Kategori: 'Cobek', Harga_Beli: 9500, Harga_Jual: 16000, Stok: 3 },
  ];
  ctx.ImportShopExcel.target = 'etalase';
  ctx.ImportShopExcel._parse(rows);
  const r = ctx.ImportShopExcel.parsedRows[0];
  // shape hasil parse harus PERSIS sama seperti sebelum patch: name/kategori/produsen/stock/hargaBeli/hargaJual/hargaReseller/diskonPersen
  assert.deepEqual(Object.keys(r).sort(), ['diskonPersen', 'hargaBeli', 'hargaJual', 'hargaReseller', 'kategori', 'name', 'produsen', 'stock'].sort());
});
