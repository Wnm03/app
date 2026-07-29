'use strict';
// tests/vehicle-nav-consistency-s253.test.js — cakupan Sesi 253 (Batch
// Vehicle Navigation Consistency): modules/vehicle/vehicle-dashboard.js,
// vehicle-insight-presenter.js, vehicle-analytics-presenter.js,
// fuel-analytics.js, vehicle-automation-presenter.js. WIRE ONLY — TIDAK
// ADA halaman/modal/engine baru dibuat:
//   - onClick:{action,args} per-kartu, 100% REUSE dashHubNavigateToFeature()
//     (dashboard-hub.js) — SAMA PERSIS pola FinanceDashboard.render()/
//     AssetPortfolioPresenter.render() (S250-252).
//   - *_NAV_TARGETS per file (nama disendirikan, bukan CARD_NAV_TARGETS,
//     supaya tidak bentrok dgn const global yang sama persis di
//     business-flow-presenter.js).
// Pola test sama persis tests/asset-nav-consistency-s252.test.js.

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

// --- VehicleDashboard --------------------------------------------------

test('VehicleDashboard._fleetCard()/_serviceCard()/_healthCard() — onClick sesuai VEHICLE_DASHBOARD_NAV_TARGETS', () => {
  const ctx = makeCtx('modules/vehicle/vehicle-dashboard.js', 'VehicleDashboard');
  const fleet = { totalVehicles: 3, totalOverdue: 1, avgHealth: 80 };
  const c1 = ctx.VehicleDashboard._fleetCard(fleet);
  const c2 = ctx.VehicleDashboard._serviceCard(fleet);
  const c3 = ctx.VehicleDashboard._healthCard(fleet);
  assert.equal(c1.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c1.onClick.args[0].page, 'carnotes');
  assert.equal(c2.onClick.args[0].tab, 'servis');
  assert.equal(c2.onClick.args[0].goTo, 'servisList');
  assert.equal(c3.onClick.args[0].tab, 'insight');
  assert.equal(c3.onClick.args[0].goTo, 'vehdashWrap');
});

test('VehicleDashboard.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const VehicleIntelligence = { summary: () => ({ fleet: { totalVehicles: 2, totalOverdue: 0, avgHealth: 90 } }) };
  const html = renderToHtml('modules/vehicle/vehicle-dashboard.js', 'VehicleDashboard', 'vehdashGrid', { VehicleIntelligence });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- VehicleInsightPresenter ---------------------------------------------

test('VehicleInsightPresenter._reminderCard()/_overdueCard()/_dueSoonCard() — onClick ke vehinsightWrap', () => {
  const ctx = makeCtx('modules/vehicle/vehicle-insight-presenter.js', 'VehicleInsightPresenter');
  const reminder = { total: 5, overdueCount: 2, dueSoonCount: 3 };
  [
    ctx.VehicleInsightPresenter._reminderCard(reminder),
    ctx.VehicleInsightPresenter._overdueCard(reminder),
    ctx.VehicleInsightPresenter._dueSoonCard(reminder),
  ].forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'carnotes');
    assert.equal(c.onClick.args[0].tab, 'insight');
    assert.equal(c.onClick.args[0].goTo, 'vehinsightWrap');
  });
});

test('VehicleInsightPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const VehicleAIHook = {
    fleetSummary: () => ({
      ok: true,
      intelligence: { fleet: { totalVehicles: 1 } },
      reminder: { total: 1, overdueCount: 0, dueSoonCount: 1 },
    }),
  };
  const html = renderToHtml('modules/vehicle/vehicle-insight-presenter.js', 'VehicleInsightPresenter', 'vehinsightGrid', { VehicleAIHook });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- VehicleAnalyticsPresenter ---------------------------------------------

test('VehicleAnalyticsPresenter._totalCard()/_fuelCard()/_serviceCard()/_trendCard() — onClick sesuai VEHICLE_ANALYTICS_NAV_TARGETS', () => {
  const ctx = makeCtx('modules/vehicle/vehicle-analytics-presenter.js', 'VehicleAnalyticsPresenter');
  const s = { months: 3, total: 100, avgPerMonth: 33, totalFuel: 60, totalService: 40, direction: 'up', lastMonth: null, prevMonth: null };
  const total = ctx.VehicleAnalyticsPresenter._totalCard(s);
  const fuel = ctx.VehicleAnalyticsPresenter._fuelCard(s);
  const service = ctx.VehicleAnalyticsPresenter._serviceCard(s);
  const trend = ctx.VehicleAnalyticsPresenter._trendCard(s);
  assert.equal(total.onClick.args[0].goTo, 'vehAnalyticsWrap');
  assert.equal(fuel.onClick.args[0].tab, 'bbm');
  assert.equal(fuel.onClick.args[0].goTo, 'bbmList');
  assert.equal(service.onClick.args[0].tab, 'servis');
  assert.equal(service.onClick.args[0].goTo, 'servisList');
  assert.equal(trend.onClick.args[0].goTo, 'vehAnalyticsWrap');
  [total, fuel, service, trend].forEach((c) => assert.equal(c.onClick.action, 'dashHubNavigateToFeature'));
});

test('VehicleAnalyticsPresenter.render() — 4 kartu semua clickable (u-pointer + data-action)', () => {
  const VehicleCostSummary = {
    summary: () => ({
      ok: true, months: 3, total: 100, avgPerMonth: 33, totalFuel: 60, totalService: 40,
      direction: 'flat', lastMonth: null, prevMonth: null,
    }),
  };
  const VehicleIntelligence = { fleetSummary: () => ({ totalVehicles: 1 }) };
  const html = renderToHtml('modules/vehicle/vehicle-analytics-presenter.js', 'VehicleAnalyticsPresenter', 'vehanalyticsGrid', { VehicleCostSummary, VehicleIntelligence });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 4);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 4);
});

