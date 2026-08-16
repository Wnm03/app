'use strict';
/**
 * tests/investment-tx-delete-cascade-s-async-ownership.test.js — Regression
 * utk fix "Holding Investasi <-> Akun tidak sinkron dua arah" (audit lanjutan
 * s-async-ownership, sesi setelah fix Portfolio Composition/AI Chat asetInfo/
 * asetZakatable).
 *
 * BUG SEBELUM FIX: Investment.addTransaction() (modules/asset/investasi.js)
 * membuat transaksi kembar di D.transactions (accountId) + tx.linkedTxId <->
 * investmentTx.investmentTxLinkId (2 arah). TAPI runTxDeleteCascades()
 * (modules/finance/tx-list-cashflow.js) -- dipanggil delTx() saat user hapus
 * transaksi dari Transaksi/Cashflow -- TIDAK PERNAH membaca `investmentTxLinkId`
 * sama sekali (beda dgn bbmLinkId/cobekLinkId/servisLinkId/renovItemLinkId/dst
 * yang semua sudah ada cascade-nya). Akibat: hapus transaksi "Beli Investasi"
 * dari Transaksi/Cashflow, saldo akun balik tapi unit/avgPrice holding TETAP
 * seolah pembelian terjadi -- desync permanen & investmentTx.linkedTxId jadi
 * orphan.
 *
 * FIX: tambah 1 blok cascade baru di runTxDeleteCascades() -- hapus tx
 * investasi terkait dari D.investmentTx & panggil Investment.recomputeHolding()
 * (fungsi yg SUDAH ADA, 0 rumus baru), pola SAMA PERSIS cascade *LinkId lain.
 *
 * Pola harness: SAMA PERSIS tests/s633-renovasi-delete-cascade-regression.test.js
 * -- load file SOURCE ASLI lewat loadSource(), 0 re-implementasi logic di sini.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  const calls = [];
  const ctx = loadSource(
    ['modules/asset/investasi.js', 'modules/finance/tx-list-cashflow.js'],
    {
      D,
      save: () => calls.push('save'),
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      uid: (() => { let n = 1; return () => 'gen' + (n++); })(),
      todayStr: () => '2026-08-16',
      askConfirm: async () => true,
      toast: () => calls.push('toast'),
      renderDashboard: () => calls.push('renderDashboard'),
      renderKeuangan: () => calls.push('renderKeuangan'),
      renderStockList: () => {},
      renderShop: () => {},
      renderShopRecent: () => {},
      renderCnTab: () => {},
      renderProductList: () => {},
      closeModal: () => {},
      openModal: () => {},
      document: { getElementById: () => null },
    },
    ['delTx', 'Investment', 'runTxDeleteCascades'],
  );
  ctx.__calls = calls;
  return ctx;
}

function baseD(overrides) {
  return Object.assign(
    {
      transactions: [],
      investments: [],
      investmentTx: [],
      accounts: [{ id: 'a1', name: 'Cash', includeInBalance: true }],
    },
    overrides || {},
  );
}

test('delTx() hapus transaksi Beli Investasi terkait -> tx investasi ikut terhapus & holding di-recompute (unit/avgPrice balik ke 0)', async () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Saham ABC', type: 'Saham', unit: 0, avgPrice: 0, accountId: null }],
  });
  const ctx = makeCtx(D);
  const tx = ctx.Investment.addTransaction({ investmentId: 'h1', type: 'beli', date: '2026-08-16', qty: 10, price: 1000, accountId: 'a1' });
  assert.equal(D.investments[0].unit, 10, 'sanity: holding kebeli 10 unit');
  assert.equal(D.investmentTx.length, 1);
  const linkedTx = D.transactions.find((t) => t.id === tx.linkedTxId);
  assert.ok(linkedTx, 'sanity: transaksi kembar di D.transactions dibuat');
  assert.equal(linkedTx.investmentTxLinkId, tx.id, 'sanity: linkage 2 arah tersambung');

  await ctx.delTx(linkedTx.id);

  assert.equal(D.transactions.length, 0, 'transaksi Keuangan terhapus');
  assert.equal(D.investmentTx.length, 0, 'FIX: tx investasi terkait ikut terhapus (sebelum fix: tetap 1)');
  assert.equal(D.investments[0].unit, 0, 'FIX: holding di-recompute balik ke 0 unit (sebelum fix: tetap 10, desync)');
  assert.equal(D.investments[0].avgPrice, 0, 'FIX: avgPrice ikut balik ke 0');
});

test('delTx() hapus transaksi Jual Investasi terkait -> holding di-recompute sesuai sisa riwayat (bukan cuma tx Jual yang hilang)', async () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Saham ABC', type: 'Saham', unit: 0, avgPrice: 0, accountId: null }],
  });
  const ctx = makeCtx(D);
  ctx.Investment.addTransaction({ investmentId: 'h1', type: 'beli', date: '2026-08-01', qty: 10, price: 1000 });
  const jualTx = ctx.Investment.addTransaction({ investmentId: 'h1', type: 'jual', date: '2026-08-10', qty: 4, price: 1500, accountId: 'a1' });
  assert.equal(D.investments[0].unit, 6, 'sanity: sisa 6 unit setelah jual 4 dari 10');
  const linkedTx = D.transactions.find((t) => t.id === jualTx.linkedTxId);
  assert.ok(linkedTx);

  await ctx.delTx(linkedTx.id);

  assert.equal(D.investmentTx.length, 1, 'cuma tx Jual yg terhapus, tx Beli tetap ada');
  assert.equal(D.investments[0].unit, 10, 'FIX: holding di-recompute murni dari riwayat sisa (tx Beli 10) -> balik ke 10 unit');
});

test('delTx() transaksi TANPA investmentTxLinkId (transaksi biasa) tidak memicu cascade investasi apa pun (0 regresi)', async () => {
  const D = baseD({
    transactions: [{ id: 't1', type: 'expense', amount: 5000, category: 'Makan', accountId: 'a1', date: '2026-08-16' }],
  });
  const ctx = makeCtx(D);

  await ctx.delTx('t1');

  assert.equal(D.transactions.length, 0);
  assert.equal(D.investmentTx.length, 0);
});

test('Investment.deleteTransaction() (hapus dari sisi Investasi, jalur lama) tetap berfungsi seperti semula (0 regresi jalur forward)', () => {
  const D = baseD({
    investments: [{ id: 'h1', name: 'Saham ABC', type: 'Saham', unit: 0, avgPrice: 0, accountId: null }],
  });
  const ctx = makeCtx(D);
  const tx = ctx.Investment.addTransaction({ investmentId: 'h1', type: 'beli', date: '2026-08-16', qty: 10, price: 1000, accountId: 'a1' });
  assert.equal(D.transactions.length, 1);

  const ok = ctx.Investment.deleteTransaction(tx.id);

  assert.equal(ok, true);
  assert.equal(D.investmentTx.length, 0);
  assert.equal(D.transactions.length, 0, 'transaksi kembar ikut terhapus lewat jalur lama');
  assert.equal(D.investments[0].unit, 0);
});
