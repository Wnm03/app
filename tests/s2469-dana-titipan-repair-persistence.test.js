'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

test('S2469. Titipan repair functions rollback their mutated domain on save() rejection', () => {
  const src = fs.readFileSync('modules/finance/titipan-reconcile.js','utf8');
  assert.match(src, /repairOwnerIdConsistency\(\)\s*\{[\s\S]*?_repairSnapshot/);
  assert.match(src, /D\.assets = JSON\.parse\(_repairSnapshot\.assets\)/);
  assert.match(src, /D\.investments = JSON\.parse\(_repairSnapshot\.investments\)/);
  assert.match(src, /D\.debts = JSON\.parse\(_repairSnapshot\.debts\)/);
  assert.match(src, /repairDebtNameStaleness\(\)\s*\{[\s\S]*?const _repairSnapshot = JSON\.stringify\(D\.debts\)/);
  assert.match(src, /repairTransactionOwnerRefs\(\)\s*\{[\s\S]*?const _repairSnapshot = JSON\.stringify\(D\.transactions\)/);
  assert.match(src, /D\.transactions = JSON\.parse\(_repairSnapshot\)/);
  assert.match(src, /code: 'PERSISTENCE_FAILED'/);
});

test('S2469. TitipanExpenseFlow treats save() === false as atomic failure', () => {
  const src = fs.readFileSync('modules/finance/titipan-expense-flow.js','utf8');
  assert.match(src, /const persisted = save\(\);/);
  assert.match(src, /if \(persisted === false\)/);
  assert.match(src, /rollbackAfterCommit/);
  assert.match(src, /code: 'PERSISTENCE_FAILED'/);
});
