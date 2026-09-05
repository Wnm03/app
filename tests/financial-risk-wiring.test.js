'use strict';
// tests/financial-risk-wiring.test.js — Regression test utk wiring
// FinancialRiskDashboardAPI ke LifeDashboardSummaryAPI/PriorityEngine
// (sesi lanjutan AUDIT-DASHBOARD-INSIGHT-COVERAGE.md §5 "1 modul
// finance-analytics per sesi", dimulai dari FinancialRiskDashboardAPI).
// Pola sama persis tests/piutang-utang-reminder-wiring.test.js — layer
// di bawah/atas di-mock langsung sbg plain object, TIDAK perlu load
// file aslinya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- LifeDashboardSummaryAPI ---------------------------------------

function lifeCtx(stubs) {
  const ctx = loadSource(['modules/cross/life-dashboard-summary-api.js'], stubs, ['LifeDashboardSummaryAPI']);
  return ctx.LifeDashboardSummaryAPI;
}

function baseUnified(overrides) {
  return Object.assign({
    ok: true,
    finance: { ok: true, budget: { ok: true, overCount: 0 } },
    vehicle: { ok: true, reminder: { overdueCount: 0, dueSoonCount: 0 } },
    insightCount: 0,
  }, overrides);
}

test('LifeDashboardSummaryAPI.summary(): FinancialRiskDashboardAPI belum dimuat -> financialRisk default ok:true/kosong, priorityCount TIDAK berubah', () => {
  const api = lifeCtx({
    UnifiedSummaryAPI: { summary: () => baseUnified({ finance: { ok: true, budget: { ok: true, overCount: 1 } } }) },
  });
  const r = api.summary();
  assert.equal(r.ok, true);
  assert.equal(r.financialRisk.ok, true);
  assert.equal(r.financialRisk.riskFactors.length, 0);
  assert.equal(r.financialRisk.riskLevel.level, 'low');
  assert.equal(r.financialRisk.riskLevel.label, 'Rendah');
  assert.equal(r.priorityCount, 1);
});

test('LifeDashboardSummaryAPI.summary(): FinancialRiskDashboardAPI.summary() apa adanya jadi field financialRisk, riskFactors.length ikut priorityCount', () => {
  const riskStub = {
    ok: true,
    riskFactors: [
      { domain: 'debt', icon: '📕', type: 'warning', code: 'x', message: 'a' },
      { domain: 'health', icon: '❤️', type: 'warning', code: 'y', message: 'b' },
    ],
    riskLevel: { count: 2, level: 'medium', label: 'Sedang' },
  };
  const api = lifeCtx({
    UnifiedSummaryAPI: { summary: () => baseUnified({ finance: { ok: true, budget: { ok: true, overCount: 2 } }, vehicle: { ok: true, reminder: { overdueCount: 1, dueSoonCount: 0 } } }) },
    FinancialRiskDashboardAPI: { summary: () => riskStub },
  });
  const r = api.summary();
  assert.equal(r.financialRisk, riskStub);
  assert.equal(r.priorityCount, 2 + 1 + 0 + 2); // budgetOver+vehicleOverdue+vehicleDueSoon+riskFactors.length
});

// --- PriorityEngine ---------------------------------------------------

function priorityCtx(LifeDashboardSummaryAPI) {
  const ctx = loadSource(['modules/cross/priority-engine.js'], { LifeDashboardSummaryAPI }, ['PriorityEngine']);
  return ctx.PriorityEngine;
}

test('PriorityEngine.getItems(): s.financialRisk tidak ada (mock lama tanpa field ini) -> tidak throw, item lain tetap seperti sebelumnya', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({ ok: true, finance: { ok: true, budget: { ok: true, items: [{ name: 'Makan', over: true }] } }, vehicle: { ok: true, reminder: { all: [] } } }),
  });
  const r = PriorityEngine.getItems();
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].kind, 'finance');
});

test('PriorityEngine.getItems(): s.financialRisk.riskFactors dipetakan jadi kind financialRisk severity warning, apa adanya (tanpa filter tambahan)', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [] } },
      vehicle: { ok: true, reminder: { all: [] } },
      financialRisk: { riskFactors: [
        { domain: 'debt', message: 'DSR tinggi' },
        { domain: 'emergency_fund', message: 'Dana Darurat belum tercapai' },
      ] },
    }),
  });
  const r = PriorityEngine.getItems();
  const kinds = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(kinds, 'financialRisk:warning,financialRisk:warning');
  assert.equal(r.items[0].domain, 'debt');
  assert.equal(r.items[0].message, 'DSR tinggi');
});

test('PriorityEngine.getItems(): urutan financialRisk PALING AKHIR, setelah danaTitipan', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [{ name: 'Makan', over: true }] } },
      vehicle: { ok: true, reminder: { all: [
        { type: 'oli', severity: 'overdue', message: 'oli' },
        { type: 'ban', severity: 'due-soon', message: 'ban' },
      ] } },
      danaTitipan: { all: [{ type: 'danaTitipan', severity: 'warning', message: 'gap' }] },
      financialRisk: { riskFactors: [{ domain: 'debt', message: 'DSR tinggi' }] },
    }),
  });
  const r = PriorityEngine.getItems();
  const order = r.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(order, 'vehicle:overdue,finance:over,vehicle:due-soon,danaTitipan:warning,financialRisk:warning');
});

test('PriorityEngine.getItems(): count selalu sama dengan items.length (termasuk item financialRisk)', () => {
  const PriorityEngine = priorityCtx({
    summary: () => ({
      ok: true,
      finance: { ok: true, budget: { ok: true, items: [] } },
      vehicle: { ok: true, reminder: { all: [] } },
      financialRisk: { riskFactors: [{ domain: 'debt', message: 'm1' }, { domain: 'health', message: 'm2' }] },
    }),
  });
  const r = PriorityEngine.getItems();
  assert.equal(r.count, r.items.length);
  assert.equal(r.count, 2);
});
