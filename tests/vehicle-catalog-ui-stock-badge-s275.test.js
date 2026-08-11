'use strict';
// tests/vehicle-catalog-ui-stock-badge-s275.test.js — FIX (S275): tindak
// lanjut temuan #1 audit Sesi 274 (CHANGELOG.md § Sesi 274/275).
//
// SEBELUM: badge "📦 Stok N" di VehicleCatalogUI.renderList() (layar
// Katalog Suku Cadang) mencari baris D.partsStock lewat name-match
// (p.name === it.partName), pola sama gap S272 tapi murni tampilan —
// badge HILANG kalau baris stok di-rename manual walau catalogId sama.
//
// SESUDAH: cari via `p.catalogId===it.id` LEBIH DULU (match presisi),
// name-match jadi FALLBACK saja untuk baris stok lama tanpa catalogId.
// Murni tampilan — 0 perubahan data/alur simpan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCatalogListEl() {
  return { innerHTML: '' };
}

function makeCtx(D, items) {
  const catalogListEl = makeCatalogListEl();
  const document = {
    getElementById: (id) => (id === 'catalogList' ? catalogListEl : null),
  };
  const ctx = loadSource(
    ['modules/vehicle/vehicle-catalog-ui.js'],
    {
      D,
      document,
      escapeHtml: (s) => String(s),
      VehicleCatalog: { getAll: async () => items, ensureLoaded: async () => {} },
    },
    ['VehicleCatalogUI'],
  );
  return { ctx, catalogListEl };
}

test('renderList() — badge stok TETAP tampil walau baris stok di-rename manual (catalogId sama)', async () => {
  const D = { partsStock: [{ id: 'st_1', name: 'Oli Mesin Federal 20W-50', qty: 4, unit: 'botol', catalogId: 'cat_1' }] };
  const items = [{ id: 'cat_1', partName: 'Oli Mesin' }]; // nama katalog TIDAK berubah
  const { ctx, catalogListEl } = makeCtx(D, items);
  await ctx.VehicleCatalogUI.renderList();
  assert.match(catalogListEl.innerHTML, /📦 Stok 4/);
});

test('renderList() — 2 baris stok nama sama, catalogId beda -> tetap tampilkan stok yang BENAR', async () => {
  const D = {
    partsStock: [
      { id: 'st_1', name: 'Oli Mesin', qty: 5, unit: 'L', catalogId: 'cat_A' },
      { id: 'st_2', name: 'Oli Mesin', qty: 20, unit: 'L', catalogId: 'cat_B' },
    ],
  };
  const items = [{ id: 'cat_B', partName: 'Oli Mesin' }];
  const { ctx, catalogListEl } = makeCtx(D, items);
  await ctx.VehicleCatalogUI.renderList();
  assert.match(catalogListEl.innerHTML, /📦 Stok 20/); // st_2 (cat_B), bukan st_1
});

test('renderList() — fallback name-match tetap jalan utk baris stok lama tanpa catalogId', async () => {
  const D = { partsStock: [{ id: 'st_old', name: 'Oli Mesin', qty: 7, unit: 'L' }] };
  const items = [{ id: 'cat_1', partName: 'Oli Mesin' }];
  const { ctx, catalogListEl } = makeCtx(D, items);
  await ctx.VehicleCatalogUI.renderList();
  assert.match(catalogListEl.innerHTML, /📦 Stok 7/);
});

test('renderList() — tidak ada stok cocok -> tidak ada badge', async () => {
  const D = { partsStock: [{ id: 'st_1', name: 'Kampas Rem', qty: 2, unit: 'pcs', catalogId: 'cat_other' }] };
  const items = [{ id: 'cat_1', partName: 'Oli Mesin' }];
  const { ctx, catalogListEl } = makeCtx(D, items);
  await ctx.VehicleCatalogUI.renderList();
  assert.doesNotMatch(catalogListEl.innerHTML, /📦 Stok/);
});
