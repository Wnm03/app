'use strict';
// tests/s626-stock-avgprice-revert-regression.test.js — Bug C (audit
// lanjutan sesi s625): revertStockPurchase() cuma mengurangi `qty`, tidak
// mengembalikan/recalculate `avgPrice`/`priceHistory`/`txRefs` dengan benar
// saat transaksi pembelian sparepart di-EDIT atau DIHAPUS.
//
// Pola sama tests/tx-stok-sparepart-catalog-link.test.js: load source ASLI
// modules/finance/tx-stok-sparepart.js lewat loadSource() (fungsi-fungsi di
// sini MURNI terhadap D, tidak sentuh DOM), jadi test ini benar-benar
// menjalankan applyStockPurchase()/revertStockPurchase() yang sama dipakai
// app, bukan re-implementasi logic di file test.

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
  return { id: 'p1', name: 'Oli Mesin', qty, price, avgPrice: price, unit: 'pcs', minStock: 1, priceHistory: [], txRefs: [] };
}

test('CREATE — beli 5@80000 di atas stok awal 10@50000 -> qty 15, avgPrice 60000', () => {
  const { ctx } = makeCtx();
  const p = makePart(10, 50000);
  ctx.applyStockPurchase(p, 5, 80000, '2026-08-01', 'tx1');
  assert.equal(p.qty, 15);
  assert.equal(p.avgPrice, 60000);
  assert.equal(p.priceHistory.length, 1);
  assert.equal(p.txRefs.length, 1);
});

test('DELETE — qty, avgPrice, priceHistory, txRefs semua kembali ke keadaan sebelum transaksi', () => {
  const { D, ctx } = makeCtx();
  const p = makePart(10, 50000);
  D.partsStock.push(p);
  ctx.applyStockPurchase(p, 5, 80000, '2026-08-01', 'tx1');
  assert.equal(p.qty, 15);
  assert.equal(p.avgPrice, 60000);

  ctx.revertStockPurchase(p.id, 5, 'tx1');

  assert.equal(p.qty, 10, 'qty harus kembali ke 10');
  assert.equal(p.avgPrice, 50000, 'avgPrice harus kembali ke 50000 (BUG: saat ini tetap 60000)');
  assert.equal(p.price, 50000);
  assert.equal(p.priceHistory.length, 0, 'priceHistory tidak boleh ada entry orphan tx1');
  assert.equal((p.txRefs || []).includes('tx1'), false, 'txRefs tidak boleh masih menyimpan tx1');
});

test('EDIT qty — 5@80000 diubah jadi 3@80000 -> avgPrice dihitung ulang benar (bukan drift dari avgPrice lama)', () => {
  const { D, ctx } = makeCtx();
  const p = makePart(10, 50000);
  D.partsStock.push(p);
  ctx.applyStockPurchase(p, 5, 80000, '2026-08-01', 'tx1');
  assert.equal(p.avgPrice, 60000);

  // simulasi edit: revert dulu (txId sama, tx yg sama diedit), lalu apply lagi dgn qty baru
  ctx.revertStockPurchase(p.id, 5, 'tx1');
  ctx.applyStockPurchase(p, 3, 80000, '2026-08-01', 'tx1');

  // qty 10 + 3 = 13, avgPrice = (50000*10 + 80000*3)/13
  assert.equal(p.qty, 13);
  assert.equal(Math.round(p.avgPrice), Math.round((50000 * 10 + 80000 * 3) / 13));
  assert.equal(p.priceHistory.length, 1, 'tidak boleh ada 2 entry priceHistory utk 1 tx yg sama setelah edit');
});

test('EDIT harga — 5@80000 diubah jadi 5@100000 -> avgPrice dihitung ulang dari baseline yg benar', () => {
  const { D, ctx } = makeCtx();
  const p = makePart(10, 50000);
  D.partsStock.push(p);
  ctx.applyStockPurchase(p, 5, 80000, '2026-08-01', 'tx1');

  ctx.revertStockPurchase(p.id, 5, 'tx1');
  ctx.applyStockPurchase(p, 5, 100000, '2026-08-01', 'tx1');

  // qty 10+5=15, avgPrice = (50000*10 + 100000*5)/15
  assert.equal(p.qty, 15);
  assert.equal(Math.round(p.avgPrice), Math.round((50000 * 10 + 100000 * 5) / 15));
});

