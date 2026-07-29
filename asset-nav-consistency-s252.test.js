'use strict';
// tests/asset-nav-consistency-s252.test.js — cakupan Sesi 252 (Batch Asset
// Navigation Consistency): modules/asset/asset-portfolio-presenter.js,
// property-management-presenter.js, rental-management-presenter.js,
// asset-maintenance-presenter.js. WIRE ONLY — TIDAK ADA halaman/modal/
// engine baru dibuat:
//   - onClick:{action,args} per-kartu, 100% REUSE dashHubNavigateToFeature()
//     (dashboard-hub.js) — SAMA PERSIS pola FinanceDashboard.render()/
//     BusinessFlowPresenter.render() (S250-251, modules/shop/
//     business-flow-presenter.js).
//   - *_CARD_NAV_TARGETS per file (nama disendirikan, bukan
//     CARD_NAV_TARGETS, supaya tidak bentrok dgn const global yang sama
//     persis di business-flow-presenter.js).
// Pola test sama persis tests/trip-navigation-s249.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(file, exportName) {
  return loadSource(
    [file],
    {
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
    },
    [exportName],
  );
}

function renderToHtml(file, exportName, D, apiGlobalName, apiStub) {
  let html = '';
  const containerId = {
    AssetPortfolioPresenter: 'assetPortfolioGrid',
    PropertyManagementPresenter: 'propertyManagementGrid',
    RentalManagementPresenter: 'rentalManagementGrid',
    AssetMaintenancePresenter: 'assetMaintenanceGrid',
  }[exportName];
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
      [apiGlobalName]: apiStub,
    },
    [exportName],
  );
  ctx[exportName].render();
  return html;
}

// --- AssetPortfolioPresenter -----------------------------------------------

test('AssetPortfolioPresenter._compositionCard()/_allocationCard() — onClick ke Aset > Ringkasan > assetDashboard', () => {
  const ctx = makeCtx('modules/asset/asset-portfolio-presenter.js', 'AssetPortfolioPresenter');
  const comp = ctx.AssetPortfolioPresenter._compositionCard({ ok: false });
  const alloc = ctx.AssetPortfolioPresenter._allocationCard({ ok: false });
  [comp, alloc].forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'aset');
    assert.equal(c.onClick.args[0].tab, 'ringkasan');
    assert.equal(c.onClick.args[0].goTo, 'assetDashboard');
  });
});

test('AssetPortfolioPresenter._netWorthCard() — onClick ke halaman Keuangan', () => {
  const ctx = makeCtx('modules/asset/asset-portfolio-presenter.js', 'AssetPortfolioPresenter');
  const c = ctx.AssetPortfolioPresenter._netWorthCard({ ok: false });
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].page, 'keuangan');
});

test('AssetPortfolioPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const html = renderToHtml(
    'modules/asset/asset-portfolio-presenter.js',
    'AssetPortfolioPresenter',
    {},
    'AssetPortfolioAPI',
    { summary: () => ({ ok: true, composition: { ok: false }, allocation: { ok: false }, netWorth: { ok: false } }) },
  );
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- PropertyManagementPresenter -------------------------------------------

test('PropertyManagementPresenter._portfolioCard() — onClick ke Aset > Buku Aset > assetList', () => {
  const ctx = makeCtx('modules/asset/property-management-presenter.js', 'PropertyManagementPresenter');
  const c = ctx.PropertyManagementPresenter._portfolioCard({ ok: false });
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].page, 'aset');
  assert.equal(c.onClick.args[0].tab, 'buku');
  assert.equal(c.onClick.args[0].goTo, 'assetList');
});

test('PropertyManagementPresenter._taxCard() — onClick ke Aset > Analisis & Pajak > assetPajakDashboard', () => {
  const ctx = makeCtx('modules/asset/property-management-presenter.js', 'PropertyManagementPresenter');
  const c = ctx.PropertyManagementPresenter._taxCard({ ok: false });
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].tab, 'analisis');
  assert.equal(c.onClick.args[0].goTo, 'assetPajakDashboard');
});

test('PropertyManagementPresenter._depreciationCard() — onClick ke Aset > Analisis & Pajak > assetPenyusutanDashboard', () => {
  const ctx = makeCtx('modules/asset/property-management-presenter.js', 'PropertyManagementPresenter');
  const c = ctx.PropertyManagementPresenter._depreciationCard({ ok: false });
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].tab, 'analisis');
  assert.equal(c.onClick.args[0].goTo, 'assetPenyusutanDashboard');
});

