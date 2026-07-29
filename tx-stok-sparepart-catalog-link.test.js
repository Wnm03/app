'use strict';
// tests/tx-stok-sparepart-catalog-link.test.js — cakupan
// syncPartsStockFromCatalog() di modules/finance/tx-stok-sparepart.js
// (Tahap 9: Jembatan Vehicle Catalog <-> Stok Sparepart Keuangan). Fungsi
// ini MURNI terhadap D (baca/tulis D.partsStock & D.sparepartCats saja,
// tidak sentuh DOM/IDBStore), jadi dites langsung lewat loadSource() tanpa
// stub DOM — pola sama tests/sparepart-dashboard.test.js. txStockScanPart()
// (DOM-heavy: getElementById, SparepartScanner, showPromptModal) SENGAJA
// TIDAK dites di sini — itu ranah smoke-test.js/manual QA, sama alasan
// scan()/buildOverlay() tidak dites di tests/sparepart-scanner.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return { partsStock: [], sparepartCats: [] };
}

function makeCtx(D, extra) {
  return loadSource(
    ['modules/finance/tx-stok-sparepart.js'],
    Object.assign(
      {
        D,
        codeFromName: (name) => (name || '').toString().trim().slice(0, 3).toUpperCase() || 'SP',
        toast: () => {},
        save: () => {},
        escapeHtml: (s) => s,
      },
      extra || {}
    ),
    ['syncPartsStockFromCatalog', 'syncUnlinkedCatalogPartsToStock']
  );
}

test('syncPartsStockFromCatalog() — belum ada link, bikin baris partsStock baru + kategori baru', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const catalogItem = { id: 'cat1', partName: 'Kampas Rem Depan', category: 'Rem', barcode: '8991234567890', price: 45000 };
  const p = ctx.syncPartsStockFromCatalog(catalogItem);
  assert.ok(p);
  assert.equal(p.catalogId, 'cat1');
  assert.equal(p.name, 'Kampas Rem Depan');
  assert.equal(p.qty, 0);
  assert.equal(p.code, '8991234567890');
  assert.equal(D.partsStock.length, 1);
  assert.equal(D.sparepartCats.length, 1);
  assert.equal(D.sparepartCats[0].name, 'Rem');
});

test('syncPartsStockFromCatalog() — sudah ada link (catalogId sama), reuse baris yg sama, tidak dobel', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const catalogItem = { id: 'cat1', partName: 'Kampas Rem Depan', category: 'Rem', barcode: '8991234567890' };
  const p1 = ctx.syncPartsStockFromCatalog(catalogItem);
  p1.qty = 5; // simulasikan sudah pernah ada stok
  const p2 = ctx.syncPartsStockFromCatalog(catalogItem);
  assert.equal(p2.id, p1.id);
  assert.equal(p2.qty, 5); // qty existing TIDAK direset
  assert.equal(D.partsStock.length, 1);
});

test('syncPartsStockFromCatalog() — nama part di katalog berubah, baris partsStock ikut ter-update', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const p1 = ctx.syncPartsStockFromCatalog({ id: 'cat1', partName: 'Oli Lama', category: 'Oli' });
  const p2 = ctx.syncPartsStockFromCatalog({ id: 'cat1', partName: 'Oli Mesin Yamalube 1L', category: 'Oli' });
  assert.equal(p2.id, p1.id);
  assert.equal(p2.name, 'Oli Mesin Yamalube 1L');
});

test('syncPartsStockFromCatalog() — kategori kosong fallback ke "Umum"', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const p = ctx.syncPartsStockFromCatalog({ id: 'cat2', partName: 'Baut Universal', category: '' });
  assert.equal(D.sparepartCats.find((c) => c.id === p.catId).name, 'Umum');
});

test('syncPartsStockFromCatalog() — reuse kategori yg sudah ada (case-insensitive), tidak bikin dobel', () => {
  const D = makeD();
  D.sparepartCats.push({ id: 'sp_existing', name: 'rem', code: 'REM', intervalKm: 0 });
  const ctx = makeCtx(D);
  const p = ctx.syncPartsStockFromCatalog({ id: 'cat3', partName: 'Kampas Rem Belakang', category: 'Rem' });
  assert.equal(D.sparepartCats.length, 1);
  assert.equal(p.catId, 'sp_existing');
});