test('MULTIPLE PURCHASE — edit transaksi TENGAH tidak merusak kontribusi transaksi lain (order-independent)', () => {
  const { D, ctx } = makeCtx();
  const p = makePart(10, 50000);
  D.partsStock.push(p);
  ctx.applyStockPurchase(p, 5, 80000, '2026-08-01', 'tx1'); // qty15 avg60000
  ctx.applyStockPurchase(p, 2, 90000, '2026-08-02', 'tx2'); // qty17 avg (60000*15+90000*2)/17
  ctx.applyStockPurchase(p, 3, 70000, '2026-08-03', 'tx3'); // qty20 avg ...

  // edit tx2 (tengah) jadi 4@90000 (qty berubah, harga tetap)
  ctx.revertStockPurchase(p.id, 2, 'tx2');
  ctx.applyStockPurchase(p, 4, 90000, '2026-08-02', 'tx2');

  // Hitung ulang manual expected dgn replay: base(qty10,avg50000) -> tx1(5@80000) -> tx2(4@90000) -> tx3(3@70000)
  let q = 10, avg = 50000;
  [[5, 80000], [4, 90000], [3, 70000]].forEach(([qty, price]) => {
    const nq = q + qty;
    avg = (avg * q + price * qty) / nq;
    q = nq;
  });
  assert.equal(p.qty, q);
  assert.equal(Math.round(p.avgPrice), Math.round(avg));
  assert.equal(p.priceHistory.length, 3, 'tx1, tx2(baru), tx3 -- tidak ada orphan/duplikat');
});

test('DELETE LAST PURCHASE — avgPrice kembali persis ke nilai sebelum pembelian terakhir', () => {
  const { D, ctx } = makeCtx();
  const p = makePart(10, 50000);
  D.partsStock.push(p);
  ctx.applyStockPurchase(p, 5, 80000, '2026-08-01', 'tx1'); // avg60000
  ctx.applyStockPurchase(p, 2, 90000, '2026-08-02', 'tx2'); // avg lebih tinggi

  ctx.revertStockPurchase(p.id, 2, 'tx2');

  assert.equal(p.qty, 15);
  assert.equal(p.avgPrice, 60000);
  assert.equal(p.priceHistory.length, 1);
  assert.equal((p.txRefs || []).includes('tx2'), false);
  assert.equal(p.lastTxId, 'tx1');
});

test('MULTIPLE EDIT — edit transaksi yang sama berkali-kali tidak menyebabkan cumulative drift', () => {
  const { D, ctx } = makeCtx();
  const p = makePart(10, 50000);
  D.partsStock.push(p);
  ctx.applyStockPurchase(p, 5, 80000, '2026-08-01', 'tx1');
  for (let i = 0; i < 5; i++) {
    ctx.revertStockPurchase(p.id, p.priceHistory.find(h => h.txId === 'tx1').qty, 'tx1');
    ctx.applyStockPurchase(p, 5, 80000, '2026-08-01', 'tx1');
  }
  assert.equal(p.qty, 15);
  assert.equal(p.avgPrice, 60000, 'setelah diedit berkali-kali ke nilai yg sama, avgPrice harus tetap 60000, bukan drift');
  assert.equal(p.priceHistory.length, 1);
});

test('txRefs & priceHistory — tidak ada entry orphan setelah delete transaksi yang bukan pembelian terakhir', () => {
  const { D, ctx } = makeCtx();
  const p = makePart(0, 0);
  D.partsStock.push(p);
  ctx.applyStockPurchase(p, 5, 80000, '2026-08-01', 'tx1');
  ctx.applyStockPurchase(p, 3, 90000, '2026-08-02', 'tx2');
  ctx.applyStockPurchase(p, 2, 70000, '2026-08-03', 'tx3');

  ctx.revertStockPurchase(p.id, 3, 'tx2');

  assert.deepEqual(p.priceHistory.map(h => h.txId).sort(), ['tx1', 'tx3']);
  assert.deepEqual((p.txRefs || []).slice().sort(), ['tx1', 'tx3']);
});

test('Backward-compat — pemanggilan lama tanpa txId (2 argumen) tetap cuma mengurangi qty, tidak crash', () => {
  const { D, ctx } = makeCtx();
  const p = makePart(10, 50000);
  D.partsStock.push(p);
  ctx.applyStockPurchase(p, 5, 80000, '2026-08-01', 'tx1');
  ctx.revertStockPurchase(p.id, 5); // tanpa txId, spt caller lama/legacy
  assert.equal(p.qty, 10);
  // avgPrice/priceHistory TIDAK direcompute krn tidak ada txId (behavior lama dipertahankan)
  assert.equal(p.avgPrice, 60000);
});
