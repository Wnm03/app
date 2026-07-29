'use strict';
// tests/finance-nav-consistency-s254a.test.js — cakupan Sesi 254A (Batch
// Finance Navigation Consistency): modules/finance/
// financial-risk-dashboard-presenter.js, financial-goal-presenter.js,
// dana-kelolaan-presenter.js, financial-health-score-presenter.js,
// retirement-planner-presenter.js. WIRE ONLY — TIDAK ADA halaman/modal/
// engine baru dibuat:
//   - onClick:{action,args} per-kartu, 100% REUSE dashHubNavigateToFeature()
//     (dashboard-hub.js) — SAMA PERSIS pola FinanceDashboard.render()/
//     VehicleAnalyticsPresenter.render() (S250-253).
//   - *_NAV_TARGETS per file (nama disendirikan, bukan CARD_NAV_TARGETS,
//     supaya tidak bentrok dgn const global yang sama persis di
//     business-flow-presenter.js/vehicle presenters).
// Pola test sama persis tests/vehicle-nav-consistency-s253.test.js /
// tests/asset-nav-consistency-s252.test.js.

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

// --- FinancialRiskDashboardPresenter ------------------------------------

test('FinancialRiskDashboardPresenter._levelCard()/_topFactorCard()/_breakdownCard() — onClick ke financialRiskDashboardWrap', () => {
  const ctx = makeCtx('modules/finance/financial-risk-dashboard-presenter.js', 'FinancialRiskDashboardPresenter');
  const rl = { level: 'medium', label: 'Sedang', count: 2 };
  const rf = [{ domain: 'debt', message: 'DSR tinggi' }, { domain: 'health', message: 'Skor rendah' }];
  [
    ctx.FinancialRiskDashboardPresenter._levelCard(rl),
    ctx.FinancialRiskDashboardPresenter._topFactorCard(rf),
    ctx.FinancialRiskDashboardPresenter._breakdownCard(rf),
  ].forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'keuangan');
    assert.equal(c.onClick.args[0].goTo, 'financialRiskDashboardWrap');
    assert.equal(c.onClick.args[0].tab, 'laporan');
  });
});

test('FinancialRiskDashboardPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const FinancialRiskDashboardAPI = {
    summary: () => ({ ok: true, riskLevel: { level: 'low', label: 'Rendah', count: 0 }, riskFactors: [] }),
  };
  const html = renderToHtml('modules/finance/financial-risk-dashboard-presenter.js', 'FinancialRiskDashboardPresenter', 'financialRiskDashboardGrid', { FinancialRiskDashboardAPI });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- FinancialGoalPresenter ---------------------------------------------

test('FinancialGoalPresenter._progressCard()/_projectionCard()/_recommendationCard() — onClick ke financialGoalWrap', () => {
  const ctx = makeCtx('modules/finance/financial-goal-presenter.js', 'FinancialGoalPresenter');
  const p = { ok: true, count: 2, achievedCount: 1, inProgressCount: 1, notStartedCount: 0, avgProgressPct: 60 };
  const t = { ok: true, monthlySurplus: 1000, projections: [{ name: 'Dana Darurat', monthsNeeded: 3, remaining: 500 }] };
  const r = [{ type: 'info', message: 'Tetap konsisten menabung' }];
  [
    ctx.FinancialGoalPresenter._progressCard(p),
    ctx.FinancialGoalPresenter._projectionCard(t),
    ctx.FinancialGoalPresenter._recommendationCard(r),
  ].forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'keuangan');
    assert.equal(c.onClick.args[0].goTo, 'financialGoalWrap');
    assert.equal(c.onClick.args[0].tab, 'laporan');
  });
});

test('FinancialGoalPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const FinancialGoalAPI = {
    summary: () => ({
      ok: true,
      goalProgress: { ok: true, count: 0, achievedCount: 0, inProgressCount: 0, notStartedCount: 0, avgProgressPct: 0 },
      targetProjection: { ok: true, monthlySurplus: 0, projections: [] },
      recommendation: [],
    }),
  };
  const html = renderToHtml('modules/finance/financial-goal-presenter.js', 'FinancialGoalPresenter', 'financialGoalGrid', { FinancialGoalAPI });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- DanaKelolaanPresenter ------------------------------------------------

test('DanaKelolaanPresenter.render() — 6 kartu semua clickable, onClick ke tab Laporan (danaKelolaanLapCard)', () => {
  const realEscapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const DanaKelolaan = {
    summary: () => ({ investor: 100, titipan: 50, titipanAset: 10, dpCustomer: 20, keluarga: 5, total: 175 }),
  };
  const html = renderToHtml('modules/finance/dana-kelolaan-presenter.js', 'DanaKelolaanPresenter', 'danaKelolaanGrid', { DanaKelolaan, escapeHtml: realEscapeHtml });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 6);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 6);
  const argsMatches = html.match(/data-args="[^"]*danaKelolaanLapCard[^"]*"/g) || [];
  assert.equal(argsMatches.length, 6);
  assert.ok(html.includes('&quot;page&quot;:&quot;keuangan&quot;'));
});