test('syncPartsStockFromCatalog() — item null/tanpa id -> null, tidak menyentuh D', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.syncPartsStockFromCatalog(null), null);
  assert.equal(ctx.syncPartsStockFromCatalog({ partName: 'Tanpa Id' }), null);
  assert.equal(D.partsStock.length, 0);
  assert.equal(D.sparepartCats.length, 0);
});

// syncUnlinkedCatalogPartsToStock() — Tahap 10: part di Vehicle Catalog yang
// belum tertaut ke D.partsStock otomatis ditautkan (reuse
// syncPartsStockFromCatalog 100%), supaya muncul di dropdown "Pilih
// Sparepart" form transaksi Keuangan tanpa perlu discan dulu.

test('syncUnlinkedCatalogPartsToStock() — part katalog belum tertaut -> dibuatkan baris partsStock', async () => {
  const D = makeD();
  let saveCalls = 0;
  const VehicleCatalog = {
    ensureLoaded: async () => {},
    getStore: () => ({ items: [{ id: 'cat1', partName: 'Kampas Rem Depan', category: 'Rem' }] }),
  };
  const ctx = makeCtx(D, { VehicleCatalog, save: () => { saveCalls++; } });
  const added = await ctx.syncUnlinkedCatalogPartsToStock();
  assert.equal(added, true);
  assert.equal(D.partsStock.length, 1);
  assert.equal(D.partsStock[0].catalogId, 'cat1');
  assert.equal(saveCalls, 1);
});

test('syncUnlinkedCatalogPartsToStock() — part sudah tertaut (catalogId ada) -> tidak dobel, tidak save()', async () => {
  const D = makeD();
  D.partsStock.push({ id: 'st1', name: 'Kampas Rem Depan', catalogId: 'cat1', qty: 3 });
  let saveCalls = 0;
  const VehicleCatalog = {
    ensureLoaded: async () => {},
    getStore: () => ({ items: [{ id: 'cat1', partName: 'Kampas Rem Depan', category: 'Rem' }] }),
  };
  const ctx = makeCtx(D, { VehicleCatalog, save: () => { saveCalls++; } });
  const added = await ctx.syncUnlinkedCatalogPartsToStock();
  assert.equal(added, false);
  assert.equal(D.partsStock.length, 1);
  assert.equal(D.partsStock[0].qty, 3);
  assert.equal(saveCalls, 0);
});

test('syncUnlinkedCatalogPartsToStock() — draft part di katalog diabaikan', async () => {
  const D = makeD();
  const VehicleCatalog = {
    ensureLoaded: async () => {},
    getStore: () => ({ items: [{ id: 'cat1', partName: 'Draft', category: 'X', isDraft: true }] }),
  };
  const ctx = makeCtx(D, { VehicleCatalog });
  const added = await ctx.syncUnlinkedCatalogPartsToStock();
  assert.equal(added, false);
  assert.equal(D.partsStock.length, 0);
});

test('syncUnlinkedCatalogPartsToStock() — VehicleCatalog belum tersedia -> false, tidak throw', async () => {
  const D = makeD();
  const ctx = makeCtx(D); // tidak inject VehicleCatalog
  const added = await ctx.syncUnlinkedCatalogPartsToStock();
  assert.equal(added, false);
  assert.equal(D.partsStock.length, 0);
});

test('syncUnlinkedCatalogPartsToStock() — VehicleCatalog.ensureLoaded() reject -> false, tidak throw', async () => {
  const D = makeD();
  const VehicleCatalog = {
    ensureLoaded: async () => { throw new Error('gagal load'); },
    getStore: () => ({ items: [] }),
  };
  const ctx = makeCtx(D, { VehicleCatalog });
  const added = await ctx.syncUnlinkedCatalogPartsToStock();
  assert.equal(added, false);
});
