'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeContext() {
  const today = new Date().toISOString().slice(0, 10);
  const D = {
    accounts: [
      { id: 'self', ownership: 'SELF' },
      { id: 'external', ownership: 'INVESTOR' },
    ],
    transactions: [
      { id: '1', accountId: 'self', type: 'income', amount: 10, date: today },
      { id: '2', accountId: 'self', type: 'expense', amount: 3, date: today },
      { id: '3', accountId: 'external', type: 'income', amount: 100, date: today },
      { id: '4', accountId: 'external', type: 'expense', amount: 20, date: today },
    ],
    budgets: [], bills: [], assets: [],
  };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/finance/akun.js', 'modules/finance/tx-list-cashflow.js', 'modules/finance/finance-intelligence.js'],
    { D, curMonth: new Date().getMonth(), curYear: new Date().getFullYear() },
    ['FinanceIntelligence', 'OwnershipEngine']
  );
  return { ctx, D };
}

test('incomeVsExpense resolves ownership once per account per aggregation and preserves totals', () => {
  const { ctx } = makeContext();
  const original = ctx.OwnershipEngine.resolve;
  let calls = 0;
  ctx.OwnershipEngine.resolve = function (account) { calls++; return original.call(this, account); };
  const result = ctx.FinanceIntelligence.incomeVsExpense({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date(new Date().getFullYear(), 11, 31),
  });
  assert.equal(calls, 2);
  assert.equal(result.income, 10);
  assert.equal(result.expense, 3);
  assert.equal(result.net, 7);
  assert.equal(result.txCount, 2);
});

test('ownership resolution cache is per call, so an ownership edit is reflected immediately', () => {
  const { ctx, D } = makeContext();
  const range = { from: new Date(new Date().getFullYear(), 0, 1), to: new Date(new Date().getFullYear(), 11, 31) };
  assert.equal(ctx.FinanceIntelligence.incomeVsExpense(range).income, 10);
  D.accounts.find((account) => account.id === 'external').ownership = 'SELF';
  assert.equal(ctx.FinanceIntelligence.incomeVsExpense(range).income, 110);
});
