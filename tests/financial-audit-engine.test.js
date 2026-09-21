// tests/financial-audit-engine.test.js — Phase A Audit Keuangan 30 Menit.
// Menguji engine source langsung; tidak ada DOM dan tidak ada persistence.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(transactions = [], extra = {}) {
  const D = {
    transactions,
    accounts: [
      { id: 'a1', name: 'Kas', ownership: 'SELF' },
      { id: 'a2', name: 'Pihak lain', ownership: 'FAMILY' },
    ],
  };
  return loadSource(
    ['modules/finance/financial-audit-engine.js'],
    { D, ...extra },
    ['FinancialAuditEngine']
  );
}

const range = { from: '2026-09-01', to: '2026-09-30' };

test('summary() memisahkan income/expense, menghormati hitungKas dan ownership', () => {
  const ctx = makeCtx([
    { id: 'i1', accountId: 'a1', type: 'income', amount: 1000000, date: '2026-09-10' },
    { id: 'e1', accountId: 'a1', type: 'expense', amount: 250000, date: '2026-09-11' },
    { id: 'e2', accountId: 'a1', type: 'expense', amount: 900000, date: '2026-09-12', hitungKas: false },
    { id: 'e3', accountId: 'a2', type: 'expense', amount: 800000, date: '2026-09-13' },
    { id: 't1', accountId: 'a1', type: 'transfer_in', amount: 700000, date: '2026-09-14' },
  ], {
    FinanceIntelligence: {
      _isTxAccountSelf(t, accountMap) {
        const acc = accountMap.get(t.accountId);
        return !acc || acc.ownership === 'SELF';
      },
    },
  });
  const out = ctx.FinancialAuditEngine.summary(range);
  assert.equal(out.income, 1000000);
  assert.equal(out.expense, 250000);
  assert.equal(out.txCount, 2);
});

test('topCategories() mengagregasi total kategori, bukan transaksi tunggal', () => {
  const ctx = makeCtx([
    { accountId: 'a1', type: 'expense', amount: 100000, category: 'Makan', date: '2026-09-01' },
    { accountId: 'a1', type: 'expense', amount: 150000, category: 'Makan', date: '2026-09-02' },
    { accountId: 'a1', type: 'expense', amount: 200000, category: 'Transportasi', date: '2026-09-03' },
    { accountId: 'a1', type: 'expense', amount: 50000, category: '', date: '2026-09-04' },
  ]);
  const out = ctx.FinancialAuditEngine.topCategories(range, 3);
  assert.deepEqual(out.map(x => x.category), ['Makan', 'Transportasi', 'Perlu ditinjau']);
  assert.equal(out[0].amount, 250000);
  assert.equal(out[0].count, 2);
});

test('smallLeakages() memakai ambang transparan dan minimum jumlah transaksi', () => {
  const ctx = makeCtx([
    { accountId: 'a1', type: 'expense', amount: 10000, date: '2026-09-01' },
    { accountId: 'a1', type: 'expense', amount: 20000, date: '2026-09-02' },
    { accountId: 'a1', type: 'expense', amount: 50000, date: '2026-09-03' },
    { accountId: 'a1', type: 'expense', amount: 60000, date: '2026-09-04' },
  ]);
  const out = ctx.FinancialAuditEngine.smallLeakages(range, { maxAmount: 50000, minCount: 3 });
  assert.equal(out.count, 3);
  assert.equal(out.total, 80000);
  assert.equal(out.qualifies, true);
});

test('dataQuality() menangani periode kosong, tanggal invalid, nol, dan kategori kosong', () => {
  const ctx = makeCtx([
    { accountId: 'a1', type: 'expense', amount: 0, category: '', date: '2026-09-01' },
    { accountId: 'a1', type: 'expense', amount: 10000, category: '', date: 'tanggal-rusak' },
    { accountId: 'a1', type: 'expense', amount: 10000, category: 'Makan', date: '2026-09-31' },
  ]);
  const out = ctx.FinancialAuditEngine.dataQuality(range);
  assert.equal(out.totalRecords, 3);
  assert.equal(out.invalidDateCount, 2);
  assert.equal(out.uncategorizedCount, 1);
  assert.equal(out.eligibleCount, 1);
  assert.equal(out.hasData, true);
  assert.equal(out.complete, false);
});

