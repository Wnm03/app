'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

const repoRoot = path.join(__dirname, '..');
const apiPath = path.join(repoRoot, 'modules/finance/finance-allocation-api.js');
const apiSource = fs.readFileSync(apiPath, 'utf8');

function runWithMixedFinancialData(projected) {
  const calls = { forecast: 0, ownership: 0, categorySot: 0, balance: 0, debt: 0, save: 0 };
  const ctx = {
    FinancialForecastAPI: {
      summary() {
        calls.forecast++;
        return { ok: true, cashflowProjection: { projected } };
      },
    },
    // These records intentionally represent overlapping/ambiguous sources.
    // Allocation must not reinterpret them outside the canonical APIs.
    D: {
      accounts: [
        { id: 'cash', jenis: 'kas_bebas', includeInBalance: true, balance: 1500000 },
        { id: 'invest', jenis: 'investasi', includeInBalance: true, balance: 800000 },
        { id: 'locked', jenis: 'dikunci', includeInBalance: true, balance: 300000 },
        { id: 'entrusted', jenis: 'kas_bebas', ownership: { type: 'MIXED' }, balance: 500000 },
        { id: 'linked-asset', jenis: 'kas_bebas', balance: 900000 },
      ],
      transactions: [
        { id: 'internal-transfer', jenis: 'transfer_out', hitungKas: true, amount: 200000 },
        { id: 'excluded-cash', jenis: 'expense', hitungKas: false, amount: 100000 },
      ],
      bills: [
        { id: 'paid-bill', kind: 'tagihan', status: 'paid', amount: 200000 },
        { id: 'installment', kind: 'cicilan', sisaTenor: 4, amount: 250000 },
      ],
      debts: [{ id: 'debt-linked-installment', installmentBillId: 'installment', monthlyPayment: 250000 }],
      targets: [{ id: 'emergency', isDanaDarurat: true, accountId: 'cash', saved: 0, amount: 1000000 }],
    },
    OwnershipEngine: { resolve() { calls.ownership++; throw new Error('allocation must not replace OwnershipEngine'); } },
    FinanceCategorySOT: { classify() { calls.categorySot++; throw new Error('allocation must not replace FinanceCategorySOT'); } },
    recalcAccBalance() { calls.balance++; throw new Error('allocation must reuse canonical balance APIs, not invent a second one'); },
    DebtOptimizerAPI: { summary() { calls.debt++; throw new Error('allocation must not duplicate debt reconciliation'); } },
    save() { calls.save++; },
  };
  const loaded = loadSource(['modules/finance/finance-allocation-api.js'], ctx, ['FinanceAllocationAPI']);
  return { result: loaded.FinanceAllocationAPI.summary(), calls };
}

test('S2604: mixed account types, entrusted funds, transfers, paid bills, overlapping debt and reserve never unlock investment', () => {
  for (const projected of [5000000, 1, 0, -1]) {
    const { result, calls } = runWithMixedFinancialData(projected);
    assert.equal(result.actualFreeCashVerified, false);
    assert.equal(result.safeInvestableAmount, null);
    assert.notEqual(result.investmentAllowed, true);
    assert.equal(calls.ownership, 0);
    assert.equal(calls.categorySot, 0);
    assert.equal(calls.balance, 0);
    assert.equal(calls.debt, 0);
    assert.equal(calls.save, 0);
  }
});

test('S2604: allocation source stays orchestration-only and cannot derive cash or obligations from raw records', () => {
  assert.match(apiSource, /totalSaldoAkun\(\)/);
  assert.match(apiSource, /recalcAccBalance\(reserveAccount\.id\)/);
  assert.match(apiSource, /linkedAssetAccountIds\(\)/);
  assert.match(apiSource, /getMonthlyCashProjection\(\)/);
  assert.doesNotMatch(apiSource, /localStorage|indexedDB|\.save\s*\(|D\.[A-Za-z]+\.(?:push|splice)\s*\(/);
  assert.doesNotMatch(apiSource, /localStorage|indexedDB|\.save\s*\(|D\.[A-Za-z]+\.(?:push|splice)\s*\(/);
  assert.match(apiSource, /safeInvestableAmount:\s*null/);
  assert.match(apiSource, /investmentAllowed:\s*false/);
});

test('S2604: dashboard projection passed by caller remains the only source read in that render', () => {
  const calls = { forecast: 0 };
  const ctx = {
    FinancialForecastAPI: { summary() { calls.forecast++; throw new Error('must reuse caller projection'); } },
  };
  const loaded = loadSource(['modules/finance/finance-allocation-api.js'], ctx, ['FinanceAllocationAPI']);
  const result = loaded.FinanceAllocationAPI.summary({ ok: true, projected: 750000 });
  assert.equal(result.projectedEndingBalance, 750000);
  assert.equal(result.safeInvestableAmount, null);
  assert.equal(result.investmentAllowed, false);
  assert.equal(calls.forecast, 0);
});
