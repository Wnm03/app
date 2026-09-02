'use strict';
// tests/s713-stock-pricehistory-duplicate-push-guard.test.js — Bug 1 dari
// laporan user (backup: "ban belakang 90/90"/"pentil tubles" priceHistory
// dobel persis utk 1 txId). Root cause: txRefs sudah dijaga anti-dobel lewat
// includes() check di applyStockPurchase(), tapi priceHistory.push() TIDAK
// -- kalau applyStockPurchase() somehow kepanggil 2x utk txId yang SAMA
// tanpa revertStockPurchase() di antaranya (mis. double-submit sebelum
// debounce), priceHistory numpuk 2 entri identik.
//
// Pola sama tests/s626-stock-avgprice-revert-regression.test.js: load
// source ASLI via loadSource(), test ini benar-benar menjalankan
// applyStockPurchase() yang sama dipakai app.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  const D = { partsStock: [], sparepartCats: [] };
  const ctx = loadSource(
    ['modules/finance/tx-stok-sparepart.js'],
    { D, codeFromName: () => 'SP', toast: () => {}, save: () => {}, escapeHtml: (s) => s },
    ['applyStockPurchase', 'revertStockPurchase']
  );
  return { D, ctx };
}

function makePart(qty, price) {
  return { id: 'p1', name: 'Ban Belakang 90/90', qty, price, avgPrice: price, unit: 'pcs', minStock: 0, priceHistory: [], txRefs: [] };
}

test('DOUBLE-CALL sama txId (tanpa revert di antaranya) -> priceHistory TETAP 1 entry, bukan 2', () => {
  const { ctx } = makeCtx();
  const p = makePart(0, 0);

  ctx.applyStockPurchase(p, 1, 252000, '2026-08-10', 'tx1');
  // simulasi double-submit: applyStockPurchase kepanggil lagi utk txId yg
  // SAMA tanpa revertStockPurchase() di antaranya (skenario diduga jadi
  // penyebab duplikat di backup produksi user)
  ctx.applyStockPurchase(p, 1, 252000, '2026-08-10', 'tx1');

  assert.equal(p.priceHistory.length, 1, 'priceHistory tidak boleh dobel utk txId yang sama');
  assert.equal(p.txRefs.length, 1, 'txRefs tetap 1 (perilaku lama, tidak berubah)');
});

test('EDIT normal (revert lalu apply lagi) TETAP jalan seperti biasa -- 0 regresi', () => {
  const { D, ctx } = makeCtx();
  const p = makePart(10, 50000);
  D.partsStock.push(p);

  ctx.applyStockPurchase(p, 5, 80000, '2026-08-01', 'tx1');
  ctx.revertStockPurchase(p.id, 5, 'tx1');
  ctx.applyStockPurchase(p, 3, 80000, '2026-08-01', 'tx1');

  assert.equal(p.priceHistory.length, 1, 'jalur edit normal (revert->apply) tetap 1 entry per tx');
  assert.equal(p.qty, 13);
});

test('txId BEDA tetap dicatat sebagai entry terpisah (guard tidak menelan pembelian lain)', () => {
  const { ctx } = makeCtx();
  const p = makePart(0, 0);

  ctx.applyStockPurchase(p, 1, 252000, '2026-08-10', 'tx1');
  ctx.applyStockPurchase(p, 2, 260000, '2026-08-15', 'tx2');

  assert.equal(p.priceHistory.length, 2, '2 txId beda = 2 entry, guard cuma menolak txId yang PERSIS sama');
  assert.deepEqual(p.priceHistory.map(h => h.txId), ['tx1', 'tx2']);
});

test('txId null (mis. jalur lama tanpa txId) tidak kena guard, tetap push seperti biasa', () => {
  const { ctx } = makeCtx();
  const p = makePart(0, 0);

  ctx.applyStockPurchase(p, 1, 100000, '2026-08-01', null);
  ctx.applyStockPurchase(p, 1, 100000, '2026-08-02', null);

  assert.equal(p.priceHistory.length, 2, 'guard hanya berlaku kalau txId ada isinya, txId null tidak dianggap "sudah pernah dicatat"');
});