test('invalid explicit range tidak meledak dan tetap read-only', () => {
  const tx = [{ id: 'e1', accountId: 'a1', type: 'expense', amount: 100, date: '2026-09-01' }];
  const ctx = makeCtx(tx);
  const before = JSON.stringify(tx);
  const out = ctx.FinancialAuditEngine.summary({ from: 'bad', to: 'bad' });
  assert.equal(out.txCount, 0);
  assert.equal(JSON.stringify(tx), before);
});

test('comparison() membandingkan periode dengan panjang yang sama tanpa mengubah transaksi', () => {
  const ctx = makeCtx([
    { accountId: 'a1', type: 'expense', amount: 100000, date: '2026-08-15', category: 'Makan' },
    { accountId: 'a1', type: 'expense', amount: 150000, date: '2026-09-01', category: 'Makan' },
  ]);
  const before = JSON.stringify(ctx.D.transactions);
  const out = ctx.FinancialAuditEngine.comparison({ from: '2026-09-01', to: '2026-09-30' });
  assert.equal(out.current.expense, 150000);
  assert.equal(out.previous.expense, 100000);
  assert.equal(out.expense.amount, 50000);
  assert.equal(JSON.stringify(ctx.D.transactions), before);
});

test('recurringCandidates() mendeteksi pola bulanan tanpa menganggapnya langganan', () => {
  const ctx = makeCtx([
    { id: 'r1', accountId: 'a1', type: 'expense', amount: 120000, date: '2026-07-05', note: 'Internet rumah', category: 'Tagihan' },
    { id: 'r2', accountId: 'a1', type: 'expense', amount: 125000, date: '2026-08-05', note: 'Internet rumah', category: 'Tagihan' },
    { id: 'r3', accountId: 'a1', type: 'expense', amount: 122000, date: '2026-09-05', note: 'Internet rumah', category: 'Tagihan' },
    { id: 'x1', accountId: 'a1', type: 'expense', amount: 500000, date: '2026-09-06', note: 'Belanja acak', category: 'Belanja' },
  ]);
  const out = ctx.FinancialAuditEngine.recurringCandidates({ from: '2026-07-01', to: '2026-09-30' });
  assert.equal(out.length, 1);
  assert.equal(out[0].occurrences, 3);
  assert.equal(out[0].monthlyLike, true);
  assert.match(out[0].note, /belum dianggap langganan/i);
});

test('duplicateDiagnostics() mengembalikan grup ID, bisnis, near-duplicate dan dampak nominal', () => {
  const ctx = makeCtx([
    { id: 'd1', accountId: 'a1', type: 'expense', amount: 100000, date: '2026-09-01', category: 'Makan', note: 'Lunch' },
    { id: 'd2', accountId: 'a1', type: 'expense', amount: 100000, date: '2026-09-01', category: 'Makan', note: 'Lunch' },
    { id: 'd3', accountId: 'a1', type: 'expense', amount: 100000, date: '2026-09-01', category: 'Makan', note: 'Dinner' },
    { id: 'd3', accountId: 'a1', type: 'expense', amount: 50000, date: '2026-09-02', category: 'Makan', note: 'Snack' },
  ]);
  const out = ctx.FinancialAuditEngine.duplicateDiagnostics(range);
  assert.equal(out.exactIdDuplicateCount, 1);
  assert.equal(out.exactBusinessDuplicateCount, 1);
  assert.equal(out.nearDuplicateGroupCount, 1);
  assert.equal(out.impactedAmountByType.expense, 350000);
  assert.ok(out.warnings.length >= 2);
});

