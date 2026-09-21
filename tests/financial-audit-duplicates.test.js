// tests/financial-audit-duplicates.test.js — Diagnostic duplikasi transaksi.
// Fokus: mendeteksi data ganda dan mengukur dampaknya ke seluruh fitur Audit Keuangan 30 Menit.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const range = { from: '2026-09-01', to: '2026-09-30' };

function makeCtx(transactions = [], extra = {}) {
  const D = {
    transactions,
    accounts: [{ id: 'a1', name: 'Kas', ownership: 'SELF' }],
    financeAuditAnnotations: [],
  };
  return loadSource(
    [
      'modules/finance/financial-audit-engine.js',
      'modules/finance/financial-audit-annotations.js',
    ],
    { D, save: () => {}, ...extra },
    ['FinancialAuditEngine', 'FinancialAuditAnnotations']
  );
}

function canonicalBusinessKey(tx) {
  // ID sengaja dikeluarkan: dua record berbeda ID tetapi isi bisnis identik
  // tetap dianggap kandidat duplikasi pasti.
  return JSON.stringify([
    String(tx.accountId || ''),
    String(tx.type || ''),
    String(tx.date || '').slice(0, 10),
    Number(tx.amount),
    String(tx.category || '').trim().toLowerCase(),
    String(tx.subcategory || '').trim().toLowerCase(),
    String(tx.note || '').trim().toLowerCase(),
    tx.hitungKas === false ? false : true,
  ]);
}

function diagnoseDuplicates(transactions) {
  const rows = Array.isArray(transactions) ? transactions : [];
  const byId = new Map();
  const byBusiness = new Map();
  const near = new Map();

  rows.forEach((tx, index) => {
    const id = String(tx && tx.id != null ? tx.id : '').trim();
    if (id) {
      const bucket = byId.get(id) || [];
      bucket.push(index);
      byId.set(id, bucket);
    }

    const businessKey = canonicalBusinessKey(tx || {});
    const businessBucket = byBusiness.get(businessKey) || [];
    businessBucket.push(index);
    byBusiness.set(businessKey, businessBucket);

    // Near-duplicate: akun + tipe + tanggal + nominal sama, tetapi detail lain berbeda.
    const nearKey = JSON.stringify([
      String(tx && tx.accountId || ''),
      String(tx && tx.type || ''),
      String(tx && tx.date || '').slice(0, 10),
      Number(tx && tx.amount),
    ]);
    const nearBucket = near.get(nearKey) || [];
    nearBucket.push(index);
    near.set(nearKey, nearBucket);
  });

  const exactIdGroups = [...byId.entries()]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([id, indexes]) => ({ id, indexes }));

  const exactBusinessGroups = [...byBusiness.entries()]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([key, indexes]) => ({ key, indexes }));

  const nearGroups = [...near.entries()]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([key, indexes]) => ({ key, indexes }))
    .filter((group) => !exactBusinessGroups.some((exact) =>
      exact.indexes.length === group.indexes.length &&
      exact.indexes.every((i) => group.indexes.includes(i))
    ));

  return {
    totalRecords: rows.length,
    exactIdGroups,
    exactBusinessGroups,
    nearGroups,
    exactIdDuplicateCount: exactIdGroups.reduce((n, g) => n + g.indexes.length - 1, 0),
    exactBusinessDuplicateCount: exactBusinessGroups.reduce((n, g) => n + g.indexes.length - 1, 0),
    nearDuplicateGroupCount: nearGroups.length,
  };
}

function baseTransactions() {
  return [
    { id: 'm1', accountId: 'a1', type: 'expense', amount: 100000, date: '2026-09-01', category: 'Makan', note: 'Lunch kantor' },
    { id: 'm2', accountId: 'a1', type: 'expense', amount: 150000, date: '2026-09-05', category: 'Transportasi', note: 'Bensin' },
    { id: 'm3', accountId: 'a1', type: 'income', amount: 1000000, date: '2026-09-10', category: 'Gaji', note: 'Gaji' },
    { id: 'm4', accountId: 'a1', type: 'expense', amount: 20000, date: '2026-09-11', category: 'Jajan', note: 'Kopi' },
    { id: 'm5', accountId: 'a1', type: 'expense', amount: 25000, date: '2026-09-12', category: 'Jajan', note: 'Snack' },
    { id: 'm6', accountId: 'a1', type: 'expense', amount: 30000, date: '2026-09-13', category: 'Jajan', note: 'Minum' },
    { id: 'r1', accountId: 'a1', type: 'expense', amount: 120000, date: '2026-09-02', category: 'Tagihan', note: 'Internet rumah' },
    { id: 'r2', accountId: 'a1', type: 'expense', amount: 122000, date: '2026-09-09', category: 'Tagihan', note: 'Internet rumah' },
  ];
}

