'use strict';
// tests/finance-nav-consistency-s254b.test.js — cakupan Sesi 254B (Batch
// Finance Navigation Consistency): modules/finance/
// budget-recommendation-presenter.js, investment-planner-presenter.js,
// cashflow-projection-presenter.js, financial-forecast-presenter.js,
// debt-optimizer-presenter.js. WIRE ONLY — TIDAK ADA halaman/modal/
// engine baru dibuat:
//   - onClick:{action,args} per-kartu, 100% REUSE dashHubNavigateToFeature()
//     (dashboard-hub.js) — SAMA PERSIS pola FinanceDashboard.render()/
//     VehicleAnalyticsPresenter.render() (S250-253) &
//     FinancialHealthScorePresenter.render()/dst (S254A).
//   - *_NAV_TARGETS per file (nama disendirikan, bukan CARD_NAV_TARGETS,
//     supaya tidak bentrok dgn const global yang sama persis di
//     business-flow-presenter.js/vehicle presenters/S254A presenters).
// Pola test sama persis tests/finance-nav-consistency-s254a.test.js /
// tests/vehicle-nav-consistency-s253.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(file, exportName, extraGlobals) {
  return loadSource(
    [file],
    {
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      ...extraGlobals,
    },
    [exportName],
  );
}

function renderToHtml(file, exportName, containerId, extraGlobals) {
  let html = '';
  const el = {
    set innerHTML(v) { html = v; },
    get innerHTML() { return html; },
  };
  const documentStub = {
    getElementById(id) {
      if (id === containerId) return el;
      return null;
    },
  };
  const ctx = loadSource(
    [file],
    {
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      document: documentStub,
      ...extraGlobals,
    },
    [exportName],
  );
  ctx[exportName].render();
  return html;
}

// --- BudgetRecommendationPresenter --------------------------------------

test('BudgetRecommendationPresenter._overCard()/_underusedCard()/_topSuggestionCard() — onClick ke budgetRecoWrap', () => {
  const ctx = makeCtx('modules/finance/budget-recommendation-presenter.js', 'BudgetRecommendationPresenter');
  const sa = { ok: true, overCount: 1, underusedCount: 1, items: [{ category: 'over', name: 'Makan' }, { category: 'underused', name: 'Hiburan', pct: 0.2 }] };
  const bsg = { ok: true, suggestions: [{ name: 'Makan', category: 'over', message: 'Kurangi 10%' }] };
  [
    ctx.BudgetRecommendationPresenter._overCard(sa),
    ctx.BudgetRecommendationPresenter._underusedCard(sa),
    ctx.BudgetRecommendationPresenter._topSuggestionCard(bsg),
  ].forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'keuangan');
    assert.equal(c.onClick.args[0].goTo, 'budgetRecoWrap');
    assert.equal(c.onClick.args[0].tab, 'laporan');
  });
});

test('BudgetRecommendationPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const BudgetRecommendationAPI = {
    summary: () => ({
      ok: true,
      spendingAnalysis: { ok: true, overCount: 0, underusedCount: 0, items: [] },
      budgetSuggestion: { ok: true, suggestions: [] },
    }),
  };
  const html = renderToHtml('modules/finance/budget-recommendation-presenter.js', 'BudgetRecommendationPresenter', 'budgetRecoGrid', { BudgetRecommendationAPI });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- InvestmentPlannerPresenter ------------------------------------------

