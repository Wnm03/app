'use strict';
// tests/shop-data-io-json-import.test.js — cakupan Bagian B (Shop Import/
// Export: Scan/PDF/CSV/JSON), item TERAKHIR §B.3.4
// (DESIGN_torsi-vehicle-selector_shop-import-export-2.md): Import/Export
// JSON Shop-only.
//
// RULE yang dites di sini:
//   - exportShopJSON() -> {products, produsen, version, exportedAt},
//     passthrough D.products/D.produsen apa adanya (subset backup-restore.js
//     yang sudah ada).
//   - validateShopJSON() -> shape check sebelum overwrite apa pun.
//   - importShopJSON(imp,'gabung') -> match by nama (case-insensitive),
//     produk existing di-update PARTIAL (field undefined di sumber TIDAK
//     menimpa), produk baru dibuat lengkap; produsen baru ditambah
//     (existing TIDAK di-update).
//   - importShopJSON(imp,'timpa') -> replace total D.products/D.produsen.

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

function makeCtx(D) {
  return loadSource(
    ['modules/shop/cobek-tx-cart.js', 'modules/business/shop-data-io-api.js'],
    {
      D,
      SCHEMA_VERSION: 4,
      save: () => {},
      uid: (() => { let n = 0; return () => 'uid_' + (n++); })(),
      openModal: () => {},
      closeModal: () => {},
      toast: () => {},
      escapeHtml: (s) => s,
      fmtFull: (n) => 'Rp ' + n,
      renderProductList: () => {},
      askConfirm: async () => true,
      Blob: class Blob { constructor(parts, opts) { this.parts = parts; this.type = opts && opts.type; } },
      URL: { createObjectURL: () => 'blob:stub' },
    },
    ['ShopDataIO', 'ShopJsonIO'],
  );
}

test('exportShopJSON() — passthrough products/produsen apa adanya + version + exportedAt', () => {
  const D = makeD({
    products: [{ id: 'prod_1', name: 'Lumpang 10cm', stock: 5 }],
    produsen: [{ id: 'prd_1', name: 'UD Batu Alam' }],
  });
  const ctx = makeCtx(D);
  const payload = ctx.ShopDataIO.exportShopJSON();
  assert.equal(payload.products, D.products);
  assert.equal(payload.produsen, D.produsen);
  assert.equal(payload.version, 4);
  assert.ok(payload.exportedAt);
});

test('validateShopJSON() — file bukan objek -> ok:false', () => {
  const ctx = makeCtx(makeD());
  assert.equal(ctx.ShopDataIO.validateShopJSON(null).ok, false);
  assert.equal(ctx.ShopDataIO.validateShopJSON('string').ok, false);
});

test('validateShopJSON() — objek tanpa products/produsen -> ok:false', () => {
  const ctx = makeCtx(makeD());
  assert.equal(ctx.ShopDataIO.validateShopJSON({ foo: 1 }).ok, false);
});

test('validateShopJSON() — products/produsen bukan array -> ok:false', () => {
  const ctx = makeCtx(makeD());
  assert.equal(ctx.ShopDataIO.validateShopJSON({ products: 'x' }).ok, false);
  assert.equal(ctx.ShopDataIO.validateShopJSON({ produsen: 'x' }).ok, false);
});

test('validateShopJSON() — shape valid (products dan/atau produsen array) -> ok:true', () => {
  const ctx = makeCtx(makeD());
  assert.equal(ctx.ShopDataIO.validateShopJSON({ products: [] }).ok, true);
  assert.equal(ctx.ShopDataIO.validateShopJSON({ produsen: [] }).ok, true);
});

test('importShopJSON() gabung — produk baru dibuat lengkap', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const res = ctx.ShopDataIO.importShopJSON({
    products: [{ name: 'Lumpang 10cm', hargaBeli: 20000, hargaJual: 30000, stock: 5, kategoriId: 'kat_1', satuan: 'pcs' }],
    produsen: [],
  }, 'gabung');
  assert.equal(res.ok, true);
  assert.equal(res.created, 1);
  assert.equal(res.updated, 0);
  const p = D.products[0];
  assert.equal(p.name, 'Lumpang 10cm');
  assert.equal(p.hargaBeli, 20000);
  assert.equal(p.kategoriId, 'kat_1');
  assert.equal(p.satuan, 'pcs');
});

