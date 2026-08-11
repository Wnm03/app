'use strict';
// tests/shop-data-io-csv-import.test.js — cakupan Bagian B (Shop Import/
// Export: Scan/PDF/CSV/JSON), item pertama & paling ringan sesuai urutan
// implementasi disarankan di
// DESIGN_torsi-vehicle-selector_shop-import-export-2.md: `commitShopRows()`
// + Import CSV (§B.3.3, §B.4).
//
// RULE yang dites di sini:
//   - parseShopCSV() baca header apa adanya (urutan kolom bebas, dicocokkan
//     lewat nama header), kolom "nama" wajib ada, baris tanpa nama diskip.
//   - commitShopRows() match produk existing by name (case-insensitive):
//     ada -> update PARTIAL (field yang tidak dikirim TIDAK ditimpa), belum
//     ada -> buat baru dengan shape objek produk yang sama dipakai di
//     seluruh Shop (id/name/stock/hargaBeli/hargaJual/hargaReseller/
//     diskonPersen/kategoriId/produsenId/hargaByProdusen/satuan).
//   - kategori teks di-resolve lewat resolveShopKategori() yang SUDAH ADA
//     (cobek-tx-cart.js) -- 100% reuse, tidak duplikasi logic kategori.

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
    ['modules/shop/cobek-tx-cart.js', 'modules/business/shop-data-io-api.js'],
    {
      D,
      save: () => {},
      uid: (() => { let n = 0; return () => 'uid_' + (n++); })(),
      openModal: () => {},
      closeModal: () => {},
      toast: () => {},
      escapeHtml: (s) => s,
      fmtFull: (n) => 'Rp ' + n,
      renderProductList: () => {},
    },
    ['ShopDataIO', 'ShopCsvImport'],
  );
}

test('parseShopCSV() — header lengkap, urutan kolom sesuai spesifikasi', () => {
  const ctx = makeCtx(makeD());
  const csv = 'nama,kategori,harga_beli,harga_jual,stok,satuan\nLumpang 10cm,Lumpang,20000,30000,5,pcs\nCobek 13cm,COBEK,15000,25000,3,pcs';
  const rows = ctx.ShopDataIO.parseShopCSV(csv);
  assert.equal(rows.length, 2);
  assert.equal(JSON.stringify(rows[0]), JSON.stringify({ nama: 'Lumpang 10cm', kategori: 'Lumpang', hargaBeli: 20000, hargaJual: 30000, stok: 5, satuan: 'pcs', berat: 0, catatan: '' }));
  assert.equal(rows[1].nama, 'Cobek 13cm');
});

test('parseShopCSV() — urutan kolom header dibalik, tetap kebaca benar (dicocokkan by nama header)', () => {
  const ctx = makeCtx(makeD());
  const csv = 'satuan,stok,harga_jual,harga_beli,kategori,nama\npcs,5,30000,20000,Lumpang,Lumpang 10cm';
  const rows = ctx.ShopDataIO.parseShopCSV(csv);
  assert.equal(rows.length, 1);
  assert.equal(JSON.stringify(rows[0]), JSON.stringify({ nama: 'Lumpang 10cm', kategori: 'Lumpang', hargaBeli: 20000, hargaJual: 30000, stok: 5, satuan: 'pcs', berat: 0, catatan: '' }));
});

test('parseShopCSV() — kolom "nama" tidak ada di header -> kosong (dianggap tidak valid)', () => {
  const ctx = makeCtx(makeD());
  const csv = 'kategori,harga_jual\nLumpang,30000';
  assert.equal(ctx.ShopDataIO.parseShopCSV(csv).length, 0);
});

test('parseShopCSV() — baris tanpa nama diskip, tidak bikin entry kosong', () => {
  const ctx = makeCtx(makeD());
  const csv = 'nama,harga_jual\nLumpang 10cm,30000\n,50000\nCobek 13cm,25000';
  const rows = ctx.ShopDataIO.parseShopCSV(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].nama, 'Lumpang 10cm');
  assert.equal(rows[1].nama, 'Cobek 13cm');
});

test('parseShopCSV() — teks kosong / hanya header -> array kosong', () => {
  const ctx = makeCtx(makeD());
  assert.equal(ctx.ShopDataIO.parseShopCSV('').length, 0);
  assert.equal(ctx.ShopDataIO.parseShopCSV('nama,harga_jual').length, 0);
});

test('parseShopCSV() — harga dengan format "Rp30.000" ikut kebaca sbg angka murni', () => {
  const ctx = makeCtx(makeD());
  const csv = 'nama,harga_jual\nLumpang 10cm,"Rp30.000"';
  const rows = ctx.ShopDataIO.parseShopCSV(csv);
  assert.equal(rows[0].hargaJual, 30000);
});

// --- Sesi 386: kolom berat_kg/catatan (audit CSV import katalog batu Merapi) ---