test('PropertyManagementPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const html = renderToHtml(
    'modules/asset/property-management-presenter.js',
    'PropertyManagementPresenter',
    {},
    'PropertyManagementAPI',
    { summary: () => ({ ok: true, portfolio: { ok: false }, tax: { ok: false }, depreciation: { ok: false } }) },
  );
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- RentalManagementPresenter ----------------------------------------------

test('RentalManagementPresenter._incomeCard()/_unitsCard()/_unmanagedCard() — onClick ke Aset > Buku Aset > assetList', () => {
  const ctx = makeCtx('modules/asset/rental-management-presenter.js', 'RentalManagementPresenter');
  const cards = [
    ctx.RentalManagementPresenter._incomeCard({ ok: false }),
    ctx.RentalManagementPresenter._unitsCard({ ok: false }),
    ctx.RentalManagementPresenter._unmanagedCard({ ok: false }),
  ];
  cards.forEach((c) => {
    assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
    assert.equal(c.onClick.args[0].page, 'aset');
    assert.equal(c.onClick.args[0].tab, 'buku');
    assert.equal(c.onClick.args[0].goTo, 'assetList');
  });
});

test('RentalManagementPresenter.render() — 3 kartu semua clickable (u-pointer + data-action)', () => {
  const html = renderToHtml(
    'modules/asset/rental-management-presenter.js',
    'RentalManagementPresenter',
    {},
    'RentalManagementAPI',
    { summary: () => ({ ok: true, income: { ok: false }, units: { ok: false }, unmanaged: { ok: false } }) },
  );
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 3);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 3);
});

// --- AssetMaintenancePresenter -----------------------------------------------

test('AssetMaintenancePresenter._overviewCard() — onClick ke Aset > Buku Aset > assetList', () => {
  const ctx = makeCtx('modules/asset/asset-maintenance-presenter.js', 'AssetMaintenancePresenter');
  const c = ctx.AssetMaintenancePresenter._overviewCard({ ok: false });
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].tab, 'buku');
  assert.equal(c.onClick.args[0].goTo, 'assetList');
});

test('AssetMaintenancePresenter._attentionCard() — onClick ke Aset > Analisis & Pajak > assetPenyusutanDashboard', () => {
  const ctx = makeCtx('modules/asset/asset-maintenance-presenter.js', 'AssetMaintenancePresenter');
  const c = ctx.AssetMaintenancePresenter._attentionCard({ ok: false });
  assert.equal(c.onClick.action, 'dashHubNavigateToFeature');
  assert.equal(c.onClick.args[0].tab, 'analisis');
  assert.equal(c.onClick.args[0].goTo, 'assetPenyusutanDashboard');
});

test('AssetMaintenancePresenter.render() — 2 kartu semua clickable (u-pointer + data-action)', () => {
  const html = renderToHtml(
    'modules/asset/asset-maintenance-presenter.js',
    'AssetMaintenancePresenter',
    {},
    'AssetMaintenanceAPI',
    { summary: () => ({ ok: true, stats: { ok: false }, needsAttention: { ok: false } }) },
  );
  const pointerMatches = html.match(/class="findash-card u-pointer"/g) || [];
  assert.equal(pointerMatches.length, 2);
  const actionMatches = html.match(/data-action="dashHubNavigateToFeature"/g) || [];
  assert.equal(actionMatches.length, 2);
});

// --- render() aman diam2 kalau container tidak ada (4 file) ------------------

test('render() — aman diam2 kalau container tidak ada di halaman (keempat presenter)', () => {
  const files = [
    ['modules/asset/asset-portfolio-presenter.js', 'AssetPortfolioPresenter'],
    ['modules/asset/property-management-presenter.js', 'PropertyManagementPresenter'],
    ['modules/asset/rental-management-presenter.js', 'RentalManagementPresenter'],
    ['modules/asset/asset-maintenance-presenter.js', 'AssetMaintenancePresenter'],
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

// --- openCard(index) TIDAK ADA (pola lama dihapus/tidak pernah dipakai) -----

test('openCard(index) TIDAK ADA di keempat presenter — navigasi 100% lewat onClick per-kartu', () => {
  const files = [
    ['modules/asset/asset-portfolio-presenter.js', 'AssetPortfolioPresenter'],
    ['modules/asset/property-management-presenter.js', 'PropertyManagementPresenter'],
    ['modules/asset/rental-management-presenter.js', 'RentalManagementPresenter'],
    ['modules/asset/asset-maintenance-presenter.js', 'AssetMaintenancePresenter'],
  ];
  files.forEach(([file, exportName]) => {
    const ctx = makeCtx(file, exportName);
    assert.equal(typeof ctx[exportName].openCard, 'undefined');
  });
});
