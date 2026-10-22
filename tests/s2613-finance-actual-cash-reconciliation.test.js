'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

for (const [label, amount] of [['null', null], ['boolean-false', false], ['boolean-true', true], ['array', []], ['object', {}], ['empty-string', ''], ['whitespace-only', '   '], ['not-numeric', 'abc'], ['negative', -1], ['NaN', NaN], ['Infinity', Infinity]]) {
  test(`S2616: upcoming forecast bill with ${label} amount fails closed`, () => {
    const result = makeApi({
      ctx: { computeCashflowForecast: () => ({ saldoNow: 1000, billsDue: 100, upcoming: [{ id: 'forecast-bill', amount, nextDue: '2026-10-25', freq: 'bulanan' }] }) },
    }).summary();
    assert.equal(result.actualFreeCashVerified, false);
    assert.equal(result.safeInvestableAmount, null);
    assert.equal(result.investmentAllowed, false);
    assert.equal(result.actualCashBlockCode, 'INVALID_UPCOMING_BILL');
  });
}

test('S2616: upcoming forecast bill with valid numeric string remains supported', () => {
  const result = makeApi({
    ctx: { computeCashflowForecast: () => ({ saldoNow: 1000, billsDue: 100, upcoming: [{ id: 'forecast-bill', amount: '100', nextDue: '2026-10-25', freq: 'bulanan' }] }) },
  }).summary();
  assert.equal(result.actualFreeCashVerified, true);
  assert.equal(result.safeInvestableAmount, 700);
});

test('S2616: upcoming forecast bill with invalid due date fails closed', () => {
  const result = makeApi({
    ctx: { computeCashflowForecast: () => ({ saldoNow: 1000, billsDue: 100, upcoming: [{ id: 'forecast-bill', amount: 100, nextDue: 'not-a-date', freq: 'bulanan' }] }) },
  }).summary();
  assert.equal(result.actualFreeCashVerified, false);
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(result.actualCashBlockCode, 'INVALID_UPCOMING_BILL');
});

function makeApi(overrides = {}) {
  const D = {
    accounts: [
      { id: 'daily', includeInBalance: true, ownership: { type: 'SELF' } },
      { id: 'emergency', includeInBalance: true, ownership: { type: 'SELF' } },
    ],
    transactions: [], bills: [{ id: 'bill-utility', kind: 'tagihan', amount: 100, nextDue: '2026-10-25', freq: 'bulanan' }], debts: [],
    targets: [{ id: 'emergency-target', isDanaDarurat: true, accountId: 'emergency', amount: 200 }],
    profile: { kiriman: 0 },
  };
  Object.assign(D, overrides.D || {});
  const state = {
    cash: 1000, reserve: 200, billsDue: 100, titipanUnscheduled: 0,
    ...overrides.state,
  };
  const ctx = {
    D,
    OwnershipEngine: { resolve: () => ({ type: 'SELF' }) },
    FinancialForecastAPI: { summary: () => ({ ok: true, cashflowProjection: { projected: 900 } }) },
    totalSaldoAkun: () => state.cash,
    recalcAccBalance: (id) => id === 'emergency' ? state.reserve : 800,
    linkedAssetAccountIds: () => new Set(),
    isAccOwnershipSelf: () => true,
    computeCashflowForecast: () => ({ saldoNow: state.cash, billsDue: state.billsDue, upcoming: D.bills }),
    getBillPaidThisPeriodInfo: () => null,
    getMonthlyCashProjection: () => ({ titipanPinjamUnscheduledTotal: state.titipanUnscheduled }),
    ...overrides.ctx,
  };
  return loadSource(['modules/finance/finance-allocation-api.js'], ctx, ['FinanceAllocationAPI']).FinanceAllocationAPI;
}

test('S2613: verified canonical cash, 30-day bills and funded reserve can expose a non-automatic investable recommendation', () => {
  const result = makeApi().summary();
  assert.equal(result.actualFreeCashVerified, true);
  assert.equal(result.cashAfterObligations, 700);
  assert.equal(result.safeInvestableAmount, 700);
  assert.equal(result.investmentAllowed, true);
  assert.equal(result.actualCashBlockCode, null);
});

