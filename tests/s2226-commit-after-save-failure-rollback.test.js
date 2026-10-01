'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

function load() {
  const c = {
    console,
    D: { transactions: [{ id: 'base' }], debts: [], piutang: [] },
    AIBus: { emit: () => {} },
    FinanceEventOutbox: {
      staged: [],
      stageBatch(items) { this.staged.push(...items); return true; },
      discardStaged(n) { this.staged.splice(Math.max(0, this.staged.length - n), n); return true; },
    },
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync('modules/finance/finance-cross-entity-atomic.js', 'utf8'), c);
  return c;
}

test('S2226 commit-after-save failure restores state and discards staged events', () => {
  const c = load();
  const tx = c.FinanceCrossEntityAtomic.begin(['transactions', 'debts', 'piutang']);
  c.D.transactions.push({ id: 'new' });
  tx.emit('finance.updated', { id: 'new' });
  tx.commit();
  assert.equal(c.D.transactions.length, 2);
  assert.equal(c.FinanceEventOutbox.staged.length, 1);
  assert.equal(tx.rollbackAfterCommit(), true);
  assert.equal(JSON.stringify(c.D.transactions), JSON.stringify([{ id: 'base' }]));
  assert.equal(c.FinanceEventOutbox.staged.length, 0);
  assert.equal(tx.rollbackAfterCommit(), false);
});

test('S2226 production commit-before-save callers expose post-commit rollback path', () => {
  const tag = fs.readFileSync('modules/finance/tagihan-kalender.js', 'utf8');
  const tit = fs.readFileSync('modules/finance/titipan-expense-flow.js', 'utf8');
  const del = fs.readFileSync('modules/finance/tx-list-cashflow.js', 'utf8');
  for (const src of [tag, tit, del]) {
    assert.match(src, /rollbackAfterCommit/);
  }
});

console.log('S2226 commit-after-save rollback: PASS');
