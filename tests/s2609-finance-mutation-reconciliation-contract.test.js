'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('S2609: editing bill-payment history reuses the single canonical synchronizer', () => {
  const bills = read('modules/finance/tagihan-kalender.js');
  assert.match(bills, /function applyBillPaymentTxSync\(t,tanggal,jumlah,catatan\)/);
  const start = bills.indexOf('function saveBillHistoryEdit()');
  const end = bills.indexOf('\n}', start) + 2;
  assert.ok(start >= 0 && end > start);
  const fn = bills.slice(start, end);
  assert.match(fn, /applyBillPaymentTxSync\(t,tanggal,jumlah,catatan\)/);
  assert.match(bills, /function isLatestBillPaymentTx\(billId,txId\)/);
});

test('S2609: latest-payment edits gate archive and debt synchronization; older history cannot overwrite latest state', () => {
  const bills = read('modules/finance/tagihan-kalender.js');
  const start = bills.indexOf('function applyBillPaymentTxSync(');
  const end = bills.indexOf('function saveBillHistoryEdit()', start);
  assert.ok(start >= 0 && end > start);
  const fn = bills.slice(start, end);
  assert.match(fn, /t\.billLinkId&&isLatestBillPaymentTx\(t\.billLinkId,t\.id\)/);
  assert.match(fn, /syncDebtBalanceOnPaymentEdit\(linkedBill,oldAmount,jumlah\)/);
  assert.match(fn, /syncSharedPiutangOnPaymentEdit\(t\.id,oldAmount,jumlah\)/);
});

test('S2609: deleting a bill-linked transaction calls the shared reversal before removing transaction history', () => {
  const tx = read('modules/finance/tx-list-cashflow.js');
  const start = tx.indexOf('async function delTx(id)');
  const end = tx.indexOf('\nfunction ', start + 10);
  assert.ok(start >= 0 && end > start);
  const fn = tx.slice(start, end);
  const revert = fn.indexOf('revertBillFromDeletedTx(t)');
  const remove = fn.indexOf('FinanceTxSOT.removeById(id)');
  assert.ok(revert >= 0 && remove > revert, 'reversal must see the original transaction in D.transactions');
  assert.match(fn, /if\(t&&t\.billLinkId&&typeof revertBillFromDeletedTx==='function'\)/);
});

test('S2609: deletion through payment-history UI reuses the same bill reversal contract', () => {
  const bills = read('modules/finance/tagihan-kalender.js');
  const start = bills.indexOf('async function deleteBillHistoryTx()');
  const end = bills.indexOf('function ', start + 10);
  assert.ok(start >= 0 && end > start);
  const fn = bills.slice(start, end);
  assert.match(fn, /revertBillFromDeletedTx\(t\)/);
  assert.match(bills, /function revertBillFromDeletedTx\(t\)/);
});

test('S2609: paired transfers are deleted by transferPairId only; legacy transfers are not heuristically paired', () => {
  const tx = read('modules/finance/tx-list-cashflow.js');
  const transfer = read('modules/finance/tx-transfer.js');
  assert.match(transfer, /const transferPairId=uid\(\)/);
  assert.match(transfer, /type:'transfer_out'[\s\S]*?transferPairId[\s\S]*?type:'transfer_in'[\s\S]*?transferPairId/);
  assert.match(tx, /x\.id!==id&&x\.transferPairId===t\.transferPairId/);
  assert.match(tx, /transfer lama \(legacy\) tanpa penanda pasangan otomatis/);
  assert.doesNotMatch(tx, /pairedTx\s*=\s*D\.transactions\.find\([^\n]*(?:amount|date|accountId)/);
});

test('S2609: allocation remains read-only and locked after transaction mutations; SOT and ownership contracts are untouched', () => {
  const allocation = read('modules/finance/finance-allocation-api.js');
  const accounts = read('modules/finance/akun.js');
  assert.match(allocation, /actualFreeCashVerified:\s*false/);
  assert.match(allocation, /safeInvestableAmount:\s*null/);
  assert.match(allocation, /investmentAllowed:\s*false/);
  assert.match(allocation, /actualCashBlockCode/);
  assert.match(allocation, /investmentAllowed: finalInvestmentAllowed/);
  assert.doesNotMatch(allocation, /FinanceTxSOT|revertBillFromDeletedTx|applyBillPaymentTxSync|transferPairId/);
  assert.match(accounts, /return OwnershipEngine\.resolve\(acc\)\.type==='SELF'/);
  assert.match(accounts, /transfer_out/);
  assert.match(accounts, /transfer_in/);
});
