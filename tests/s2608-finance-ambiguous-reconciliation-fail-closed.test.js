'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function allocation(forecast) {
  return loadSource(['modules/finance/finance-allocation-api.js'], {
    FinancialForecastAPI: { summary: () => ({ ok: true, cashflowProjection: { projected: forecast } }) },
  }, ['FinanceAllocationAPI']).FinanceAllocationAPI.summary();
}

test('S2608: positive projection cannot unlock investable cash when obligations are ambiguous', () => {
  for (const projected of [1, 500000, 100000000]) {
    const result = allocation(projected);
    assert.equal(result.status, 'SURPLUS');
    assert.equal(result.basis, '30-day-projection');
    assert.equal(result.actualFreeCashVerified, false);
    assert.equal(result.safeInvestableAmount, null);
    assert.equal(result.investmentAllowed, false);
  }
});

test('S2608: deficit and zero projection remain informational and never produce investment amount', () => {
  for (const projected of [-1, -500000, 0]) {
    const result = allocation(projected);
    assert.equal(result.ok, true);
    assert.equal(result.projectedEndingBalance, projected);
    assert.equal(result.actualFreeCashVerified, false);
    assert.equal(result.safeInvestableAmount, null);
    assert.equal(result.investmentAllowed, false);
  }
});

test('S2608: legacy bill-payment fuzzy matching is explicitly not proof of a canonical payment link', () => {
  const bills = read('modules/finance/tagihan-kalender.js');
  const fallbackStart = bills.indexOf('function findFallbackBillPaymentTxId(');
  const fallbackEnd = bills.indexOf('\n}', fallbackStart) + 2;
  assert.ok(fallbackStart >= 0 && fallbackEnd > fallbackStart);
  const fallback = bills.slice(fallbackStart, fallbackEnd);
  assert.match(fallback, /!t\.billLinkId/);
  assert.match(fallback, /Math\.abs\(\(t\.amount\|\|0\)-\(targetAmount\|\|0\)\)<1/);
  assert.match(fallback, /nameLower/);
  assert.match(bills, /billLinkId:billEditId/);
});

test('S2608: partial payment and same-amount transactions cannot be assumed reconciled by allocation API', () => {
  const allocationSource = read('modules/finance/finance-allocation-api.js');
  assert.match(allocationSource, /getBillPaidThisPeriodInfo\(bill, due\.getMonth\(\), due\.getFullYear\(\)\)/);
  assert.doesNotMatch(allocationSource, /findFallbackBillPaymentTxId|billLinkId|amount\s*\*\s*.*sisaTenor/);
  assert.match(allocationSource, /safeInvestableAmount:\s*null/);
  assert.match(allocationSource, /investmentAllowed:\s*false/);
});

test('S2608: asset-linked and holding-linked account IDs are canonical union; allocation must not recreate account total', () => {
  const accounts = read('modules/finance/akun.js');
  const allocationSource = read('modules/finance/finance-allocation-api.js');
  assert.match(accounts, /new Set\(\[\.\.\.assetIds,\.\.\.holdingIds\]\)/);
  assert.match(accounts, /!linked\.has\(String\(a\.id\)\)&&isAccOwnershipSelf\(a\)/);
  assert.match(allocationSource, /totalSaldoAkun\(\)/);
  assert.match(allocationSource, /linkedAssetAccountIds\(\)/);
  assert.match(allocationSource, /isAccOwnershipSelf\(reserveAccount\)/);
  assert.match(allocationSource, /recalcAccBalance\(reserveAccount\.id\)/);
});

test('S2608: emergency target can use linked account balance, but allocation API does not combine it with saved snapshot', () => {
  const risk = read('modules/finance/financial-risk-dashboard-api.js');
  const allocationSource = read('modules/finance/finance-allocation-api.js');
  assert.match(risk, /recalcAccBalance\(dd\.accountId\)/);
  assert.match(risk, /dd\.saved\s*\|\|\s*0/);
  assert.match(allocationSource, /isDanaDarurat/);
  assert.match(allocationSource, /target\.accountId/);
  assert.doesNotMatch(allocationSource, /target\.saved/);
  assert.match(allocationSource, /actualFreeCashVerified:\s*false/);
});
