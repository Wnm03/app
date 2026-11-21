'use strict';
// S2896 (lanjutan): (1) angka negatif tidak boleh tampil tanpa tanda minus di "Kas & akun",
// "Saldo sekarang" (2 presenter) dan "Saldo akhir proyeksi" (fmt() memakai nilai mutlak);
// (2) label "Utang" di kartu Kekayaan Bersih memakai SSOT FI.totalDebt() (sama dgn rumus net worth).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const fmtAbs = (n) => 'Rp ' + Math.round(Math.abs(n || 0));

test('Saldo akhir proyeksi negatif tampil dengan tanda minus', () => {
  const ctx = loadSource(['modules/finance/finance-dashboard.js'], {
    FinanceAllocationAPI: { summary: (c) => ({ ok: true, status: 'DEFISIT', projectedEndingBalance: -6123263, recommendations: [], receivedCashflow: c }) },
    FinanceIntelligence: { summary: () => ({ ok: true }) },
    Kekayaan: { currentNetWorth: () => 0 }, totalSaldoAkun: () => 0, totalDebtValue: () => 0,
    D: { partsStock: [], servisLogs: [] }, fmt: fmtAbs,
  }, ['FinanceDashboard']);
  const card = ctx.FinanceDashboard._allocationCard();
  assert.match(card.sub, /Saldo akhir proyeksi: -Rp 6123263\./);
});

test('Saldo akhir proyeksi positif tidak diberi minus', () => {
  const ctx = loadSource(['modules/finance/finance-dashboard.js'], {
    FinanceAllocationAPI: { summary: () => ({ ok: true, status: 'SURPLUS', projectedEndingBalance: 250000, recommendations: [] }) },
    FinanceIntelligence: { summary: () => ({ ok: true }) },
    Kekayaan: { currentNetWorth: () => 0 }, totalSaldoAkun: () => 0, totalDebtValue: () => 0,
    D: { partsStock: [], servisLogs: [] }, fmt: fmtAbs,
  }, ['FinanceDashboard']);
  assert.match(ctx.FinanceDashboard._allocationCard().sub, /Saldo akhir proyeksi: Rp 250000\./);
});

test('Kartu Kekayaan Bersih: "Utang" = FI.totalDebt() (bukan hanya Buku Utang)', () => {
  const mk = (FI) => loadSource(['modules/finance/finance-dashboard.js'], {
    FinanceIntelligence: { summary: () => ({ ok: true }) },
    Kekayaan: { currentNetWorth: () => -1000000 }, totalSaldoAkun: () => -500000, totalDebtValue: () => 777247,
    FI, D: { partsStock: [], servisLogs: [] }, fmt: fmtAbs,
  }, ['FinanceDashboard']).FinanceDashboard._netWorthCard();
  const c = mk({ totalDebt: () => 1739529 });
  assert.match(c.sub, /Saldo -Rp 500000 · Utang Rp 1739529/);
  assert.equal(c.value, '-Rp 1000000');
  // tanpa FI (muat parsial) -> jatuh ke Buku Utang, tidak error
  assert.match(mk(undefined).sub, /Utang Rp 777247/);
});

for (const [name, file, global, method, arg] of [
  ['CashFlowProjectionPresenter', 'modules/finance/cashflow-projection-presenter.js', 'CashFlowProjectionPresenter', '_cashBalanceCard'],
  ['FinancialForecastPresenter', 'modules/finance/financial-forecast-presenter.js', 'FinancialForecastPresenter', '_cashflowCard'],
]) {
  test(name + ': "Saldo sekarang" negatif memakai tanda minus', () => {
    const ctx = loadSource([file], { fmt: fmtAbs }, [global]);
    const P = ctx[global] || ctx.window[global];
    const f = { ok: true, saldoNow: -2500000, projected: -3000000, billsDue: 100000, upcomingCount: 2 };
    const c = P[method](f);
    assert.match(c.sub, /Saldo sekarang -Rp 2500000 · 2 tagihan jatuh tempo \(Rp 100000\)/);
    assert.equal(c.value, '-Rp 3000000');
    assert.match(P[method]({ ...f, saldoNow: 2500000 }).sub, /Saldo sekarang Rp 2500000 /);
  });
}

test('Beranda: "Kas & akun" negatif memakai tanda minus', () => {
  const ctx = loadSource(['modules/dashboard-hub/dashboard-hub-overview.js'], {
    document: { getElementById: () => ({ innerHTML: '', style: {}, textContent: '' }) },
    escapeHtml: (s) => String(s), fmt: fmtAbs,
    D: { transactions: [{}, {}, {}], bills: [] },
    AssetPortfolioAPI: { summary: () => ({ ok: true, netWorth: { ok: true, netWorth: -1000000 },
      composition: { ok: true, totalValue: 5000000, cashValue: -2000000, assetValue: 3000000, investmentValue: 0 } }) },
    FI: { totalDebt: () => 1739529 },
  }, ['DashboardHubOverview']);
  const o = ctx.DashboardHubOverview || ctx.window.DashboardHubOverview;
  const tile = o.tiles().find((t) => t && t.title === 'Kekayaan Bersih');
  assert.ok(tile, 'tile Kekayaan Bersih ada');
  const kas = tile.rows.find((r) => r[0] === 'Kas & akun');
  assert.equal(kas[1], '-Rp 2000000');
  assert.equal(tile.rows.find((r) => r[0] === 'Kewajiban/utang')[1], 'Rp 1739529');
});