test('diagnostic: mendeteksi duplicate ID dan duplicate bisnis tanpa false-positive dari transaksi mirip', () => {
  const tx = baseTransactions();
  tx.push({ ...tx[0] }); // exact duplicate, ID sama
  tx.push({ ...tx[1], id: 'm2-copy' }); // exact duplicate, ID berbeda
  tx.push({ ...tx[2], id: 'income-similar', note: 'Gaji September' }); // near, bukan exact business

  const report = diagnoseDuplicates(tx);

  assert.equal(report.totalRecords, 11);
  assert.equal(report.exactIdDuplicateCount, 1);
  assert.equal(report.exactBusinessDuplicateCount, 2);
  assert.equal(report.nearDuplicateGroupCount, 1);
});

test('diagnostic: duplicate tidak boleh lolos diam-diam pada summary dan tercatat sebagai dampak', () => {
  const unique = baseTransactions();
  const duplicated = [...unique, { ...unique[0], id: 'm1-copy' }];
  const uniqueCtx = makeCtx(unique);
  const dupCtx = makeCtx(duplicated);
  const report = diagnoseDuplicates(duplicated);

  const a = uniqueCtx.FinancialAuditEngine.summary(range);
  const b = dupCtx.FinancialAuditEngine.summary(range);

  assert.equal(report.exactBusinessDuplicateCount, 1);
  assert.equal(b.expense - a.expense, 100000);
  assert.equal(b.txCount - a.txCount, 1);
  assert.equal(JSON.stringify(duplicated), JSON.stringify(dupCtx.D.transactions));
});

test('diagnostic: duplicate berdampak ke Top 3 kategori', () => {
  const unique = baseTransactions();
  const duplicated = [...unique, { ...unique[0], id: 'm1-copy' }];
  const a = makeCtx(unique).FinancialAuditEngine.topCategories(range, 3);
  const b = makeCtx(duplicated).FinancialAuditEngine.topCategories(range, 3);
  const makanA = a.find((x) => x.category === 'Makan');
  const makanB = b.find((x) => x.category === 'Makan');

  assert.equal(makanA.amount, 100000);
  assert.equal(makanB.amount, 200000);
  assert.equal(makanB.count, 2);
});

test('diagnostic: duplicate transaksi kecil menggandakan leakage dan tetap terdeteksi', () => {
  const unique = baseTransactions();
  const duplicated = [...unique, { ...unique[3], id: 'm4-copy' }];
  const a = makeCtx(unique).FinancialAuditEngine.smallLeakages(range, { maxAmount: 50000, minCount: 3 });
  const b = makeCtx(duplicated).FinancialAuditEngine.smallLeakages(range, { maxAmount: 50000, minCount: 3 });

  assert.equal(a.count, 3);
  assert.equal(a.total, 75000);
  assert.equal(b.count, 4);
  assert.equal(b.total, 95000);
});