test('InvestmentPlannerPresenter._overviewCard()/_allocationCard()/_recommendationCard() — onClick ke investPlannerWrap', () => {
  const ctx = makeCtx('modules/finance/investment-planner-presenter.js', 'InvestmentPlannerPresenter');
  const p = { ok: true, holdingsCount: 2, totalValue: 1000, roiPct: 5, totalGainLoss: 50 };
  const a = { ok: true, allocation: [{ type: 'Saham', pct: 60 }], topAllocation: { type: 'Saham', pct: 60, value: 600 } };
  const r = [{ type: 'info', message: 'Diversifikasi lebih lanjut' }];
  [
    ctx.InvestmentPlannerPresenter._overviewCard(p),
    ctx.InvestmentPlannerPresenter._allocationCard(a),
    ctx.InvestmentPlannerPresenter._recommendationCard(r),
  ].forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'keuangan');
    assert.equal(c.onClick.args[0].goTo, 'investPlannerWrap');
    assert.equal(c.onClick.args[0].tab, 'laporan');
  });
});

test('InvestmentPlannerPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const InvestmentPlannerAPI = {
    summary: () => ({
      ok: true,
      portfolioOverview: { ok: true, holdingsCount: 0 },
      assetAllocation: { ok: true, allocation: [], topAllocation: null },
      recommendation: [],
    }),
  };
  const html = renderToHtml('modules/finance/investment-planner-presenter.js', 'InvestmentPlannerPresenter', 'investPlannerGrid', { InvestmentPlannerAPI });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- CashFlowProjectionPresenter -----------------------------------------

test('CashFlowProjectionPresenter._incomeCard()/_expenseCard()/_cashBalanceCard() — onClick ke cashflowProjWrap', () => {
  const ctx = makeCtx('modules/finance/cashflow-projection-presenter.js', 'CashFlowProjectionPresenter');
  const income = { ok: true, avgMonthly: 5000, months: 3, currentMonthIncome: 5200 };
  const expense = { ok: true, avgMonthly: 3000, months: 3, currentMonthExpense: 3100 };
  const cashBalance = { ok: true, saldoNow: 1000, projected: 900, billsDue: 200, upcomingCount: 1 };
  [
    ctx.CashFlowProjectionPresenter._incomeCard(income),
    ctx.CashFlowProjectionPresenter._expenseCard(expense),
    ctx.CashFlowProjectionPresenter._cashBalanceCard(cashBalance),
  ].forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'keuangan');
    assert.equal(c.onClick.args[0].goTo, 'cashflowProjWrap');
    assert.equal(c.onClick.args[0].tab, 'laporan');
  });
});

test('CashFlowProjectionPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const CashFlowProjectionAPI = {
    summary: () => ({
      ok: true,
      income: { ok: true, avgMonthly: 0, months: 0, currentMonthIncome: 0 },
      expense: { ok: true, avgMonthly: 0, months: 0, currentMonthExpense: 0 },
      cashBalance: { ok: true, saldoNow: 0, projected: 0, billsDue: 0, upcomingCount: 0 },
    }),
  };
  const html = renderToHtml('modules/finance/cashflow-projection-presenter.js', 'CashFlowProjectionPresenter', 'cashflowProjGrid', { CashFlowProjectionAPI });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- FinancialForecastPresenter -------------------------------------------

test('FinancialForecastPresenter._incomeCard()/_expenseCard()/_cashflowCard() — onClick ke forecastWrap', () => {
  const ctx = makeCtx('modules/finance/financial-forecast-presenter.js', 'FinancialForecastPresenter');
  const income = { ok: true, avgMonthly: 5000, months: 3, currentMonthIncome: 5200 };
  const expense = { ok: true, avgMonthly: 3000, months: 3, currentMonthExpense: 3100 };
  const cashflowProjection = { ok: true, saldoNow: 1000, projected: 900, billsDue: 200, upcomingCount: 1 };
  [
    ctx.FinancialForecastPresenter._incomeCard(income),
    ctx.FinancialForecastPresenter._expenseCard(expense),
    ctx.FinancialForecastPresenter._cashflowCard(cashflowProjection),
  ].forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'keuangan');
    assert.equal(c.onClick.args[0].goTo, 'forecastWrap');
    assert.equal(c.onClick.args[0].tab, 'laporan');
  });
});

