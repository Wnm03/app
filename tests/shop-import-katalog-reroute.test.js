'use strict';
// tests/shop-import-katalog-reroute.test.js — lanjutan opsional (BUKAN
// bagian DESIGN_torsi-vehicle-selector_shop-import-export-2.md, item ini
// sudah SELESAI 4/4 — lihat docs/NEXT_SESSION.md § Sesi 9): reroute
// `ImportKatalog.commit()` (Paste, cobek-io.js) ke
// `ShopDataIO.commitShopRows()` (shop-data-io-api.js, §B.4).
//
// RULE yang dites di sini:
//   - ImportKatalog.commit() TIDAK LAGI punya logic match-by-name/create/
//     update sendiri — 100% delegasi ke ShopDataIO.commitShopRows().
//   - Perilaku target toggle TIDAK BERUBAH: hargaJual SELALU diisi dari
//     it.price; target 'reseller' TAMBAH mengisi hargaReseller; target
//     'beli' TAMBAH mengisi hargaBeli (field-field ini dipetakan ke rows
//     opsional yang dikirim ke commitShopRows()).
//   - commitShopRows() sendiri (match-by-name/create/update/kategori) SUDAH
//     dites lengkap di tests/shop-data-io-csv-import.test.js — TIDAK
//     diulang di sini, fokus HANYA pada mapping target ImportKatalog.

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
    ['modules/shop/cobek-tx-cart.js', 'modules/business/shop-data-io-api.js', 'modules/shop/cobek-io.js'],
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
      Etalase: { renderList: () => {}, renderKategoriList: () => {}, renderModalStat: () => {} },
      PriceRekoWidget: { render: () => {} },
      StockRekoWidget: { render: () => {} },
    },
    ['ShopDataIO', 'ImportKatalog'],
  );
}

test('ImportKatalog.commit() target reseller — produk baru: hargaJual & hargaReseller keduanya terisi', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.ImportKatalog.target = 'reseller';
  ctx.ImportKatalog.parsed = [{ name: 'Lumpang 10cm', price: 30000, kategori: 'Lumpang' }];
  ctx.ImportKatalog.commit();
  assert.equal(D.products.length, 1);
  const p = D.products[0];
  assert.equal(p.hargaJual, 30000);
  assert.equal(p.hargaReseller, 30000);
  assert.equal(p.hargaBeli, 0);
});

test('ImportKatalog.commit() target beli — produk baru: hargaJual & hargaBeli keduanya terisi, hargaReseller null', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.ImportKatalog.target = 'beli';
  ctx.ImportKatalog.parsed = [{ name: 'Cobek 13cm', price: 20000, kategori: '' }];
  ctx.ImportKatalog.commit();
  const p = D.products[0];
  assert.equal(p.hargaJual, 20000);
  assert.equal(p.hargaBeli, 20000);
  assert.equal(p.hargaReseller, null);
});

test('ImportKatalog.commit() target jual — produk baru: HANYA hargaJual terisi', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.ImportKatalog.target = 'jual';
  ctx.ImportKatalog.parsed = [{ name: 'Lumpang 12cm', price: 40000, kategori: '' }];
  ctx.ImportKatalog.commit();
  const p = D.products[0];
  assert.equal(p.hargaJual, 40000);
  assert.equal(p.hargaBeli, 0);
  assert.equal(p.hargaReseller, null);
});

test('ImportKatalog.commit() target reseller — produk existing: hargaJual & hargaReseller di-update, hargaBeli lama TIDAK ditimpa', () => {
  const D = makeD({
    products: [{ id: 'prod_1', name: 'Lumpang 10cm', stock: 5, hargaBeli: 15000, hargaJual: 25000, hargaReseller: 22000, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {}, satuan: '' }],
  });
  const ctx = makeCtx(D);
  ctx.ImportKatalog.target = 'reseller';
  ctx.ImportKatalog.parsed = [{ name: 'lumpang 10cm', price: 32000, kategori: '' }];
  ctx.ImportKatalog.commit();
  const p = D.products[0];
  assert.equal(p.hargaJual, 32000);
  assert.equal(p.hargaReseller, 32000);
  assert.equal(p.hargaBeli, 15000, 'hargaBeli lama tidak ditimpa krn target bukan beli');
});

test('ImportKatalog.commit() — kategori teks ikut di-resolve via resolveShopKategori() (lewat commitShopRows)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.ImportKatalog.target = 'reseller';
  ctx.ImportKatalog.parsed = [{ name: 'Lumpang 10cm', price: 30000, kategori: 'Lumpang' }];
  ctx.ImportKatalog.commit();
  const p = D.products[0];
  assert.ok(D.cobekKategori.find((c) => c.name === 'Lumpang'));
  assert.equal(p.kategoriId, D.cobekKategori.find((c) => c.name === 'Lumpang').id);
});

test('ImportKatalog.commit() — parsed kosong: toast peringatan, D.products tidak disentuh', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.ImportKatalog.parsed = [];
  ctx.ImportKatalog.commit();
  assert.equal(D.products.length, 0);
});

test('integrasi: banyak baris sekaligus, target beli — semua produk baru dapat hargaBeli+hargaJual sama', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.ImportKatalog.target = 'beli';
  ctx.ImportKatalog.parsed = [
    { name: 'Lumpang 10cm', price: 20000, kategori: 'Lumpang' },
    { name: 'Cobek 13cm', price: 15000, kategori: 'Cobek' },
  ];
  ctx.ImportKatalog.commit();
  assert.equal(D.products.length, 2);
  D.products.forEach((p) => {
    assert.equal(p.hargaBeli, p.hargaJual);
  });
});
