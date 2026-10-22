'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('S2607: bill payment history is linked by billLinkId; fuzzy legacy matching stays a separate fallback', () => {
  const bills = read('modules/finance/tagihan-kalender.js');
  const paidStart = bills.indexOf('function getBillPaidThisPeriodInfo(');
  const paidEnd = bills.indexOf('\n}', paidStart) + 2;
  assert.ok(paidStart >= 0 && paidEnd > paidStart, 'canonical paid-period helper must exist');
  const paidFn = bills.slice(paidStart, paidEnd);
  assert.match(paidFn, /t\.billLinkId===b\.id/);
  assert.match(paidFn, /b\.freq==='bulanan'/);
  assert.match(paidFn, /b\.freq==='tahunan'/);
  assert.match(bills, /function findFallbackBillPaymentTxId\(/);
  assert.match(bills, /type==='expense'&&!t\.billLinkId/);
  assert.match(bills, /billLinkId:billEditId/);
});

test('S2607: debt-like bill identity preserves source bill ID instead of inventing a second obligation source', () => {
  const debtStrategy = read('modules/finance/piutang-utang.js');
  const api = read('modules/finance/debt-optimizer-api.js');
  assert.match(debtStrategy, /id:'bill:'\+b\.id/);
  assert.match(debtStrategy, /_billId:b\.id/);
  assert.match(debtStrategy, /return real\.concat\(DebtStrategy\.billCicilanAsDebtLike\(\)\)/);
  assert.match(api, /activeCount\s*=\s*DebtStrategy\.activeDebts\(\)\.length/);
  assert.doesNotMatch(api, /activeCount\s*=.*\+.*billCicilan/);
});

test('S2607: DSR contract separates formal debt installments from non-debt bill installments', () => {
  const debtStrategy = read('modules/finance/piutang-utang.js');
  const start = debtStrategy.indexOf('computeDSR(){');
  const end = debtStrategy.indexOf('\n},', start) + 3;
  assert.ok(start >= 0 && end > start, 'canonical computeDSR must exist');
  const fn = debtStrategy.slice(start, end);
  assert.match(fn, /Debt\.totalCicilanBulanan\(\)/);
  assert.match(fn, /D\.bills\|\|\[\]/);
  assert.match(fn, /b\.kind==='cicilan'/);
  assert.match(fn, /totalCicilanUtang\+totalCicilanLain/);
});

test('S2607: linked asset accounts remain excluded from cash aggregate and linked asset source is unioned with investment holdings', () => {
  const accounts = read('modules/finance/akun.js');
  assert.match(accounts, /const assetIds=\(D\.assets\|\|\[\]\)/);
  assert.match(accounts, /Investment\.getHoldings\(\)/);
  assert.match(accounts, /new Set\(\[\.\.\.assetIds,\.\.\.holdingIds\]\)/);
  assert.match(accounts, /!linked\.has\(String\(a\.id\)\)&&isAccOwnershipSelf\(a\)/);
});

test('S2607: emergency-fund target uses linked account balance only when account link and canonical balance function exist', () => {
  const risk = read('modules/finance/financial-risk-dashboard-api.js');
  const start = risk.indexOf('_emergencyFundRisk() {');
  const end = risk.indexOf('\n},', start) + 3;
  assert.ok(start >= 0 && end > start, 'canonical emergency risk function must exist');
  const fn = risk.slice(start, end);
  assert.match(fn, /D\.targets\s*\|\|\s*\[\]/);
  assert.match(fn, /dd\.accountId\s*&&\s*typeof recalcAccBalance\s*===\s*'function'/);
  assert.match(fn, /recalcAccBalance\(dd\.accountId\)/);
  assert.match(fn, /dd\.saved\s*\|\|\s*0/);
});

test('S2607: allocation remains fail-closed because sources do not establish a unified actual-free-cash reconciliation contract', () => {
  const allocation = read('modules/finance/finance-allocation-api.js');
  assert.match(allocation, /actualFreeCashVerified:\s*false/);
  assert.match(allocation, /safeInvestableAmount:\s*null/);
  assert.match(allocation, /investmentAllowed:\s*false/);
  assert.match(allocation, /DEBT_BILL_LINK_MISSING/);
  assert.match(allocation, /EMERGENCY_ACCOUNT_UNLINKED/);
  assert.doesNotMatch(allocation, /billLinkId|_billId|DebtStrategy/);
});