test('S2613: positive current cash cannot unlock investment when monthly projection is in deficit', () => {
  const result = makeApi().summary({ ok: true, projected: -1 });
  assert.equal(result.status, 'DEFICIT');
  assert.equal(result.actualFreeCashVerified, true);
  assert.equal(result.safeInvestableAmount, 0);
  assert.equal(result.investmentAllowed, false);
  assert.equal(result.recommendations[0].code, 'protect-projected-deficit');
});

test('S2613: underfunded emergency reserve keeps investment locked and recommends reserve completion', () => {
  const result = makeApi({ state: { cash: 1000, reserve: 50, billsDue: 100, titipanUnscheduled: 0 } }).summary();
  assert.equal(result.actualFreeCashVerified, true);
  assert.equal(result.safeInvestableAmount, 0);
  assert.equal(result.investmentAllowed, false);
  assert.equal(result.emergencyReserveGap, 150);
  assert.equal(result.recommendations[0].code, 'complete-emergency-reserve');
});

test('S2613: stale cross-tab state or required persistence recovery blocks allocation', () => {
  const staleTab = makeApi({ ctx: { _crossTabStateStale: true } }).summary();
  assert.equal(staleTab.actualCashBlockCode, 'PERSISTENCE_STATE_NOT_CURRENT');
  assert.equal(staleTab.investmentAllowed, false);
  const recovery = makeApi({ ctx: { window: { __kwPersistenceRecoveryRequired: true } } }).summary();
  assert.equal(recovery.actualCashBlockCode, 'PERSISTENCE_STATE_NOT_CURRENT');
  assert.equal(recovery.investmentAllowed, false);
});

test('S2613: missing emergency account link fails closed', () => {
  const result = makeApi({ D: { targets: [{ id: 'emergency-target', isDanaDarurat: true, amount: 200, saved: 200 }] } }).summary();
  assert.equal(result.actualFreeCashVerified, false);
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(result.investmentAllowed, false);
  assert.equal(result.actualCashBlockCode, 'EMERGENCY_ACCOUNT_UNLINKED');
});


for (const [label, nilai] of [['missing', undefined], ['empty', ''], ['whitespace-only', '   '], ['boolean-false', false], ['array-coercion', []], ['not-numeric', 'abc'], ['negative', -1]]) {
  test(`S2613: active debt with ${label} principal fails closed`, () => {
    const debt = { id: 'debt-invalid', lunas: false, cicilanBulanan: 0 };
    if (nilai !== undefined) debt.nilai = nilai;
    const result = makeApi({ D: { debts: [debt] } }).summary();
    assert.equal(result.actualFreeCashVerified, false);
    assert.equal(result.safeInvestableAmount, null);
    assert.equal(result.investmentAllowed, false);
    assert.equal(result.actualCashBlockCode, 'INVALID_ACTIVE_DEBT_AMOUNT');
  });
}

for (const [label, cicilanBulanan] of [
  ['whitespace-only', '  '], ['boolean-false', false], ['boolean-true', true],
  ['array', []], ['object', {}], ['not-numeric', 'abc'], ['NaN', NaN],
  ['Infinity', Infinity], ['negative', -1],
]) {
  test(`S2616: active debt with ${label} installment fails closed as invalid`, () => {
    const result = makeApi({ D: { debts: [{ id: 'debt-invalid-installment', lunas: false, nilai: 500, cicilanBulanan }] } }).summary();
    assert.equal(result.actualFreeCashVerified, false);
    assert.equal(result.safeInvestableAmount, null);
    assert.equal(result.investmentAllowed, false);
    assert.equal(result.actualCashBlockCode, 'INVALID_DEBT_INSTALLMENT');
  });
}

test('S2616: active debt with valid numeric-string installment keeps canonical bill-link validation', () => {
  const result = makeApi({ D: { debts: [{ id: 'debt-1', lunas: false, nilai: 500, cicilanBulanan: '50', billId: null }] } }).summary();
  assert.equal(result.actualFreeCashVerified, false);
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(result.actualCashBlockCode, 'DEBT_BILL_LINK_MISSING');
});

test('S2613: active scheduled debt without exact canonical bill link fails closed', () => {
  const result = makeApi({ D: { debts: [{ id: 'debt-1', lunas: false, nilai: 500, cicilanBulanan: 50, billId: null }] } }).summary();
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(result.investmentAllowed, false);
  assert.equal(result.actualCashBlockCode, 'DEBT_BILL_LINK_MISSING');
});

