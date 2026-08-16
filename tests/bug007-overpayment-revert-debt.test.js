'use strict';
// tests/bug007-overpayment-revert-debt.test.js — Regression test utk BUG-007
// (audit 2026-08, docs/BUG_REGISTRY.md / TODO.md): revertBillFromDeletedTx(t)
// (tagihan-kalender.js) mengembalikan saldo utang dgn `dbt.nilai=(dbt.nilai||
// 0)+t.amount` -- t.amount adalah NOMINAL PEMBAYARAN USER-INPUT (payAmount),
// yang bisa LEBIH BESAR dari sisa saldo utang aktual saat itu (pelunasan
// sekaligus/overpayment, lihat markBillPaid() kind==='utang' prompt "Jumlah
// Pembayaran"), sedangkan dbt.nilai SAAT dibayar sudah diclamp
// Math.max(0,...) oleh markBillPaid(). +t.amount mentah bikin saldo utang
// jadi LEBIH BESAR dari sebelum dibayar kalau transaksi overpayment itu
// dihapus lagi.
//
// FIX: markBillPaid() sekarang menyimpan snapshot `debtNilaiBefore` (saldo
// utang SEBELUM payAmount dikurangkan) di transaksi pembayaran. Saat
// direvert, revertBillFromDeletedTx() pakai snapshot itu (restore EXACT)
// kalau ada, fallback ke logic +t.amount lama utk transaksi LAMA yg tidak
// punya field ini (backward compatible).
//
// Test ini pakai file SOURCE ASLI lewat loadSource() (pola sama
// tests/s625-deltx-revert-bill-regression.test.js) -- markBillPaid()
// dipanggil end-to-end (bukan re-implementasi logic) supaya snapshot
// debtNilaiBefore yang dites BENAR-BENAR ditulis oleh source asli, lalu
// delTx() dipanggil utk memicu revertBillFromDeletedTx().

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, promptAmount) {
  const ctx = loadSource(
    [
      'modules/finance/tagihan-kalender.js',
      'modules/finance/tx-list-cashflow.js',
    ],
    {
      D,
      uid: (() => { let n = 5000; return () => (++n); })(),
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      sameId: (a, b) => String(a) === String(b),
      parsePzNum: (v) => Number(v) || 0,
      askConfirm: async () => true,
      toast: () => {},
      save: () => {},
      renderDashboard: () => {}, renderKeuangan: () => {}, renderCnTab: () => {}, renderProductList: () => {},
      renderShop: () => {}, renderShopRecent: () => {}, renderStockList: () => {},
      renderBillList: () => {}, checkBills: () => {}, renderBillHistory: () => {}, renderBillArchive: () => {},
      renderDebtList: () => {}, renderKekayaanBersih: () => {}, hitungZakatMaal: () => {}, renderSettings: () => {},
      refreshBillEverywhere: () => {},
      showPromptModal: async (opts) => {
        if (opts && opts.title === 'Jumlah Pembayaran') return promptAmount;
        return '2026-08-10'; // Tanggal Pembayaran
      },
    },
    ['markBillPaid', 'delTx', 'revertBillFromDeletedTx', 'isLatestBillPaymentTx'],
  );
  return ctx;
}

function baseD(debtNilai) {
  return {
    accounts: [{ id: 'acc1', name: 'Kas' }],
    bills: [{ id: 'b1', kind: 'utang', debtId: 'd1', name: 'Cicilan Bank X', amount: 300000, nextDue: '2099-01-01', freq: 'bulanan', category: 'Utang' }],
    billsArchive: [],
    debts: [{ id: 'd1', name: 'Bank X', nilai: debtNilai, lunas: false, billId: 'b1' }],
    piutang: [],
    transactions: [],
  };
}