test('FinancialForecastPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const FinancialForecastAPI = {
    summary: () => ({
      ok: true,
      income: { ok: true, avgMonthly: 0, months: 0, currentMonthIncome: 0 },
      expense: { ok: true, avgMonthly: 0, months: 0, currentMonthExpense: 0 },
      cashflowProjection: { ok: true, saldoNow: 0, projected: 0, billsDue: 0, upcomingCount: 0 },
    }),
  };
  const html = renderToHtml('modules/finance/financial-forecast-presenter.js', 'FinancialForecastPresenter', 'forecastGrid', { FinancialForecastAPI });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- DebtOptimizerPresenter -------------------------------------------------

test('DebtOptimizerPresenter._overviewCard()/_dsrCard()/_recommendationCard() — onClick ke debtOptimizerWrap', () => {
  const ctx = makeCtx('modules/finance/debt-optimizer-presenter.js', 'DebtOptimizerPresenter');
  const o = { ok: true, activeCount: 2, totalValue: 20000, totalCicilanBulanan: 1000 };
  const d = { ok: true, pct: 20, incAvg: 5000, totalCicilan: 1000 };
  const r = [{ type: 'warning', message: 'Prioritaskan bunga tertinggi' }];
  [
    ctx.DebtOptimizerPresenter._overviewCard(o),
    ctx.DebtOptimizerPresenter._dsrCard(d),
    ctx.DebtOptimizerPresenter._recommendationCard(r),
  ].forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'keuangan');
    assert.equal(c.onClick.args[0].goTo, 'debtOptimizerWrap');
    assert.equal(c.onClick.args[0].tab, 'laporan');
  });
});

test('DebtOptimizerPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const DebtOptimizerAPI = {
    summary: () => ({
      ok: true,
      debtOverview: { ok: true, activeCount: 0 },
      dsr: { ok: true, incAvg: 0, pct: null },
      recommendation: [],
    }),
  };
  const html = renderToHtml('modules/finance/debt-optimizer-presenter.js', 'DebtOptimizerPresenter', 'debtOptimizerGrid', { DebtOptimizerAPI });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- render() aman diam2 kalau container tidak ada (5 file) -------------

test('render() — aman diam2 kalau container tidak ada di halaman (kelima presenter)', () => {
  const files = [
    ['modules/finance/budget-recommendation-presenter.js', 'BudgetRecommendationPresenter'],
    ['modules/finance/investment-planner-presenter.js', 'InvestmentPlannerPresenter'],
    ['modules/finance/cashflow-projection-presenter.js', 'CashFlowProjectionPresenter'],
    ['modules/finance/financial-forecast-presenter.js', 'FinancialForecastPresenter'],
    ['modules/finance/debt-optimizer-presenter.js', 'DebtOptimizerPresenter'],
  ];
  files.forEach(([file, exportName]) => {
    const ctx = loadSource(
      [file],
      { escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0), document: { getElementById() { return null; } } },
      [exportName],
    );
    assert.doesNotThrow(() => ctx[exportName].render());
  });
});

// --- openCard(index) TIDAK ADA (pola lama, tidak pernah dipakai di sini) --

test('openCard(index) TIDAK ADA di kelima presenter — navigasi 100% lewat onClick per-kartu', () => {
  const files = [
    ['modules/finance/budget-recommendation-presenter.js', 'BudgetRecommendationPresenter'],
    ['modules/finance/investment-planner-presenter.js', 'InvestmentPlannerPresenter'],
    ['modules/finance/cashflow-projection-presenter.js', 'CashFlowProjectionPresenter'],
    ['modules/finance/financial-forecast-presenter.js', 'FinancialForecastPresenter'],
    ['modules/finance/debt-optimizer-presenter.js', 'DebtOptimizerPresenter'],
  ];
  files.forEach(([file, exportName]) => {
    const ctx = makeCtx(file, exportName);
    assert.equal(typeof ctx[exportName].openCard, 'undefined');
  });
});
