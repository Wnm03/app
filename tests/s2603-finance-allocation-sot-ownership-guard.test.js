'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

const apiPath = path.join(__dirname, '..', 'modules/finance/finance-allocation-api.js');
const source = fs.readFileSync(apiPath, 'utf8');

function loadAllocation({ projected = 1000, forecastAvailable = true } = {}) {
  const calls = { forecast: 0, ownership: 0, sot: 0, save: 0 };
  const ctx = {
    FinancialForecastAPI: {
      summary() {
        calls.forecast++;
        return forecastAvailable
          ? { ok: true, cashflowProjection: { projected } }
          : { ok: false, reason: 'unavailable' };
      },
    },
    // These sentinels prove the allocation orchestrator does not take over
    // either canonical ownership resolution or finance category SOT.
    OwnershipEngine: { resolve() { calls.ownership++; throw new Error('must not resolve ownership here'); } },
    FinanceCategorySOT: { classify() { calls.sot++; throw new Error('must not classify categories here'); } },
    D: { accounts: [], transactions: [], bills: [], targets: [] },
    save() { calls.save++; },
  };
  const loaded = loadSource(['modules/finance/finance-allocation-api.js'], ctx, ['FinanceAllocationAPI']);
  return { api: loaded.FinanceAllocationAPI, calls };
}

test('S2603: positive projection never becomes verified free cash or an investable amount', () => {
  const { api } = loadAllocation({ projected: 900000 });
  const result = api.summary();
  assert.equal(result.status, 'SURPLUS');
  assert.equal(result.actualFreeCashVerified, false);
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(result.investmentAllowed, false);
});

test('S2603: negative, zero, and missing forecast remain fail-closed', () => {
  const deficit = loadAllocation({ projected: -1 }).api.summary();
  const zero = loadAllocation({ projected: 0 }).api.summary();
  const missing = loadAllocation({ forecastAvailable: false }).api.summary();
  assert.equal(deficit.status, 'DEFICIT');
  assert.equal(zero.status, 'NO_FREE_CASH');
  assert.equal(missing.status, 'INSUFFICIENT_DATA');
  for (const result of [deficit, zero, missing]) {
    assert.equal(result.safeInvestableAmount, null);
    assert.notEqual(result.investmentAllowed, true);
  }
});

test('S2603: allocation orchestrator does not redefine SOT, ownership, account balances, or persistence', () => {
  assert.doesNotMatch(source, /FinanceCategorySOT|D\.(accounts|transactions|bills|targets)\s*(?:=|\.push\s*\(|\.splice\s*\()/);
  assert.match(source, /isAccOwnershipSelf\(reserveAccount\)/);
  assert.match(source, /totalSaldoAkun\(\)/);
  assert.match(source, /recalcAccBalance\(reserveAccount\.id\)/);
  assert.doesNotMatch(source, /D\.(accounts|transactions|bills|targets)\s*(?:=|\.push\s*\(|\.splice\s*\()/);
  assert.doesNotMatch(source, /localStorage|indexedDB|\.save\s*\(/);
  const { api, calls } = loadAllocation({ projected: 500 });
  api.summary();
  assert.equal(calls.ownership, 0);
  assert.equal(calls.sot, 0);
  assert.equal(calls.save, 0);
  assert.equal(calls.forecast, 1);
});

test('S2603: dashboard cashflow input is reused; no second forecast or canonical-rule call', () => {
  const { api, calls } = loadAllocation({ projected: 500 });
  const result = api.summary({ ok: true, projected: 123 });
  assert.equal(result.projectedEndingBalance, 123);
  assert.equal(calls.forecast, 0);
  assert.equal(calls.ownership, 0);
  assert.equal(calls.sot, 0);
});