test('S2613: unscheduled manual debt fails closed instead of silently disappearing from obligations', () => {
  const result = makeApi({ D: { debts: [{ id: 'debt-1', lunas: false, nilai: 500, cicilanBulanan: 0 }] } }).summary();
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(result.investmentAllowed, false);
  assert.equal(result.actualCashBlockCode, 'UNSCHEDULED_DEBT');
});

test('S2613: exact scheduled debt-to-bill link is counted once through the canonical bill forecast', () => {
  const debt = { id: 'debt-1', lunas: false, nilai: 500, cicilanBulanan: 50, billId: 'bill-1' };
  const bill = { id: 'bill-1', debtId: 'debt-1', kind: 'utang', amount: 50, nextDue: '2026-10-25' };
  const result = makeApi({ D: { debts: [debt], bills: [bill] }, state: { cash: 1000, reserve: 200, billsDue: 50, titipanUnscheduled: 0 } }).summary();
  assert.equal(result.safeInvestableAmount, 750);
  assert.equal(result.investmentAllowed, true);
});

test('S2613: orphan debt bill fails closed', () => {
  const result = makeApi({ D: { bills: [{ id: 'bill-1', debtId: 'missing-debt', kind: 'utang', amount: 50, nextDue: '2026-10-25' }] } }).summary();
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(result.investmentAllowed, false);
  assert.equal(result.actualCashBlockCode, 'ORPHAN_DEBT_BILL');
});

test('S2613: weekly remittance and mismatched cash snapshot fail closed', () => {
  const remittance = makeApi({ D: { profile: { kiriman: 1 } } }).summary();
  assert.equal(remittance.actualCashBlockCode, 'REMITTANCE_PERIOD_AMBIGUOUS');
  const mismatch = makeApi({ ctx: { computeCashflowForecast: () => ({ saldoNow: 999, billsDue: 100, upcoming: [] }) } }).summary();
  assert.equal(mismatch.actualCashBlockCode, 'CASH_SNAPSHOT_MISMATCH');
  assert.equal(mismatch.investmentAllowed, false);
});

test('S2613: exact paid-period helper prevents counting a current-month paid bill twice', () => {
  const result = makeApi({ ctx: { getBillPaidThisPeriodInfo: (bill) => bill.id === 'bill-utility' ? { tx: { id: 'paid-tx' } } : null } }).summary();
  assert.equal(result.safeInvestableAmount, 800);
  assert.equal(result.investmentAllowed, true);
});

test('S2613: payment this week does not hide a weekly bill due next week', () => {
  const weeklyBill = { id: 'weekly-next', kind: 'tagihan', amount: 100, nextDue: '2026-10-26', freq: 'mingguan' };
  const result = makeApi({ D: { bills: [weeklyBill] }, ctx: { getBillPaidThisPeriodInfo: () => ({ tx: { id: 'previous-week-payment' } }) } }).summary();
  assert.equal(result.safeInvestableAmount, 700);
  assert.equal(result.investmentAllowed, true);
});

for (const [label, amount] of [['whitespace-only', '  '], ['boolean-false', false], ['array-coercion', []]]) {
  test(`S2615: active bill with ${label} amount fails closed`, () => {
    const result = makeApi({ D: { bills: [{ id: 'bad', amount, nextDue: '2026-10-25' }] } }).summary();
    assert.equal(result.actualCashBlockCode, 'INVALID_BILL_AMOUNT');
    assert.equal(result.safeInvestableAmount, null);
    assert.equal(result.investmentAllowed, false);
  });
}

test('S2613: invalid bill data and unavailable canonical sources fail closed', () => {
  const badBill = makeApi({ D: { bills: [{ id: 'bad', amount: -1, nextDue: '2026-10-25' }] } }).summary();
  assert.equal(badBill.actualCashBlockCode, 'INVALID_BILL_AMOUNT');
  const noSource = makeApi({ ctx: { getMonthlyCashProjection: undefined } }).summary();
  assert.equal(noSource.actualCashBlockCode, 'CANONICAL_SOURCE_UNAVAILABLE');
});
