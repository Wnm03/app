'use strict';
/**
 * tests/s633-renovasi-delete-cascade-regression.test.js — Regression Bug E
 * (Renov.deleteItem() bypass cascade delTx()). Lihat
 * AUDIT-s632-bugE-renovasi-delete-cascade.md untuk audit lengkap &
 * PATCH-README-s633-bugE-renovasi-delete-cascade.md untuk laporan fix.
 *
 * SESI INI (s633): IMPLEMENTASI FIX. File ini menggantikan peran
 * tests/s632-renovasi-delete-cascade-regression.test.js sebagai regression
 * suite PERMANEN untuk Bug E (s632 tetap dipertahankan apa adanya sbg
 * dokumentasi audit historis -- termasuk test "[diagnostic]" yang SENGAJA
 * berubah hasil setelah fix ini, itu memang tujuannya, lihat catatan di
 * file s632).
 *
 * Pola harness: SAMA PERSIS s632 -- load file SOURCE ASLI lewat
 * loadSource(), 0 re-implementasi logic cascade di sini.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, opts = {}) {
  const calls = opts.calls || [];
  const revertStockUsageCalls = opts.revertStockUsageCalls || [];
  const onLinkedTxDeletedCalls = opts.onLinkedTxDeletedCalls || [];
  const ctx = loadSource(
    [
      'modules/finance/tx-stok-sparepart.js',
      'modules/finance/tx-list-cashflow.js',
      'modules/home/renovasi.js',
    ],
    {
      D,
      save: () => calls.push('save'),
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      sameId: (a, b) => String(a) === String(b),
      uid: (() => { let n = 1; return () => 'gen' + (n++); })(),
      todayStr: () => '2026-08-10',
      askConfirm: async () => true,
      toast: () => {},
      revertStockUsage: (partId, qty) => { revertStockUsageCalls.push({ partId, qty }); },
      Tukang: { releaseEntries: (ids) => calls.push('Tukang.releaseEntries:' + JSON.stringify(ids)) },
      renderDashboard: () => calls.push('renderDashboard'),
      renderKeuangan: () => calls.push('renderKeuangan'),
      renderCnTab: () => {},
      renderProductList: () => {},
      renderShop: () => {},
      renderShopRecent: () => {},
      renderStockList: () => calls.push('renderStockList'),
      closeModal: () => calls.push('closeModal'),
      openModal: () => calls.push('openModal'),
      document: { getElementById: () => null },
    },
    ['delTx', 'Renov', 'runTxDeleteCascades'],
  );
  ctx.__calls = calls;
  ctx.__revertStockUsageCalls = revertStockUsageCalls;
  // Wrap Renov.onLinkedTxDeleted supaya bisa diverifikasi berapa kali
  // dipanggil (test #6/#8 -- harus TETAP tepat 1x lewat delTx(), dan TIDAK
  // PERNAH lewat Renov.deleteItem() krn item yg sama sedang dihapus total).
  const origOnLinkedTxDeleted = ctx.Renov.onLinkedTxDeleted.bind(ctx.Renov);
  ctx.Renov.onLinkedTxDeleted = function (t) {
    onLinkedTxDeletedCalls.push(t.id);
    return origOnLinkedTxDeleted(t);
  };
  ctx.__onLinkedTxDeletedCalls = onLinkedTxDeletedCalls;
  return ctx;
}

function baseD(overrides) {
  return Object.assign(
    {
      transactions: [],
      renovProjects: [],
      accounts: [{ id: 'a1', name: 'Cash', emoji: '💵' }],
      partsStock: [],
      servisLogs: [],
      bbmLogs: [],
    },
    overrides || {},
  );
}

function makeRenovProjectWithLinkedItem(D, tx, itemOverrides) {
  const item = Object.assign(
    {
      id: 'item1',
      name: tx.note || 'Item Renovasi',
      note: '',
      paid: true,
      txId: tx.id,
      paidDate: tx.date,
      harga: tx.amount,
      category: tx.category,
      accountId: tx.accountId,
      tglBayar: tx.date,
    },
    itemOverrides || {},
  );
  const project = { id: 'p1', name: 'Renovasi Dapur', items: [item] };
  tx.renovProjectLinkId = project.id;
  tx.renovItemLinkId = item.id;
  D.renovProjects.push(project);
  D.transactions.push(tx);
  return { project, item };
}

// 1. Renov transaction biasa -> delete item tetap menghapus transaction.
test('[s633-1] item Renov biasa (tanpa linkage lain): delete item tetap menghapus transaksi & item', async () => {
  const D = baseD();
  const tx = { id: 'tx1', type: 'expense', amount: 500000, category: 'Renovasi', accountId: 'a1', date: '2026-08-05', note: 'Cat tembok' };
  const { project } = makeRenovProjectWithLinkedItem(D, tx);
  const ctx = makeCtx(D);
  await ctx.Renov.deleteItem('p1', 'item1');
  assert.equal(D.transactions.length, 0, 'transaksi harus terhapus');
  assert.equal(project.items.length, 0, 'item harus terhapus dari proyek');
});

// 2. linked partStockId -> stok harus direvert.
test('[s633-2] item Renov + partStockId: stok sparepart harus direvert (qty & priceHistory/txRefs bersih)', async () => {
  const D = baseD();
  D.partsStock.push({ id: 'part1', name: 'Kabel NYM', qty: 0, unit: 'meter' });
  const tx = { id: 'tx2', type: 'expense', amount: 300000, category: 'Renovasi', accountId: 'a1', date: '2026-08-05', note: 'Kabel listrik' };
  const ctx0 = makeCtx(D);
  ctx0.applyStockPurchase(D.partsStock[0], 10, 30000, tx.date, tx.id);
  tx.partStockId = 'part1'; tx.partStockQty = 10; tx.partStockUnit = 'meter';
  makeRenovProjectWithLinkedItem(D, tx);
  const ctx = makeCtx(D);
  await ctx.Renov.deleteItem('p1', 'item1');
  assert.equal(D.partsStock[0].qty, 0, 'stok sparepart harus kembali ke 0');
  assert.equal(D.partsStock[0].priceHistory.length, 0, 'priceHistory milik tx yang dihapus harus bersih');
  assert.equal(D.partsStock[0].txRefs.length, 0, 'txRefs tidak boleh menyisakan referensi ke tx yang sudah dihapus');
});

// 3. linked servisLinkId -> servis log harus ikut dibersihkan.
test('[s633-3] item Renov + servisLinkId: D.servisLogs & pemakaian stok servis harus ikut dibersihkan', async () => {
  const D = baseD();
  D.partsStock.push({ id: 'part2', name: 'Kampas Rem', qty: 5 });
  D.servisLogs.push({ id: 'sv1', item: 'Ganti Kampas Rem', usedPartId: 'part2', usedPartQty: 2, cost: 150000 });
  const tx = { id: 'tx3', type: 'expense', amount: 150000, category: 'Renovasi', accountId: 'a1', date: '2026-08-06', note: 'Servis terkait renovasi garasi', servisLinkId: 'sv1' };
  makeRenovProjectWithLinkedItem(D, tx);
  const ctx = makeCtx(D);
  await ctx.Renov.deleteItem('p1', 'item1');
  assert.equal(D.servisLogs.length, 0, 'log servis harus ikut terhapus');
  assert.equal(ctx.__revertStockUsageCalls.length, 1, 'revertStockUsage() harus dipanggil 1x');
  assert.deepEqual(ctx.__revertStockUsageCalls[0], { partId: 'part2', qty: 2 });
});

// 4. linked bbmLinkId -> BBM log harus ikut dibersihkan.
test('[s633-4] item Renov + bbmLinkId: D.bbmLogs harus ikut dibersihkan', async () => {
  const D = baseD();
  D.bbmLogs.push({ id: 'bbm1', liter: 8, cost: 100000 });
  const tx = { id: 'tx4', type: 'expense', amount: 100000, category: 'Renovasi', accountId: 'a1', date: '2026-08-07', note: 'BBM angkut material', bbmLinkId: 'bbm1' };
  makeRenovProjectWithLinkedItem(D, tx);
  const ctx = makeCtx(D);
  await ctx.Renov.deleteItem('p1', 'item1');
  assert.equal(D.bbmLogs.length, 0, 'log BBM harus ikut terhapus');
});

// 5. kombinasi satu transaksi dgn lebih dari satu linkage -> semua cascade harus terjadi.
test('[s633-5] item Renov + partStockId + servisLinkId + bbmLinkId sekaligus: SEMUA cascade harus terjadi', async () => {
  const D = baseD();
  D.partsStock.push({ id: 'part1', name: 'Kabel NYM', qty: 0, unit: 'meter' });
  D.partsStock.push({ id: 'part2', name: 'Kampas Rem', qty: 5 });
  D.servisLogs.push({ id: 'sv1', item: 'Ganti Kampas Rem', usedPartId: 'part2', usedPartQty: 2, cost: 150000 });
  D.bbmLogs.push({ id: 'bbm1', liter: 8, cost: 100000 });
  const tx = {
    id: 'tx5', type: 'expense', amount: 550000, category: 'Renovasi', accountId: 'a1', date: '2026-08-08',
    note: 'Kombinasi', servisLinkId: 'sv1', bbmLinkId: 'bbm1',
  };
  const ctx0 = makeCtx(D);
  ctx0.applyStockPurchase(D.partsStock[0], 10, 30000, tx.date, tx.id);
  tx.partStockId = 'part1'; tx.partStockQty = 10; tx.partStockUnit = 'meter';
  const { project } = makeRenovProjectWithLinkedItem(D, tx);
  const ctx = makeCtx(D);
  await ctx.Renov.deleteItem('p1', 'item1');
  assert.equal(D.transactions.length, 0, 'transaksi harus terhapus');
  assert.equal(project.items.length, 0, 'item harus terhapus dari proyek');
  assert.equal(D.partsStock[0].qty, 0, 'stok sparepart harus direvert');
  assert.equal(D.servisLogs.length, 0, 'log servis harus dibersihkan');
  assert.equal(ctx.__revertStockUsageCalls.length, 1, 'revertStockUsage() harus dipanggil untuk servis');
  assert.equal(D.bbmLogs.length, 0, 'log BBM harus dibersihkan');
});

// 6. behavior Renov.onLinkedTxDeleted tidak rusak (tetap dipanggil tepat
//    sekali lewat delTx(), dan TIDAK dipanggil lewat Renov.deleteItem()).
test('[s633-6] Renov.onLinkedTxDeleted TETAP jalan normal lewat delTx() (item TIDAK dihapus, cuma jadi belum-lunas)', async () => {
  const D = baseD();
  const tx = { id: 'tx6', type: 'expense', amount: 500000, category: 'Renovasi', accountId: 'a1', date: '2026-08-05', note: 'Cat tembok' };
  const { project, item } = makeRenovProjectWithLinkedItem(D, tx);
  const ctx = makeCtx(D);
  await ctx.delTx('tx6');
  assert.equal(ctx.__onLinkedTxDeletedCalls.length, 1, 'Renov.onLinkedTxDeleted harus dipanggil tepat 1x lewat delTx()');
  assert.equal(project.items.length, 1, 'item Renov TIDAK dihapus oleh delTx(), cuma diputus tautannya');
  assert.equal(item.paid, false);
  assert.equal(item.txId, null);
});

test('[s633-6b] Renov.deleteItem() TIDAK memanggil Renov.onLinkedTxDeleted() balik ke dirinya sendiri (item sedang dihapus total, bukan sekadar unlink)', async () => {
  const D = baseD();
  const tx = { id: 'tx6b', type: 'expense', amount: 500000, category: 'Renovasi', accountId: 'a1', date: '2026-08-05', note: 'Cat tembok' };
  makeRenovProjectWithLinkedItem(D, tx);
  const ctx = makeCtx(D);
  await ctx.Renov.deleteItem('p1', 'item1');
  assert.equal(ctx.__onLinkedTxDeletedCalls.length, 0, 'onLinkedTxDeleted TIDAK boleh dipanggil dari jalur Renov.deleteItem()');
});

// 7. jangan menghapus transaction yang tidak terkait dengan item Renovasi.
test('[s633-7] Renov.deleteItem() TIDAK menyentuh transaksi/stok lain yang tidak terkait dengan item yang dihapus', async () => {
  const D = baseD();
  D.partsStock.push({ id: 'partOther', name: 'Sparepart Lain', qty: 3 });
  const unrelatedTx = { id: 'txOther', type: 'expense', amount: 999000, category: 'Lain', accountId: 'a1', date: '2026-08-01', note: 'Tidak terkait', partStockId: 'partOther', partStockQty: 3 };
  D.transactions.push(unrelatedTx);
  const tx = { id: 'tx7', type: 'expense', amount: 500000, category: 'Renovasi', accountId: 'a1', date: '2026-08-05', note: 'Cat tembok' };
  makeRenovProjectWithLinkedItem(D, tx);
  const ctx = makeCtx(D);
  await ctx.Renov.deleteItem('p1', 'item1');
  assert.equal(D.transactions.length, 1, 'transaksi lain yang tidak terkait harus tetap ada');
  assert.equal(D.transactions[0].id, 'txOther');
  assert.equal(D.partsStock[0].qty, 3, 'stok sparepart milik transaksi lain tidak boleh tersentuh');
});

// 8. pastikan tidak terjadi double cleanup.
test('[s633-8] tidak ada double cleanup: cascade & filter transaksi masing-masing hanya berjalan 1x', async () => {
  const D = baseD();
  D.partsStock.push({ id: 'part1', name: 'Kabel NYM', qty: 0, unit: 'meter' });
  const tx = { id: 'tx8', type: 'expense', amount: 300000, category: 'Renovasi', accountId: 'a1', date: '2026-08-05', note: 'Kabel listrik' };
  const ctx0 = makeCtx(D);
  ctx0.applyStockPurchase(D.partsStock[0], 10, 30000, tx.date, tx.id);
  tx.partStockId = 'part1'; tx.partStockQty = 10; tx.partStockUnit = 'meter';
  makeRenovProjectWithLinkedItem(D, tx);
  const ctx = makeCtx(D);
  await ctx.Renov.deleteItem('p1', 'item1');
  // revertStockPurchase mengurangi qty tepat sesuai jumlah yang dibeli --
  // kalau cascade jalan 2x, qty akan jadi negatif alih-alih 0 (revert kedua
  // tidak punya apa-apa lagi utk dikurangi krn priceHistory/txRefs sudah
  // kosong dari revert pertama -- jadi ini juga cek TIDAK ADA revert ganda).
  assert.equal(D.partsStock[0].qty, 0, 'qty harus tepat 0, bukan negatif (tanda revert ganda)');
  assert.equal(D.transactions.length, 0, 'transaksi harus hilang tepat 1x (bukan error krn filter dobel)');
  // deleteItem() dipanggil ulang pada item yang sudah tidak ada lagi ->
  // harus no-op bersih (early return via `if(!it)return`), bukan crash /
  // cascade kedua.
  await ctx.Renov.deleteItem('p1', 'item1');
  assert.equal(D.partsStock[0].qty, 0, 'panggilan kedua ke deleteItem() pada item yang sudah hilang harus no-op, tidak mengubah state lagi');
});
