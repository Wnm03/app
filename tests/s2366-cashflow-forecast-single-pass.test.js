'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

function makeContext(transactions) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const D = { transactions, accounts: [], bills: [] };
  const ctx = loadSource(['modules/finance/tx-list-cashflow.js'], {
    D,
    BudgetReko: { monthsAvailable: () => 3, effectiveMonths: () => 3, rangeFrom: () => from },
    CashflowProjSettings: { get: () => ({}) },
    totalSaldoAkun: () => 1000,
    curMonth: now.getMonth(),
    curYear: now.getFullYear(),
  });
  return { ctx, D, from };
}

function dateInCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 1)).toISOString().slice(0, 10);
}

test('S2366 forecast single-pass preserves account, hitungKas, and transaction-type filtering', () => {
  const date = dateInCurrentMonth();
  const { ctx } = makeContext([
    { type: 'income', amount: 300, date, accountId: 'a' },
    { type: 'expense', amount: 90, date, accountId: 'a' },
    { type: 'income', amount: 600, date, accountId: 'b' },
    { type: 'income', amount: 9999, date, accountId: 'a', hitungKas: false },
    { type: 'transfer', amount: 700, date, accountId: 'a' },
  ]);
  const result = ctx.computeCashflowForecast({ months: 3, accountId: 'a' });
  assert.equal(result.incAvg, 100);
  assert.equal(result.expAvg, 30);
  assert.equal(result.projected, 1070);
});

test('S2366 forecast with accountId="semua" keeps all eligible accounts', () => {
  const date = dateInCurrentMonth();
  const { ctx } = makeContext([
    { type: 'income', amount: 300, date, accountId: 'a' },
    { type: 'income', amount: 600, date, accountId: 'b' },
    { type: 'expense', amount: 90, date, accountId: 'b' },
  ]);
  const result = ctx.computeCashflowForecast({ months: 3, accountId: 'semua' });
  assert.equal(result.incAvg, 300);
  assert.equal(result.expAvg, 30);
});

test('S2366 aggregation block has one transaction loop and no repeated array filters', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'modules/finance/tx-list-cashflow.js'), 'utf8');
  const start = source.indexOf('// S2366: satu pass transaksi');
  const end = source.indexOf('const saldoNow=', start);
  assert.ok(start >= 0 && end > start, 'S2366 aggregation boundary must exist');
  const block = source.slice(start, end);
  assert.equal((block.match(/for\s*\(/g) || []).length, 1);
  assert.doesNotMatch(block, /\.filter\s*\(/);
});
