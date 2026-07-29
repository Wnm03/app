'use strict';
// tests/sparepart-stocklist-catalog-badge-s268.test.js — cakupan untuk
// badge kecil "🔗 Katalog" baru di Sparepart.renderStockList()
// (modules/vehicle/sparepart-servis.js), ditambah S268 poin 2 rekomendasi
// audit migrasi (lihat CHANGELOG.md § Sesi 268 & 269): tampilan-saja untuk
// baris D.partsStock yang punya `catalogId` (hasil bridge scan Keuangan,
// lihat modules/finance/tx-stok-sparepart.js syncPartsStockFromCatalog()).
// Tidak ada perubahan data/alur, jadi cukup dites lewat stub DOM minimal
// (elemen #stockList palsu yang innerHTML-nya bisa dibaca balik).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStockListEl() {
  return { innerHTML: '' };
}

function makeCtx(D) {
  const stockListEl = makeStockListEl();
  const document = {
    getElementById: (id) => (id === 'stockList' ? stockListEl : null),
  };
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'modules/shared/format-tema.js', 'modules/vehicle/sparepart-servis.js'],
    {
      D,
      document,
      MY_WRENCH: { brand: 'MOLLAR', sku: 'MLR-B11950', minNm: 13.56, maxNm: 108.48, minLbft: 10, maxLbft: 80, panjang: 280 },
    },
    ['Sparepart']
  );
  // renderStockList() juga manggil Sparepart.renderDashboard() (elemen lain,
  // #sparepartDash) -- getElementById palsu di atas balikin null utk id itu,
  // dan renderDashboard() sudah guard `if(!el)return;` di baris pertamanya.
  return { ctx, stockListEl };
}

test('renderStockList() — TIDAK tampilkan badge katalog utk part tanpa catalogId', () => {
  const D = { partsStock: [{ id: 'st_1', name: 'Kampas Rem', qty: 2, unit: 'pcs', minStock: 1 }], sparepartCats: [], servisLogs: [] };
  const { ctx, stockListEl } = makeCtx(D);
  ctx.Sparepart.renderStockList();
  assert.doesNotMatch(stockListEl.innerHTML, /🔗 Katalog/);
});

test('renderStockList() — tampilkan badge katalog utk part yang punya catalogId (hasil bridge scan)', () => {
  const D = { partsStock: [{ id: 'st_1', name: 'Oli Mesin', qty: 3, unit: 'botol', minStock: 1, catalogId: 'cat_abc' }], sparepartCats: [], servisLogs: [] };
  const { ctx, stockListEl } = makeCtx(D);
  ctx.Sparepart.renderStockList();
  assert.match(stockListEl.innerHTML, /🔗 Katalog/);
  assert.match(stockListEl.innerHTML, /Oli Mesin/);
});