test('parseShopCSV() — kolom berat_kg & catatan kebaca', () => {
  const ctx = makeCtx(makeD());
  const csv = 'nama,kategori,harga_beli,harga_jual,stok,satuan,berat_kg,catatan\nCobek 17cm,Cobek,13000,43000,0,pcs,1.6,harga sesuai aturan Cobek disepakati (master)';
  const rows = ctx.ShopDataIO.parseShopCSV(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].berat, 1.6);
  assert.equal(rows[0].catatan, 'harga sesuai aturan Cobek disepakati (master)');
});

test('parseShopCSV() — field catatan berkutip berisi KOMA literal tetap kebaca utuh (bug nyata katalog-batu-merapi)', () => {
  const ctx = makeCtx(makeD());
  const csv = 'nama,kategori,harga_beli,harga_jual,stok,satuan,berat_kg,catatan\nCobek 31cm,Cobek,,,0,pcs,20.4,">30cm: harga sengaja kosong (belum ditetapkan, sesuai master)"';
  const rows = ctx.ShopDataIO.parseShopCSV(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nama, 'Cobek 31cm');
  assert.equal(rows[0].berat, 20.4);
  assert.equal(rows[0].hargaBeli, 0);
  assert.equal(rows[0].catatan, '>30cm: harga sengaja kosong (belum ditetapkan, sesuai master)');
});

test('parseShopCSV() — kolom berat_kg/catatan tidak ada di header -> default 0/"" (backward compatible dgn CSV lama)', () => {
  const ctx = makeCtx(makeD());
  const csv = 'nama,harga_jual\nLumpang 10cm,30000';
  const rows = ctx.ShopDataIO.parseShopCSV(csv);
  assert.equal(rows[0].berat, 0);
  assert.equal(rows[0].catatan, '');
});

test('commitShopRows() — produk baru: berat_kg -> beratPerUnit, catatan -> product.catatan', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const res = ctx.ShopDataIO.commitShopRows([
    { nama: 'Cobek 17cm', kategori: 'Cobek', hargaBeli: 13000, hargaJual: 43000, stok: 0, satuan: 'pcs', berat: 1.6, catatan: 'harga sesuai aturan Cobek disepakati (master)' },
  ]);
  assert.equal(res.created, 1);
  const p = D.products[0];
  assert.equal(p.beratPerUnit, 1.6);
  assert.equal(p.catatan, 'harga sesuai aturan Cobek disepakati (master)');
});

test('commitShopRows() — produk existing: berat/catatan ikut ter-update PARTIAL (field lain tidak ditimpa)', () => {
  const D = makeD({
    products: [{ id: 'prod_1', name: 'Cobek 15cm', stock: 0, hargaBeli: 9000, hargaJual: 0, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {}, satuan: 'pcs', beratPerUnit: 0, catatan: '' }],
  });
  const ctx = makeCtx(D);
  const res = ctx.ShopDataIO.commitShopRows([{ nama: 'Cobek 15cm', berat: 0.8, catatan: 'berat dari master' }]);
  assert.equal(res.updated, 1);
  const p = D.products[0];
  assert.equal(p.beratPerUnit, 0.8);
  assert.equal(p.catatan, 'berat dari master');
  assert.equal(p.hargaBeli, 9000, 'hargaBeli tidak ikut ditimpa krn tidak dikirim di row');
});

test('commitShopRows() — berat 0/tidak dikirim TIDAK menimpa beratPerUnit produk existing yang sudah terisi', () => {
  const D = makeD({
    products: [{ id: 'prod_1', name: 'Cobek 15cm', stock: 0, hargaBeli: 9000, hargaJual: 0, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {}, satuan: 'pcs', beratPerUnit: 0.8, catatan: '' }],
  });
  const ctx = makeCtx(D);
  ctx.ShopDataIO.commitShopRows([{ nama: 'Cobek 15cm', stok: 5 }]);
  assert.equal(D.products[0].beratPerUnit, 0.8, 'beratPerUnit lama tetap, tidak ke-nol-kan krn row tidak kirim berat');
});

test('commitShopRows() — produk baru: berat/catatan tidak dikirim -> default 0/"" (kompatibel row lama tanpa kolom ini)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.ShopDataIO.commitShopRows([{ nama: 'Lumpang 10cm', hargaJual: 30000, stok: 5 }]);
  assert.ok(!D.products[0].beratPerUnit);
  assert.ok(!D.products[0].catatan);
});

// --- integrasi end-to-end dgn CSV yang MIRIP katalog-batu-merapi-v2_3-lengkap.csv nyata ---
test('integrasi: CSV dgn berat_kg/catatan (termasuk catatan berkutip-koma) -> parse -> commit end-to-end', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const csv = [
    'nama,kategori,harga_beli,harga_jual,stok,satuan,berat_kg,catatan',
    'Cobek 14cm,Cobek,,,0,pcs,0.7,berat dari master; harga tetap dari katalog asli (master belum isi harga utk ukuran ini)',
    'Cobek 31cm,Cobek,,,0,pcs,20.4,">30cm: harga sengaja kosong (belum ditetapkan, sesuai master)"',
  ].join('\n');
  const rows = ctx.ShopDataIO.parseShopCSV(csv);
  assert.equal(rows.length, 2);
  const res = ctx.ShopDataIO.commitShopRows(rows);
  assert.equal(res.created, 2);
  const p31 = D.products.find((p) => p.name === 'Cobek 31cm');
  assert.equal(p31.beratPerUnit, 20.4);
  assert.equal(p31.catatan, '>30cm: harga sengaja kosong (belum ditetapkan, sesuai master)');
});