test('importShopJSON() gabung — produk existing di-update PARTIAL (field undefined tidak menimpa)', () => {
  const D = makeD({
    products: [{ id: 'prod_1', name: 'Lumpang 10cm', stock: 2, hargaBeli: 15000, hargaJual: 25000, hargaReseller: 22000, diskonPersen: 5, kategoriId: '', produsenId: 'prd_1', hargaByProdusen: {}, satuan: 'pcs' }],
  });
  const ctx = makeCtx(D);
  const res = ctx.ShopDataIO.importShopJSON({ products: [{ name: 'lumpang 10cm', stock: 10 }] }, 'gabung');
  assert.equal(res.created, 0);
  assert.equal(res.updated, 1);
  const p = D.products[0];
  assert.equal(p.stock, 10);
  assert.equal(p.hargaBeli, 15000, 'field yang tidak dikirim tetap seperti semula');
  assert.equal(p.produsenId, 'prd_1');
});

test('importShopJSON() gabung — produsen baru ditambah, produsen existing TIDAK di-update', () => {
  const D = makeD({
    produsen: [{ id: 'prd_1', name: 'UD Batu Alam', contact: '0812', note: 'lama' }],
  });
  const ctx = makeCtx(D);
  const res = ctx.ShopDataIO.importShopJSON({
    products: [],
    produsen: [
      { name: 'UD Batu Alam', contact: '0899', note: 'baru' },
      { name: 'CV Sumber Rejeki', contact: '0877' },
    ],
  }, 'gabung');
  assert.equal(res.produsenCreated, 1);
  assert.equal(D.produsen.length, 2);
  const existing = D.produsen.find((p) => p.name === 'UD Batu Alam');
  assert.equal(existing.contact, '0812', 'produsen existing tidak ikut di-update');
  const created = D.produsen.find((p) => p.name === 'CV Sumber Rejeki');
  assert.ok(created);
  assert.equal(created.contact, '0877');
});

test('importShopJSON() timpa — replace total D.products/D.produsen', () => {
  const D = makeD({
    products: [{ id: 'prod_old', name: 'Produk Lama', stock: 1 }],
    produsen: [{ id: 'prd_old', name: 'Produsen Lama' }],
  });
  const ctx = makeCtx(D);
  const res = ctx.ShopDataIO.importShopJSON({
    products: [{ name: 'Produk Baru', stock: 3 }],
    produsen: [],
  }, 'timpa');
  assert.equal(res.ok, true);
  assert.equal(res.mode, 'timpa');
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].name, 'Produk Baru');
  assert.equal(D.produsen.length, 0);
});

test('importShopJSON() — shape invalid -> ok:false, D tidak disentuh', () => {
  const D = makeD({ products: [{ id: 'prod_1', name: 'Tetap' }] });
  const ctx = makeCtx(D);
  const res = ctx.ShopDataIO.importShopJSON({ foo: 1 }, 'gabung');
  assert.equal(res.ok, false);
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].name, 'Tetap');
});

// --- Integrasi ringan end-to-end: export -> import gabung ke D kosong ---
test('integrasi: exportShopJSON() -> importShopJSON() gabung round-trip', () => {
  const D1 = makeD({
    products: [{ id: 'prod_1', name: 'Lumpang 10cm', stock: 5, hargaBeli: 20000, hargaJual: 30000, hargaReseller: null, diskonPersen: 0, kategoriId: '', produsenId: '', hargaByProdusen: {}, satuan: 'pcs' }],
    produsen: [{ id: 'prd_1', name: 'UD Batu Alam', contact: '', note: '' }],
  });
  const ctx1 = makeCtx(D1);
  const payload = ctx1.ShopDataIO.exportShopJSON();
  const json = JSON.parse(JSON.stringify(payload));

  const D2 = makeD();
  const ctx2 = makeCtx(D2);
  const res = ctx2.ShopDataIO.importShopJSON(json, 'gabung');
  assert.equal(res.ok, true);
  assert.equal(res.created, 1);
  assert.equal(D2.products[0].name, 'Lumpang 10cm');
  assert.equal(D2.produsen[0].name, 'UD Batu Alam');
});
