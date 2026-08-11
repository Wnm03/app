'use strict';
// tests/fuel-analytics.test.js — cakupan modules/vehicle/fuel-analytics.js
// (TASK-141, Fuel Intelligence Card). Presenter tipis di atas
// FuelIntelligenceEngine.vehicleInsight() apa adanya -- dites lewat fake
// DOM minimal (pola sama dgn tests/fuel-card.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(ids) {
  const els = {};
  ids.forEach((id) => { els[id] = { innerHTML: '' }; });
  return { doc: { getElementById: (id) => els[id] || null }, els };
}

function makeCtx({ document, FuelIntelligenceEngine, escapeHtml, fmt } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-analytics.js'],
    {
      document,
      FuelIntelligenceEngine,
      escapeHtml: escapeHtml || ((s) => String(s)),
      fmt: fmt || ((n) => 'Rp ' + Math.round(n || 0)),
    },
    ['FuelAnalytics'],
  );
}

test('render() — kendaraan tidak ditemukan -> pesan empty-state', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelAnalyticsBody']);
  const ctx = makeCtx({ document: doc, FuelIntelligenceEngine: { vehicleInsight: () => ({ ok: false }) } });
  ctx.FuelAnalytics.render('v1');
  assert.match(els.fuelIntelAnalyticsBody.innerHTML, /tidak ditemukan/);
});

test('render() — efisiensi belum cukup -> pesan ajakan, tanpa kartu efisiensi', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelAnalyticsBody']);
  const insight = { ok: true, current: null, trend: { months: 6, rows: [], total: 0 } };
  const ctx = makeCtx({ document: doc, FuelIntelligenceEngine: { vehicleInsight: () => insight } });
  ctx.FuelAnalytics.render('v1');
  assert.match(els.fuelIntelAnalyticsBody.innerHTML, /belum cukup/);
});

test('render() — efisiensi & trend tersedia -> tampilkan kartu km\\/L, Rp\\/km, & bar bulanan', () => {
  const { doc, els } = makeFakeDoc(['fuelIntelAnalyticsBody']);
  const insight = {
    ok: true,
    current: { ok: true, kmPerLiter: 42.345, rpPerKm: 238, estMonthlyCost: 150000 },
    trend: { months: 3, total: 90000, rows: [
      { month: '2026-05', label: 'Mei 2026', total: 20000 },
      { month: '2026-06', label: 'Jun 2026', total: 30000 },
      { month: '2026-07', label: 'Jul 2026', total: 40000 },
    ] },
  };
  const ctx = makeCtx({ document: doc, FuelIntelligenceEngine: { vehicleInsight: () => insight } });
  ctx.FuelAnalytics.render('v1');
  const html = els.fuelIntelAnalyticsBody.innerHTML;
  assert.match(html, /42\.3 km\/L/);
  assert.match(html, /Estimasi\/Bulan/);
  assert.match(html, /Jul 2026/);
  assert.match(html, /width:100%/); // bulan dgn total tertinggi (40000) full-width
});
