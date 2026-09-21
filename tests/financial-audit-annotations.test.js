'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

test('annotations menyimpan flag/pemicu terpisah dari transaksi', () => {
  const transactions = [{ id: 'tx1', type: 'expense', amount: 10000 }];
  const D = { transactions, financeAuditAnnotations: [] };
  const ctx = loadSource(['modules/finance/financial-audit-annotations.js'], {
    D,
    save() {},
  }, ['FinancialAuditAnnotations']);
  const before = JSON.stringify(transactions);
  const out = ctx.FinancialAuditAnnotations.upsertTransaction('tx1', { reviewFlag: true, trigger: 'promo', note: 'Evaluasi sebelum beli lagi' });
  assert.equal(out.ok, true);
  assert.equal(ctx.FinancialAuditAnnotations.forTransaction('tx1').trigger, 'promo');
  assert.equal(JSON.stringify(transactions), before);
});

test('savePlan dan completePlan menjaga satu rencana aktif tanpa transaksi otomatis', () => {
  const transactions = [{ id: 'tx1', type: 'expense', amount: 10000 }];
  const D = { transactions, financeAuditAnnotations: [] };
  const ctx = loadSource(['modules/finance/financial-audit-annotations.js'], { D, save() {} }, ['FinancialAuditAnnotations']);
  const plan = ctx.FinancialAuditAnnotations.savePlan('small_leak', { title: 'Pantau transaksi kecil', target: 'Maksimal Rp500.000', note: 'Review mingguan' });
  assert.equal(plan.ok, true);
  assert.equal(ctx.FinancialAuditAnnotations.activePlan().action, 'small_leak');
  const done = ctx.FinancialAuditAnnotations.completePlan();
  assert.equal(done.ok, true);
  assert.equal(ctx.FinancialAuditAnnotations.activePlan(), null);
  assert.deepEqual(transactions, [{ id: 'tx1', type: 'expense', amount: 10000 }]);
});

test('settings kategori audit tersimpan terpisah dan tidak menyentuh transaksi', () => {
  const transactions = [{ id: 'tx1', type: 'expense', amount: 10000 }];
  const D = { transactions, financeAuditAnnotations: [] };
  const ctx = loadSource(['modules/finance/financial-audit-annotations.js'], { D, save() {} }, ['FinancialAuditAnnotations']);
  const before = JSON.stringify(transactions);
  const out = ctx.FinancialAuditAnnotations.setCategoryGroup('Makan', 'Kebutuhan');
  assert.equal(out.ok, true);
  assert.equal(ctx.FinancialAuditAnnotations.settings().expenseGroupMap.Makan, 'Kebutuhan');
  assert.equal(JSON.stringify(transactions), before);
});
