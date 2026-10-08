'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadTrend(overrides = {}) {
  return loadSource(['modules/vehicle/fuel-trend-dashboard.js'], {
    document: { getElementById: () => null },
    escapeHtml: (s) => String(s),
    ...overrides,
  }, ['FuelTrendDashboard']);
}

function loadInsight(overrides = {}) {
  return loadSource(['modules/vehicle/fuel-insight-engine.js'], {
    D: { vehicles: [{ id: 'v1', name: 'Vario' }] },
    ...overrides,
  }, ['FuelInsightEngine']);
}

test('N12 behavior: field yang gagal menampilkan reason pada baris placeholder', () => {
  const ctx = loadTrend();
  const html = ctx.FuelTrendDashboard._predictionSectionHtml({
    remainingDistance: { ok: false, reason: 'Profil BBM belum tersedia' },
    nextRefuel: { ok: false, reason: 'Belum ada histori isi BBM' },
    monthlyUsage: { ok: false, reason: 'Data historis belum cukup' },
  });
  assert.match(html, /Profil BBM belum tersedia/);
  assert.match(html, /Belum ada histori isi BBM/);
  assert.match(html, /Data historis belum cukup/);
  assert.doesNotMatch(html, />undefined</);
});

test('N12 behavior: km/L dan Rp/km tidak menyembunyikan alasan saat data efisiensi gagal', () => {
  const ctx = loadTrend();
  const html = ctx.FuelTrendDashboard._maintenanceSectionHtml({
    efficiencyHealth: { ok: false, reason: 'Data efisiensi belum cukup' },
    maintenanceRisk: { ok: false, reason: 'Risiko belum dapat dihitung' },
    maintenanceRecommendation: { ok: false, reason: 'Rekomendasi belum tersedia' },
  });
  assert.match(html, /Data efisiensi belum cukup/);
  assert.doesNotMatch(html, />undefined</);
});

test('N14 behavior: biaya aktual dan estimasi tetap dibedakan, sementara prediksi pemakaian memakai satuan liter', () => {
  const ctx = loadTrend();
  const html = ctx.FuelTrendDashboard._body('v1', [{ id: 'v1', name: 'Vario' }], { ok: true, highestInsight: null }, {
    monthlyCost: { ok: true, totalCost: 220000 },
    projectedMonthlyCost: { ok: true, estimatedCost: 220000 },
    yearlyCost: { ok: true, totalCost: 1400000 },
    projectedYearlyCost: { ok: true, estimatedCost: 2640000 },
    averageFuelPrice: { ok: true, averagePrice: 10000 },
    refillFrequency: { ok: true, refillCount: 2, averageIntervalDays: 7 },
    remainingDistance: { ok: true, remainingKm: 45 },
    nextRefuel: { ok: true, estimatedDate: '2026-10-10', estimatedRemainingDays: 2 },
    monthlyUsage: { ok: true, estimatedLiter: 22 },
    efficiencyHealth: { ok: true, kmPerLiter: 25, rpPerKm: 400, status: 'baik' },
    maintenanceRisk: { ok: true, riskLevel: 'rendah' },
    maintenanceRecommendation: { ok: true, recommendations: [] },
  });
  assert.match(html, /Bulan Ini \(Aktual\)/);
  assert.match(html, /Estimasi bulanan \(rata-rata pola berkendara\)/);
  assert.match(html, /Estimasi Pemakaian Bulanan/);
  assert.match(html, /22 L/);
});

test('N15 behavior: insight monthly-cost memakai nama bulan manusiawi', () => {
  const ctx = loadInsight({
    FuelCostAnalytics: {
      monthlyCost: () => ({ ok: true, month: '2026-10', totalCost: 200000, totalLiter: 20, averagePrice: 10000 }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const insight = res.insights.find((x) => x.id === 'monthly-cost');
  assert.ok(insight);
  assert.match(insight.description, /Oktober 2026/);
  assert.doesNotMatch(insight.description, /2026-10/);
});

test('N15 behavior: insight prediction menyebut estimasi pemakaian bulanan, bukan bulan depan', () => {
  const ctx = loadInsight({
    FuelPredictionEngine: {
      predictMonthlyFuelUsage: () => ({ ok: true, estimatedLiter: 22, estimatedCost: 220000 }),
      predictYearlyFuelUsage: () => ({ ok: true, estimatedLiter: 264, estimatedCost: 2640000 }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const insight = res.insights.find((x) => x.id === 'prediction');
  assert.ok(insight);
  assert.match(insight.description, /Estimasi pemakaian bulanan/);
  assert.doesNotMatch(insight.description, /Perkiraan bulan depan/);
});
