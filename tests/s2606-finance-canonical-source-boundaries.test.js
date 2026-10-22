'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('S2606: account balance remains owned by canonical recalcAccBalance and honors hitungKas/transfers', () => {
  const source = read('modules/finance/akun.js');
  const start = source.indexOf('function recalcAccBalance(');
  const end = source.indexOf('\n}', start) + 2;
  assert.ok(start >= 0 && end > start, 'canonical recalcAccBalance must exist');
  const fn = source.slice(start, end);
  assert.match(fn, /t\.hitungKas===false/);
  assert.match(fn, /transfer_out/);
  assert.match(fn, /transfer_in/);
  assert.match(source, /return OwnershipEngine\.resolve\(acc\)\.type==='SELF'/);
  assert.match(source, /a\.includeInBalance!==false[^\n]*isAccOwnershipSelf\(a\)/);
});

test('S2606: asset-linked accounts and non-SELF accounts remain excluded by existing aggregate, not allocation API', () => {
  const accounts = read('modules/finance/akun.js');
  const allocation = read('modules/finance/finance-allocation-api.js');
  assert.match(accounts, /const linked=linkedAssetAccountIds\(\)/);
  assert.match(accounts, /!linked\.has\(String\(a\.id\)\)/);
  assert.match(accounts, /isAccOwnershipSelf\(a\)/);
  assert.match(allocation, /isAccOwnershipSelf\(reserveAccount\)/);
  assert.match(allocation, /linkedAssetAccountIds\(\)/);
  assert.match(allocation, /recalcAccBalance\(reserveAccount\.id\)/);
  assert.match(allocation, /totalSaldoAkun\(\)/);
});

test('S2606: bill paid-period truth stays with existing period helper; allocation does not replace it', () => {
  const bills = read('modules/finance/tagihan-kalender.js');
  const projection = read('modules/finance/cash-projection.js');
  const allocation = read('modules/finance/finance-allocation-api.js');
  assert.match(bills, /function getBillPaidThisPeriodInfo\(/);
  assert.match(projection, /getBillPaidThisPeriodInfo\(b,billRangeMonth,billRangeYear\)/);
  assert.match(allocation, /D\.bills/);
  assert.match(allocation, /cashForecast\.billsDue/);
  assert.match(allocation, /REMITTANCE_PERIOD_AMBIGUOUS/);
  assert.match(allocation, /getBillPaidThisPeriodInfo\(bill, due\.getMonth\(\), due\.getFullYear\(\)\)/);
  assert.doesNotMatch(allocation, /findFallbackBillPaymentTxId|billLinkId/);
});

test('S2606: debt/bill overlap stays inside existing debt strategy contract; allocation adds no second debt sum', () => {
  const debt = read('modules/finance/debt-optimizer-api.js');
  const allocation = read('modules/finance/finance-allocation-api.js');
  assert.match(debt, /DebtStrategy\.activeDebts\(\)/);
  assert.match(debt, /kind === 'cicilan'/);
  assert.match(debt, /TIDAK dijumlah manual lagi|tidak dobel hitung/);
  assert.match(allocation, /DEBT_BILL_LINK_MISSING/);
  assert.match(allocation, /ORPHAN_DEBT_BILL/);
  assert.doesNotMatch(allocation, /Debt\.totalValue|totalCicilanBulanan|sisaTenor/);
});

test('S2606: emergency reserve source remains the existing risk API, not a new allocation formula', () => {
  const risk = read('modules/finance/financial-risk-dashboard-api.js');
  const allocation = read('modules/finance/finance-allocation-api.js');
  assert.match(risk, /isDanaDarurat/);
  assert.match(risk, /recalcAccBalance\(dd\.accountId\)/);
  assert.match(allocation, /isDanaDarurat/);
  assert.match(allocation, /D\.targets/);
  assert.match(allocation, /EMERGENCY_ACCOUNT_UNLINKED/);
  assert.match(allocation, /safeInvestableAmount:\s*null/);
  assert.match(allocation, /investmentAllowed:\s*false/);
});