test('expenseGroups() tidak menebak kategori: tanpa mapping semuanya tetap Perlu ditinjau', () => {
  const ctx = makeCtx([
    { accountId: 'a1', type: 'expense', amount: 100000, date: '2026-09-01', category: 'Makan' },
    { accountId: 'a1', type: 'expense', amount: 50000, date: '2026-09-02', category: 'Investasi' },
  ]);
  const out = ctx.FinancialAuditEngine.expenseGroups(range, { categoryMap: {} });
  const review = out.find(x => x.group === 'Perlu ditinjau');
  assert.equal(review.amount, 150000);
  assert.equal(review.count, 2);
  assert.equal(out.find(x => x.group === 'Kebutuhan').amount, 0);
});

test('expenseGroups() memakai mapping eksplisit pengguna dan menjaga total', () => {
  const ctx = makeCtx([
    { accountId: 'a1', type: 'expense', amount: 100000, date: '2026-09-01', category: 'Makan' },
    { accountId: 'a1', type: 'expense', amount: 50000, date: '2026-09-02', category: 'Investasi' },
    { accountId: 'a1', type: 'expense', amount: 25000, date: '2026-09-03', category: 'Hiburan' },
  ]);
  const out = ctx.FinancialAuditEngine.expenseGroups(range, { categoryMap: { Makan: 'Kebutuhan', Investasi: 'Masa depan', Hiburan: 'Keinginan' } });
  assert.equal(out.find(x => x.group === 'Kebutuhan').amount, 100000);
  assert.equal(out.find(x => x.group === 'Masa depan').amount, 50000);
  assert.equal(out.find(x => x.group === 'Keinginan').amount, 25000);
  assert.equal(out.reduce((n, x) => n + x.amount, 0), 175000);
});

test('dataQuality() memasukkan diagnosis duplicate tanpa mengubah transaksi', () => {
  const tx = [
    { id: 'q1', accountId: 'a1', type: 'expense', amount: 10000, date: '2026-09-01', category: 'Makan' },
    { id: 'q2', accountId: 'a1', type: 'expense', amount: 10000, date: '2026-09-01', category: 'Makan' },
  ];
  const ctx = makeCtx(tx);
  const before = JSON.stringify(tx);
  const out = ctx.FinancialAuditEngine.dataQuality(range);
  assert.equal(out.duplicateBusinessCount, 1);
  assert.ok(out.warnings.some(x => /data bisnis identik/i.test(x)));
  assert.equal(JSON.stringify(tx), before);
});

test('audit() berbagi eligibility scan dan tidak mengulang pemindaian periode aktif', () => {
  const ctx = makeCtx([
    { id: 'e1', accountId: 'a1', type: 'expense', amount: 100000, date: '2026-09-01', category: 'Makan' },
    { id: 'e2', accountId: 'a1', type: 'expense', amount: 50000, date: '2026-09-02', category: 'Transportasi' },
  ]);
  const engine = ctx.FinancialAuditEngine;
  const original = engine._eligibleTransactions;
  let calls = 0;
  engine._eligibleTransactions = function (...args) {
    calls++;
    return original.apply(this, args);
  };
  try {
    const out = engine.audit(range);
    assert.equal(out.summary.expense, 150000);
    // One scan for the current period + one scan for the comparison period.
    assert.equal(calls, 2);
  } finally {
    engine._eligibleTransactions = original;
  }
});

test('dashboardInsight() tidak menjalankan analisis full-audit yang tidak ditampilkan di Hub', () => {
  const ctx = makeCtx([
    { id: 'e1', accountId: 'a1', type: 'expense', amount: 100000, date: '2026-09-01', category: 'Makan' },
  ]);
  const engine = ctx.FinancialAuditEngine;
  let recurringCalls = 0;
  let groupCalls = 0;
  const recurring = engine.recurringCandidates;
  const groups = engine.expenseGroups;
  engine.recurringCandidates = (...args) => { recurringCalls++; return recurring.apply(engine, args); };
  engine.expenseGroups = (...args) => { groupCalls++; return groups.apply(engine, args); };
  try {
    const out = engine.dashboardInsight(range);
    assert.equal(out.summary.expense, 100000);
    assert.equal(recurringCalls, 0);
    assert.equal(groupCalls, 0);
  } finally {
    engine.recurringCandidates = recurring;
    engine.expenseGroups = groups;
  }
});
