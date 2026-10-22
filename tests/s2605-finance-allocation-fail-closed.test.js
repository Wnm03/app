'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadAllocation(ctx = {}) {
  return loadSource(['modules/finance/finance-allocation-api.js'], ctx, ['FinanceAllocationAPI']).FinanceAllocationAPI;
}

test('S2605: missing or malformed caller projection fails closed without fallback recomputation', () => {
  let forecastCalls = 0;
  const api = loadAllocation({
    FinancialForecastAPI: { summary() { forecastCalls++; return { ok: true, cashflowProjection: { projected: 123456 } }; } },
  });
  for (const input of [null, {}, { ok: false, reason: 'missing' }, { ok: true }, { ok: true, projected: NaN }, { ok: true, projected: Infinity }, { ok: true, projected: '123' }]) {
    const result = api.summary(input);
    assert.equal(result.ok, false, `input should fail closed: ${String(input)}`);
    assert.equal(result.status, 'INSUFFICIENT_DATA');
    assert.equal(result.actualFreeCashVerified, false);
    assert.equal(result.safeInvestableAmount, null);
    assert.notEqual(result.investmentAllowed, true);
  }
  assert.equal(forecastCalls, 0, 'caller supplied a projection argument; do not silently switch sources');
});

test('S2605: unavailable, throwing, or malformed fallback forecast never creates investable amount', () => {
  const contexts = [
    {},
    { FinancialForecastAPI: {} },
    { FinancialForecastAPI: { summary() { throw new Error('unavailable'); } } },
    { FinancialForecastAPI: { summary() { return null; } } },
    { FinancialForecastAPI: { summary() { return { ok: true, cashflowProjection: {} }; } } },
    { FinancialForecastAPI: { summary() { return { ok: true, cashflowProjection: { projected: '9000' } }; } } },
  ];
  for (const ctx of contexts) {
    const result = loadAllocation(ctx).summary();
    assert.equal(result.ok, false);
    assert.equal(result.status, 'INSUFFICIENT_DATA');
    assert.equal(result.actualFreeCashVerified, false);
    assert.equal(result.safeInvestableAmount, null);
    assert.notEqual(result.investmentAllowed, true);
  }
});

test('S2605: finite forecast may classify projection only and can never unlock investment', () => {
  const api = loadAllocation({ FinancialForecastAPI: { summary() { return { ok: true, cashflowProjection: { projected: 999999999 } }; } } });
  const result = api.summary();
  assert.equal(result.ok, true);
  assert.equal(result.status, 'SURPLUS');
  assert.equal(result.projectedEndingBalance, 999999999);
  assert.equal(result.basis, '30-day-projection');
  assert.equal(result.actualFreeCashVerified, false);
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(result.investmentAllowed, false);
});