// --- FuelAnalytics -----------------------------------------------------

test('FuelAnalytics._effBlock() — 3 kartu clickable ke FUEL_ANALYTICS_NAV_TARGETS (bbm/bbmList)', () => {
  const realEscapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ctx = makeCtx('modules/vehicle/fuel-analytics.js', 'FuelAnalytics', { escapeHtml: realEscapeHtml });
  const html = ctx.FuelAnalytics._effBlock({ ok: true, kmPerLiter: 40, rpPerKm: 200, estMonthlyCost: 100000 });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
  const argsMatches = html.match(/data-args="[^"]*bbmList[^"]*"/g) || [];
  assert.equal(argsMatches.length, 3);
});

test('FuelAnalytics._effBlock() — tanpa estMonthlyCost -> 2 kartu clickable', () => {
  const ctx = makeCtx('modules/vehicle/fuel-analytics.js', 'FuelAnalytics');
  const html = ctx.FuelAnalytics._effBlock({ ok: true, kmPerLiter: 40, rpPerKm: 200, estMonthlyCost: 0 });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 2);
});

// --- VehicleAutomationPresenter ---------------------------------------------

test('VehicleAutomationPresenter._totalCard()/_todayCard()/_maintenanceCard()/_taxCard() — onClick sesuai VEHICLE_AUTOMATION_NAV_TARGETS', () => {
  const ctx = makeCtx('modules/vehicle/vehicle-automation-presenter.js', 'VehicleAutomationPresenter');
  const total = ctx.VehicleAutomationPresenter._totalCard({ total: 5, counts: { today: 1 } });
  const today = ctx.VehicleAutomationPresenter._todayCard({ total: 5, counts: { today: 1 } });
  const maint = ctx.VehicleAutomationPresenter._maintenanceCard({ total: 2 });
  const tax = ctx.VehicleAutomationPresenter._taxCard({ total: 1 });
  assert.equal(total.onClick.args[0].goTo, 'vehAutomationWrap');
  assert.equal(today.onClick.args[0].goTo, 'vehAutomationWrap');
  assert.equal(maint.onClick.args[0].tab, 'servis');
  assert.equal(maint.onClick.args[0].goTo, 'servisList');
  assert.equal(tax.onClick.args[0].tab, 'pajak');
  assert.equal(tax.onClick.args[0].goTo, 'vehTaxList');
  [total, today, maint, tax].forEach((c) => assert.equal(c.onClick.action, 'dashHubNavigateToFeature'));
});

test('VehicleAutomationPresenter.render() — 4 kartu semua clickable (u-pointer + data-action)', () => {
  const VehicleReminderScheduler = { summary: () => ({ total: 5, counts: { today: 1 } }) };
  const VehicleMaintenanceAutomation = { plan: () => ({ total: 2 }) };
  const VehicleTaxDocumentAutomation = { plan: () => ({ total: 1 }) };
  const VehicleIntelligence = { fleetSummary: () => ({ totalVehicles: 1 }) };
  const html = renderToHtml('modules/vehicle/vehicle-automation-presenter.js', 'VehicleAutomationPresenter', 'vehAutomationGrid', {
    VehicleReminderScheduler, VehicleMaintenanceAutomation, VehicleTaxDocumentAutomation, VehicleIntelligence,
  });
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 4);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 4);
});

// --- render() aman diam2 kalau container tidak ada (5 file) -------------

test('render() — aman diam2 kalau container tidak ada di halaman (kelima presenter)', () => {
  const files = [
    ['modules/vehicle/vehicle-dashboard.js', 'VehicleDashboard'],
    ['modules/vehicle/vehicle-insight-presenter.js', 'VehicleInsightPresenter'],
    ['modules/vehicle/vehicle-analytics-presenter.js', 'VehicleAnalyticsPresenter'],
    ['modules/vehicle/vehicle-automation-presenter.js', 'VehicleAutomationPresenter'],
  ];
  files.forEach(([file, exportName]) => {
    const ctx = loadSource(
      [file],
      { escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0), document: { getElementById() { return null; } } },
      [exportName],
    );
    assert.doesNotThrow(() => ctx[exportName].render());
  });
  // FuelAnalytics beda signature (render(vehicleId)), dites terpisah.
  const ctx = loadSource(
    ['modules/vehicle/fuel-analytics.js'],
    { escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + Math.round(n || 0), document: { getElementById() { return null; } } },
    ['FuelAnalytics'],
  );
  assert.doesNotThrow(() => ctx.FuelAnalytics.render('v1'));
});

// --- openCard(index) TIDAK ADA (pola lama dihapus/tidak pernah dipakai) -----

test('openCard(index) TIDAK ADA di kelima presenter — navigasi 100% lewat onClick per-kartu', () => {
  const files = [
    ['modules/vehicle/vehicle-dashboard.js', 'VehicleDashboard'],
    ['modules/vehicle/vehicle-insight-presenter.js', 'VehicleInsightPresenter'],
    ['modules/vehicle/vehicle-analytics-presenter.js', 'VehicleAnalyticsPresenter'],
    ['modules/vehicle/fuel-analytics.js', 'FuelAnalytics'],
    ['modules/vehicle/vehicle-automation-presenter.js', 'VehicleAutomationPresenter'],
  ];
  files.forEach(([file, exportName]) => {
    const ctx = makeCtx(file, exportName);
    assert.equal(typeof ctx[exportName].openCard, 'undefined');
  });
});