test('commitShopRows() — produk baru dibuat dgn shape sama persis produk Shop lain', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const res = ctx.ShopDataIO.commitShopRows([
    { nama: 'Lumpang 10cm', kategori: 'Lumpang', hargaBeli: 20000, hargaJual: 30000, stok: 5, satuan: 'pcs' },
  ]);
  assert.equal(res.ok, true);
  assert.equal(res.created, 1);
  assert.equal(res.updated, 0);
  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.name, 'Lumpang 10cm');
  assert.equal(p.stock, 5);
  assert.equal(p.hargaBeli, 20000);
  assert.equal(p.hargaJual, 30000);
  assert.equal(p.hargaReseller, null);
  assert.equal(p.diskonPersen, 0);
  assert.equal(p.produsenId, '');
  assert.equal(JSON.stringify(p.hargaByProdusen), '{}');
  assert.equal(p.satuan, 'pcs');
  assert.ok(D.cobekKategori.find((c) => c.name === 'Lumpang'), 'kategori baru ikut dibuat via resolveShopKategori');
  assert.equal(p.kategoriId, D.cobekKategori.find((c) => c.name === 'Lumpang').id);
});

test('commitShopRows() — produk existing (match by name, case-insensitive) di-update PARTIAL', () => {
  const D = makeD({
    products: [{ id: 'prod_1', name: 'Lumpang 10cm', stock: 2, hargaBeli: 15000, hargaJual: 25000, hargaReseller: 22000, diskonPersen: 5, kategoriId: '', produsenId: 'prd_1', hargaByProdusen: {}, satuan: 'pcs' }],
  });
  const ctx = makeCtx(D);
  const res = ctx.ShopDataIO.commitShopRows([{ nama: 'lumpang 10cm', stok: 10 }]);
  assert.equal(res.created, 0);
  assert.equal(res.updated, 1);
  const p = D.products[0];
  assert.equal(p.stock, 10, 'stok ikut ter-update');
  // Field yang TIDAK dikirim di row (hargaBeli/hargaJual/hargaReseller/
  // diskonPersen/produsenId) harus tetap seperti semula, tidak ditimpa.
  assert.equal(p.hargaBeli, 15000);
  assert.equal(p.hargaJual, 25000);
  assert.equal(p.hargaReseller, 22000);
  assert.equal(p.diskonPersen, 5);
  assert.equal(p.produsenId, 'prd_1');
});

test('commitShopRows() — baris tanpa nama diabaikan, tidak bikin produk kosong', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const res = ctx.ShopDataIO.commitShopRows([{ nama: '', hargaJual: 1000 }, { hargaJual: 2000 }]);
  assert.equal(res.created, 0);
  assert.equal(res.updated, 0);
  assert.equal(D.products.length, 0);
});

test('commitShopRows() — rows kosong/bukan array -> ok:false, tidak menyentuh D.products', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.ShopDataIO.commitShopRows([]).ok, false);
  assert.equal(ctx.ShopDataIO.commitShopRows(null).ok, false);
  assert.equal(D.products.length, 0);
});

test('commitShopRows() — banyak baris sekaligus, gabungan baru & update', () => {
  const D = makeD({
    products: [{ id: 'prod_1', name: 'Cobek 13cm', stock: 1, hargaBeli: 10000, hargaJual: 20000, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {}, satuan: '' }],
  });
  const ctx = makeCtx(D);
  const res = ctx.ShopDataIO.commitShopRows([
    { nama: 'Cobek 13cm', stok: 8 },
    { nama: 'Lumpang 11cm', hargaBeli: 18000, hargaJual: 28000, stok: 4, satuan: 'pcs' },
  ]);
  assert.equal(res.created, 1);
  assert.equal(res.updated, 1);
  assert.equal(D.products.length, 2);
  assert.equal(D.products.find((p) => p.name === 'Cobek 13cm').stock, 8);
  assert.equal(D.products.find((p) => p.name === 'Lumpang 11cm').hargaJual, 28000);
});

// --- Integrasi ringan end-to-end: CSV mentah -> parse -> commit ---
test('integrasi: parseShopCSV() -> commitShopRows() end-to-end', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const csv = 'nama,kategori,harga_beli,harga_jual,stok,satuan\nLumpang 10cm+alu,Lumpang,20000,30000,5,pcs\ncobek 13-14cm+muntu,COBEK,15000,25000,3,pcs';
  const rows = ctx.ShopDataIO.parseShopCSV(csv);
  const res = ctx.ShopDataIO.commitShopRows(rows);
  assert.equal(res.created, 2);
  assert.equal(D.products.length, 2);
});