// ------------------------------------------------------------------
// Case A — normal payment (bukan overpay): 1.000.000, bayar 300.000
// ------------------------------------------------------------------
test('BUG-007 Case A: bayar normal (300rb dari 1jt) -> delete tx -> saldo utang kembali persis ke 1.000.000', async () => {
  const D = baseD(1000000);
  const ctx = makeCtx(D, 300000);
  await ctx.markBillPaid('b1');
  assert.equal(D.debts[0].nilai, 700000, 'setelah bayar: 1jt-300rb=700rb');
  const txId = D.transactions[0].id;
  assert.equal(D.transactions[0].debtNilaiBefore, 1000000, 'snapshot debtNilaiBefore harus 1.000.000');
  await ctx.delTx(txId);
  assert.equal(D.debts[0].nilai, 1000000, 'setelah delete: harus kembali PERSIS ke 1.000.000');
});

// ------------------------------------------------------------------
// Case B — exact payment: 1.000.000, bayar tepat 1.000.000 (lunas)
// ------------------------------------------------------------------
test('BUG-007 Case B: bayar pas (1jt dari 1jt, lunas) -> delete tx -> saldo utang kembali tepat ke 1.000.000', async () => {
  const D = baseD(1000000);
  const ctx = makeCtx(D, 1000000);
  await ctx.markBillPaid('b1');
  assert.equal(D.debts[0].nilai, 0);
  assert.equal(D.debts[0].lunas, true);
  assert.equal(D.bills.length, 0, 'bill dipindah ke arsip krn lunas');
  assert.equal(D.billsArchive.length, 1);
  const txId = D.transactions[0].id;
  assert.equal(D.transactions[0].debtNilaiBefore, 1000000);
  await ctx.delTx(txId);
  assert.equal(D.debts[0].nilai, 1000000, 'harus kembali tepat ke 1.000.000, bukan 0 ataupun nilai lain');
  assert.equal(D.debts[0].lunas, false, 'status lunas harus dibatalkan lagi');
  assert.equal(D.bills.length, 1, 'bill harus reaktif lagi dari arsip');
});

// ------------------------------------------------------------------
// Case C — overpayment: sisa 1.000.000, bayar 1.500.000 (bug utama BUG-007)
// ------------------------------------------------------------------
test('BUG-007 Case C (bug utama): overpayment (bayar 1.5jt dari sisa 1jt) -> delete tx -> saldo utang kembali ke 1.000.000, BUKAN 1.500.000', async () => {
  const D = baseD(1000000);
  const ctx = makeCtx(D, 1500000);
  await ctx.markBillPaid('b1');
  assert.equal(D.debts[0].nilai, 0, 'diclamp ke 0, bukan negatif');
  assert.equal(D.debts[0].lunas, true);
  const tx = D.transactions[0];
  assert.equal(tx.amount, 1500000, 'nominal transaksi = nominal input user (payAmount), BUKAN sisa utang');
  assert.equal(tx.debtNilaiBefore, 1000000, 'snapshot HARUS simpan saldo SEBELUM diclamp, bukan payAmount');
  await ctx.delTx(tx.id);
  assert.equal(
    D.debts[0].nilai,
    1000000,
    'BUG-007: saldo utang setelah delete transaksi overpayment harus kembali ke NILAI SEBELUM dibayar (1.000.000), bukan 0+t.amount=1.500.000'
  );
  assert.equal(D.debts[0].lunas, false);
  assert.equal(D.bills.length, 1, 'bill harus reaktif lagi');
});

// ------------------------------------------------------------------
// Backward compatibility — transaksi LAMA tanpa field debtNilaiBefore
// ------------------------------------------------------------------
test('BUG-007 backward compat: transaksi LAMA tanpa debtNilaiBefore tetap direvert (fallback +t.amount, tidak error/tidak diblokir)', async () => {
  const D = baseD(700000);
  D.transactions = [{ id: 9001, billLinkId: 'b1', amount: 300000, payMethod: 'utang', type: 'expense', date: '2026-08-01' }];
  // tx LAMA: tidak punya field debtNilaiBefore sama sekali (field ini baru
  // ditulis markBillPaid() sejak fix BUG-007 ini).
  const ctx = makeCtx(D, 0);
  await ctx.delTx(9001);
  assert.equal(D.debts[0].nilai, 1000000, 'fallback lama (+t.amount) tetap jalan: 700rb+300rb=1jt');
  assert.equal(D.transactions.length, 0);
});
