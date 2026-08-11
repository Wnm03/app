'use strict';
// tests/dashboard-ownership-summary-s236.test.js — cakupan Sesi 236:
// Dashboard -> kartu "Ownership Summary" (modules/dashboard-hub/dashboard-hub.js,
// DashboardHubOwnershipSummary). MURNI TAMPILAN — 100% reuse
// OwnershipSettingsPresenter.summary() (S229-230) yang sudah menggabungkan
// D.accounts/assets/investments/vehicles & OwnershipEngine.countByType()
// (S191). TIDAK ada rumus/engine baru di sini, TIDAK ada perubahan di
// OwnershipEngine/OwnershipSettingsPresenter — hanya dites tidak-throw &
// reuse yang benar (render() dites lewat container/document minimal, pola
// sama tests/ownership-settings-presenter.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    { accounts: [], assets: [], investments: [], vehicles: [] },
    extra,
  );
}

function makeEl() {
  const el = { innerHTML: '' };
  return el;
}

function makeCtx(D, { withContainer = true } = {}) {
  const listEl = withContainer ? makeEl() : null;
  const byId = { dashHubOwnershipSummaryList: listEl };
  const document = {
    getElementById: (id) => (Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null),
  };
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/ownership-settings-presenter.js',
      'modules/dashboard-hub/dashboard-hub.js',
    ],
    { D, document, escapeHtml: (s) => String(s) },
    ['OwnershipSettingsPresenter', 'OwnershipEngine', 'DashboardHubOwnershipSummary'],
  );
  return { ctx, listEl };
}

test('render() — tidak throw kalau container #dashHubOwnershipSummaryList tidak ada', () => {
  const { ctx } = makeCtx(baseD(), { withContainer: false });
  assert.doesNotThrow(() => ctx.DashboardHubOwnershipSummary.render());
});

test('render() — tidak throw kalau OwnershipSettingsPresenter belum dimuat', () => {
  const listEl = makeEl();
  const document = { getElementById: (id) => (id === 'dashHubOwnershipSummaryList' ? listEl : null) };
  const ctx = loadSource(
    ['modules/dashboard-hub/dashboard-hub.js'],
    { D: baseD(), document, escapeHtml: (s) => String(s) },
    ['DashboardHubOwnershipSummary'],
  );
  assert.doesNotThrow(() => ctx.DashboardHubOwnershipSummary.render());
  assert.match(listEl.innerHTML, /Ownership Engine belum tersedia/);
});

test('render() — kosong (semua 0) kalau semua koleksi kosong, urutan SELF/INVESTOR/CUSTOMER/FAMILY/THIRD_PARTY', () => {
  const { ctx, listEl } = makeCtx(baseD());
  ctx.DashboardHubOwnershipSummary.render();
  const idxSelf = listEl.innerHTML.indexOf('Milik Sendiri');
  const idxInvestor = listEl.innerHTML.indexOf('Investor');
  const idxCustomer = listEl.innerHTML.indexOf('Pelanggan');
  const idxFamily = listEl.innerHTML.indexOf('Keluarga');
  const idxThirdParty = listEl.innerHTML.indexOf('Pihak Ketiga');
  assert.ok(idxSelf < idxInvestor);
  assert.ok(idxInvestor < idxCustomer);
  assert.ok(idxCustomer < idxFamily);
  assert.ok(idxFamily < idxThirdParty);
});

test('render() — reuse OwnershipSettingsPresenter.summary(): angka per tipe sama persis hasil summary()', () => {
  const D = baseD({
    accounts: [{ id: 'a1', ownership: 'SELF' }, { id: 'a2', ownership: 'investor' }],
    assets: [{ id: 's1', ownership: 'CUSTOMER' }],
    investments: [{ id: 'i1', ownership: 'family' }],
    vehicles: [{ id: 'v1', ownership: 'THIRD_PARTY' }, { id: 'v2' }],
  });
  const { ctx, listEl } = makeCtx(D);
  const s = ctx.OwnershipSettingsPresenter.summary();
  ctx.DashboardHubOwnershipSummary.render();
  // s.counts: SELF:2, INVESTOR:1, CUSTOMER:1, THIRD_PARTY:1, FAMILY:1
  Object.keys(s.counts).forEach((type) => {
    const label = ctx.OwnershipEngine.label(type);
    const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</div></div><div class="u-fs14 u-fw600">' + s.counts[type] + '</div>');
    assert.match(listEl.innerHTML, re, `label ${label} harus diikuti angka ${s.counts[type]}`);
  });
});

test('render() — entity tanpa field ownership dianggap SELF (fallback default, konsisten dgn OwnershipEngine.resolve)', () => {
  const D = baseD({ accounts: [{ id: 'a1' }, { id: 'a2' }] });
  const { ctx, listEl } = makeCtx(D);
  ctx.DashboardHubOwnershipSummary.render();
  assert.match(listEl.innerHTML, /Milik Sendiri<\/div><\/div><div class="u-fs14 u-fw600">2<\/div>/);
});
