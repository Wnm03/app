'use strict';
// tests/ownership-sync-keuangan.test.js — cakupan Sesi 192 (Ownership Sync —
// Akun & Keuangan) khusus bagian Keuangan (modules/finance/finance-intelligence.js).
//
// Target: FinanceIntelligence._isTxAccountSelf() (helper baru, reuse
// OwnershipEngine) & incomeVsExpense() (SATU syarat filter tambahan di atas
// filter tanggal yang sudah ada — lihat tests/finance-intelligence-cache.test.js
// utk regresi cache yang WAJIB tetap PASS apa adanya).
//
// RULE yang dites di sini: transaksi milik akun INVESTOR/CUSTOMER/THIRD_PARTY/
// FAMILY TIDAK ikut dijumlah ke Total Keuangan (income/expense/net), tapi
// D.transactions sendiri TIDAK dihapus/diubah (histori tetap tersimpan penuh).
// healthScore()/insights() ikut ke-exclude otomatis krn keduanya turunan dari
// incomeVsExpense() (0 perubahan tambahan di kedua fungsi itu).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const TODAY = new Date().toISOString().slice(0, 10);

function makeD() {
  return {
    accounts: [
      { id: 'a1', name: 'Kas Pribadi', includeInBalance: true }, // default SELF
      { id: 'a2', name: 'Modal Investor', includeInBalance: true, ownership: 'INVESTOR' },
      { id: 'a3', name: 'Dana Customer', includeInBalance: true, ownership: 'customer' },
    ],
    transactions: [
      { accountId: 'a1', type: 'income', amount: 1000000, date: TODAY },
      { accountId: 'a1', type: 'expense', amount: 300000, date: TODAY },
      { accountId: 'a2', type: 'income', amount: 5000000, date: TODAY }, // milik INVESTOR, harus di-exclude
      { accountId: 'a3', type: 'expense', amount: 2000000, date: TODAY }, // milik CUSTOMER, harus di-exclude
    ],
    bills: [],
    budgets: [],
    assets: [],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/finance/akun.js', 'modules/finance/tx-list-cashflow.js', 'modules/finance/finance-intelligence.js'],
    { D, curMonth: new Date().getMonth(), curYear: new Date().getFullYear() },
    ['FinanceIntelligence', 'OwnershipEngine']
  );
}

test('_isTxAccountSelf() — transaksi akun tanpa ownership (default SELF) -> true', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.FinanceIntelligence._isTxAccountSelf(D.transactions[0]), true);
});

test('_isTxAccountSelf() — transaksi akun INVESTOR/CUSTOMER -> false', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.FinanceIntelligence._isTxAccountSelf(D.transactions[2]), false);
  assert.equal(ctx.FinanceIntelligence._isTxAccountSelf(D.transactions[3]), false);
});

test('_isTxAccountSelf() — toleran: tanpa accountId atau akun tidak ditemukan -> true (tidak exclude)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.FinanceIntelligence._isTxAccountSelf({ type: 'income', amount: 1, date: TODAY }), true);
  assert.equal(ctx.FinanceIntelligence._isTxAccountSelf({ accountId: 'tidak_ada', type: 'income', amount: 1, date: TODAY }), true);
});

test('incomeVsExpense() — HANYA transaksi akun SELF yang dijumlah (akun INVESTOR/CUSTOMER dikecualikan)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const res = ctx.FinanceIntelligence.incomeVsExpense();
  assert.equal(res.income, 1000000, 'income 5jt dari akun INVESTOR harus dikecualikan');
  assert.equal(res.expense, 300000, 'expense 2jt dari akun CUSTOMER harus dikecualikan');
  assert.equal(res.net, 700000);
  assert.equal(res.txCount, 2, 'txCount cuma hitung transaksi SELF yang lolos filter');
});

test('incomeVsExpense() — D.transactions ASLI TIDAK berubah (histori/transaksi non-SELF tetap tersimpan penuh)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.FinanceIntelligence.incomeVsExpense();
  assert.equal(D.transactions.length, 4, 'tidak ada transaksi yang dihapus/dimutasi');
});

test('healthScore() — savings score ikut turunan dari incomeVsExpense() yg sudah difilter ownership', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const hs = ctx.FinanceIntelligence.healthScore();
  const savingsPart = hs.parts.find((p) => p.key === 'savings');
  // savingsRate = net(700000)/income(1000000) = 0.7 -> score = 0.7*25 = 17.5
  assert.equal(savingsPart.score, 17.5);
});

test('incomeVsExpense() — range eksplisit tetap ikut filter ownership (bypass cache TAPI filter tetap jalan)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const range = { from: new Date(new Date().getFullYear(), 0, 1), to: new Date(new Date().getFullYear(), 11, 31) };
  const res = ctx.FinanceIntelligence.incomeVsExpense(range);
  assert.equal(res.income, 1000000);
  assert.equal(res.expense, 300000);
});

test('incomeVsExpense() — kalau OwnershipEngine tidak dimuat, fallback hitung semua transaksi (regresi lama tetap jalan)', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/finance/akun.js', 'modules/finance/tx-list-cashflow.js', 'modules/finance/finance-intelligence.js'],
    { D, curMonth: new Date().getMonth(), curYear: new Date().getFullYear() },
    ['FinanceIntelligence']
  );
  const res = ctx.FinanceIntelligence.incomeVsExpense();
  assert.equal(res.income, 1000000 + 5000000);
  assert.equal(res.expense, 300000 + 2000000);
});
