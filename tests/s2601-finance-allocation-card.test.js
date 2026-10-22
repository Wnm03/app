'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCard(result) {
  const ctx = loadSource(['modules/finance/finance-dashboard.js'], {
    FinanceAllocationAPI: { summary: cashflow => ({ ...result, receivedCashflow: cashflow }) },
    FinanceIntelligence: { summary: () => ({ ok: true }) },
    Kekayaan: { currentNetWorth: () => 0 },
    totalSaldoAkun: () => 0,
    totalDebtValue: () => 0,
    D: { partsStock: [], servisLogs: [] },
    fmt: n => 'Rp ' + Math.round(n),
  }, ['FinanceDashboard']);
  return ctx.FinanceDashboard._allocationCard();
}

test('S2601 dashboard card shows projection label and clearly blocks automatic investment', () => {
  const card = makeCard({ ok: true, status: 'SURPLUS', projectedEndingBalance: 250000, recommendations: [{ title: 'Validasi kas bebas', detail: 'Periksa saldo.' }] });
  assert.equal(card.label, 'Alokasi Dana Aman');
  assert.equal(card.value, 'Surplus proyeksi');
  assert.match(card.sub, /Saldo akhir proyeksi: Rp 250000/);
  assert.match(card.sub, /Investasi otomatis: tidak/);
});

test('S2601 dashboard card fails closed when allocation API reports insufficient data', () => {
  const card = makeCard({ ok: false, status: 'INSUFFICIENT_DATA', reason: 'Saldo belum tersedia' });
  assert.equal(card.value, 'Data belum cukup');
  assert.match(card.sub, /Saldo belum tersedia/);
});