// --- FinancialHealthScorePresenter --------------------------------------

test('FinancialHealthScorePresenter._scoreCard()/_breakdownCard()/_recommendationCard() — onClick ke financialHealthScoreWrap', () => {
  const ctx = makeCtx('modules/finance/financial-health-score-presenter.js', 'FinancialHealthScorePresenter');
  const o = { ok: true, score: 75, label: 'Baik' };
  const b = { ok: true, items: [{ label: 'Dana Darurat', pct: 0.4 }, { label: 'Cashflow', pct: 0.9 }] };
  const r = [{ type: 'warning', message: 'Tambah dana darurat' }];
  [
    ctx.FinancialHealthScorePresenter._scoreCard(o),
    ctx.FinancialHealthScorePresenter._breakdownCard(b),
    ctx.FinancialHealthScorePresenter._recommendationCard(r),
  ].forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'keuangan');
    assert.equal(c.onClick.args[0].goTo, 'financialHealthScoreWrap');
    assert.equal(c.onClick.args[0].tab, 'laporan');
  });
});

test('FinancialHealthScorePresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const FinancialHealthScoreAPI = {
    summary: () => ({
      ok: true,
      scoreOverview: { ok: true, score: 50, label: 'Cukup' },
      componentBreakdown: { ok: true, items: [] },
      recommendation: [],
    }),
  };
  const html = renderToHtml('modules/finance/financial-health-score-presenter.js', 'FinancialHealthScorePresenter', 'financialHealthScoreGrid', { FinancialHealthScoreAPI });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- RetirementPlannerPresenter -------------------------------------------

test('RetirementPlannerPresenter._overviewCard()/_gapCard()/_recommendationCard() — onClick ke retirementPlannerWrap', () => {
  const ctx = makeCtx('modules/finance/retirement-planner-presenter.js', 'RetirementPlannerPresenter');
  const o = { ok: true, configured: true, proyeksi: 100000, terkumpul: 40000, sisaBulan: 30 };
  const g = { ok: true, hasTarget: true, gap: -20000, onTrack: false };
  const r = [{ type: 'warning', message: 'Naikkan kontribusi bulanan' }];
  [
    ctx.RetirementPlannerPresenter._overviewCard(o),
    ctx.RetirementPlannerPresenter._gapCard(g),
    ctx.RetirementPlannerPresenter._recommendationCard(r),
  ].forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'keuangan');
    assert.equal(c.onClick.args[0].goTo, 'retirementPlannerWrap');
    assert.equal(c.onClick.args[0].tab, 'laporan');
  });
});

test('RetirementPlannerPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const RetirementPlannerAPI = {
    summary: () => ({
      ok: true,
      retirementOverview: { ok: true, configured: false },
      gapAnalysis: { ok: true, hasTarget: false },
      recommendation: [],
    }),
  };
  const html = renderToHtml('modules/finance/retirement-planner-presenter.js', 'RetirementPlannerPresenter', 'retirementPlannerGrid', { RetirementPlannerAPI });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- render() aman diam2 kalau container tidak ada (5 file) -------------

test('render() — aman diam2 kalau container tidak ada di halaman (kelima presenter)', () => {
  const files = [
    ['modules/finance/financial-risk-dashboard-presenter.js', 'FinancialRiskDashboardPresenter'],
    ['modules/finance/financial-goal-presenter.js', 'FinancialGoalPresenter'],
    ['modules/finance/dana-kelolaan-presenter.js', 'DanaKelolaanPresenter'],
    ['modules/finance/financial-health-score-presenter.js', 'FinancialHealthScorePresenter'],
    ['modules/finance/retirement-planner-presenter.js', 'RetirementPlannerPresenter'],
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
    ['modules/finance/financial-risk-dashboard-presenter.js', 'FinancialRiskDashboardPresenter'],
    ['modules/finance/financial-goal-presenter.js', 'FinancialGoalPresenter'],
    ['modules/finance/dana-kelolaan-presenter.js', 'DanaKelolaanPresenter'],
    ['modules/finance/financial-health-score-presenter.js', 'FinancialHealthScorePresenter'],
    ['modules/finance/retirement-planner-presenter.js', 'RetirementPlannerPresenter'],
  ];
  files.forEach(([file, exportName]) => {
    const ctx = makeCtx(file, exportName);
    assert.equal(typeof ctx[exportName].openCard, 'undefined');
  });
});