test('diagnostic: duplicate recurring transaction menaikkan occurrence dan harus masuk pemeriksaan data', () => {
  const unique = [
    { id: 'r1', accountId: 'a1', type: 'expense', amount: 120000, date: '2026-07-02', category: 'Tagihan', note: 'Internet rumah' },
    { id: 'r2', accountId: 'a1', type: 'expense', amount: 122000, date: '2026-08-02', category: 'Tagihan', note: 'Internet rumah' },
    { id: 'r3', accountId: 'a1', type: 'expense', amount: 121000, date: '2026-09-02', category: 'Tagihan', note: 'Internet rumah' },
  ];
  const duplicated = [...unique, { ...unique[2], id: 'r3-copy' }];
  const a = makeCtx(unique).FinancialAuditEngine.recurringCandidates({ from: '2026-07-01', to: '2026-09-30' });
  const b = makeCtx(duplicated).FinancialAuditEngine.recurringCandidates({ from: '2026-07-01', to: '2026-09-30' });
  const report = diagnoseDuplicates(duplicated);

  assert.equal(report.exactBusinessDuplicateCount, 1);
  assert.equal(a[0].occurrences, 3);
  assert.equal(b[0].occurrences, 4);
  assert.ok(b[0].txIds.includes('r3-copy'));
});

test('diagnostic: duplicate pada periode berjalan tidak boleh mengubah hasil comparison secara diam-diam', () => {
  const unique = [
    { id: 'p1', accountId: 'a1', type: 'expense', amount: 100000, date: '2026-08-15', category: 'Makan', note: 'Makan' },
    { id: 'p2', accountId: 'a1', type: 'expense', amount: 150000, date: '2026-09-15', category: 'Makan', note: 'Makan' },
  ];
  const duplicated = [...unique, { ...unique[1], id: 'p2-copy' }];
  const a = makeCtx(unique).FinancialAuditEngine.comparison(range);
  const b = makeCtx(duplicated).FinancialAuditEngine.comparison(range);
  const report = diagnoseDuplicates(duplicated);

  assert.equal(report.exactBusinessDuplicateCount, 1);
  assert.equal(a.current.expense, 150000);
  assert.equal(b.current.expense, 300000);
  assert.equal(b.expense.amount - a.expense.amount, 150000);
});

test('diagnostic: audit() menggabungkan semua dampak duplicate dalam satu snapshot', () => {
  const tx = baseTransactions();
  tx.push({ ...tx[0], id: 'm1-copy' });
  tx.push({ ...tx[3], id: 'm4-copy' });
  const ctx = makeCtx(tx);
  const report = diagnoseDuplicates(tx);
  const out = ctx.FinancialAuditEngine.audit(range, {
    topLimit: 3,
    maxSmallAmount: 50000,
    minSmallCount: 3,
  });

  assert.equal(report.exactBusinessDuplicateCount, 2);
  assert.equal(out.summary.expense, 687000);
  assert.equal(out.topCategories.find((x) => x.category === 'Makan').amount, 200000);
  assert.equal(out.smallLeakages.count, 4);
  assert.equal(out.smallLeakages.total, 95000);
});

test('diagnostic: anotasi dan rencana tidak boleh menggandakan transaksi', () => {
  const tx = [{ id: 'm1', accountId: 'a1', type: 'expense', amount: 100000, date: '2026-09-01', category: 'Makan', note: 'Lunch' }];
  const ctx = makeCtx([...tx, { ...tx[0], id: 'm1-copy' }]);
  const before = ctx.D.transactions.length;

  const ann = ctx.FinancialAuditAnnotations.upsertTransaction('m1', {
    reviewFlag: true,
    trigger: 'promo',
    note: 'Perlu dievaluasi',
  });
  const plan = ctx.FinancialAuditAnnotations.savePlan('review_category', {
    title: 'Tinjau kategori makan',
    category: 'Makan',
  });

  assert.equal(ann.ok, true);
  assert.equal(plan.ok, true);
  assert.equal(ctx.D.transactions.length, before);
  assert.equal(ctx.FinancialAuditAnnotations.list().length, 2);
});

test('diagnostic: data unik yang hanya mirip tidak diberi label duplicate pasti', () => {
  const tx = [
    { id: 'a', accountId: 'a1', type: 'expense', amount: 100000, date: '2026-09-01', category: 'Makan', note: 'Lunch A' },
    { id: 'b', accountId: 'a1', type: 'expense', amount: 100000, date: '2026-09-01', category: 'Makan', note: 'Lunch B' },
  ];
  const report = diagnoseDuplicates(tx);
  assert.equal(report.exactIdDuplicateCount, 0);
  assert.equal(report.exactBusinessDuplicateCount, 0);
  assert.equal(report.nearDuplicateGroupCount, 1);
});
