'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function apiWith(forecast) {
  return loadSource(['modules/finance/finance-allocation-api.js'], {
    FinancialForecastAPI: { summary: () => forecast },
  }, ['FinanceAllocationAPI']).FinanceAllocationAPI;
}

for (const [name, forecast] of [
  ['unavailable forecast', { ok: false, reason: 'unavailable' }],
  ['missing projection', { ok: true, cashflowProjection: {} }],
  ['non-finite projection', { ok: true, cashflowProjection: { projected: Infinity } }],
]) {
  test(`S2612: ${name} explicitly denies investment`, () => {
    const result = apiWith(forecast).summary();
    assert.equal(result.ok, false);
    assert.equal(result.investmentAllowed, false);
    assert.equal(result.actualFreeCashVerified, false);
    assert.equal(result.safeInvestableAmount, null);
  });
}

test('S2612: supplied invalid dashboard cashflow also explicitly denies investment without fallback', () => {
  let fallbackCalls = 0;
  const api = loadSource(['modules/finance/finance-allocation-api.js'], {
    FinancialForecastAPI: { summary: () => { fallbackCalls++; return { ok: true, cashflowProjection: { projected: 999 } }; } },
  }, ['FinanceAllocationAPI']).FinanceAllocationAPI;
  const result = api.summary({ ok: true, projected: NaN });
  assert.equal(result.ok, false);
  assert.equal(result.investmentAllowed, false);
  assert.equal(result.actualFreeCashVerified, false);
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(fallbackCalls, 0);
});
