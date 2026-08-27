'use strict';
// tests/tx-stok-sparepart-bulk-id-collision.test.js — regresi bug nyata
// (temuan audit backup user): syncPartsStockFromCatalog() dulu bikin id
// lewat 'st_'/'sp_'+Date.now() MENTAH -- kalau dipanggil banyak kali dlm
// loop SINKRON (persis pola syncUnlinkedCatalogPartsToStock() saat
// bulk-import katalog), Date.now() balik nilai SAMA utk banyak iterasi
// (mesin modern < 1ms/iterasi) -> id tabrakan. Backup produksi nyata: dari
// 296 baris partsStock, cuma 40 id unik. Fix: _genId() (uid() SOT
// anti-tabrakan, fallback counter monotonic lokal). Test ini simulasikan
// loop bulk yang sama & assert SEMUA id unik -- guard permanen biar bug ini
// tidak balik lagi kalau ada yang nyentuh syncPartsStockFromCatalog() lagi.

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
    ['syncPartsStockFromCatalog']
  );
}

test('syncPartsStockFromCatalog() — 50 item disinkron dlm loop sinkron (simulasi bulk-import katalog) -> semua id partsStock unik', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  for (let i = 0; i < 50; i++) {
    ctx.syncPartsStockFromCatalog({ id: 'cat_' + i, partName: 'Part ' + i, category: 'Umum', price: 1000 });
  }
  assert.equal(D.partsStock.length, 50, 'semua 50 item ke-generate');
  const ids = D.partsStock.map((p) => p.id);
  assert.equal(new Set(ids).size, 50, 'tidak ada id yang tabrakan walau dipanggil 50x berturutan tanpa jeda waktu');
});

test('syncPartsStockFromCatalog() — dipakai tanpa global uid() (fallback lokal) tetap unik dlm loop bulk', () => {
  // uid tidak di-inject sama sekali -> _genId() harus jatuh ke fallback
  // counter lokal, BUKAN error/undefined.
  const D = makeD();
  const ctx = makeCtx(D, { uid: undefined });
  for (let i = 0; i < 30; i++) {
    ctx.syncPartsStockFromCatalog({ id: 'cat_' + i, partName: 'Part ' + i, category: 'Umum', price: 1000 });
  }
  const ids = D.partsStock.map((p) => p.id);
  assert.equal(new Set(ids).size, 30, 'fallback lokal juga anti-tabrakan');
  assert.ok(ids.every((id) => typeof id === 'string' && id.startsWith('st_')), 'format id tetap st_<angka>');
});
