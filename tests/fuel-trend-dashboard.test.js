'use strict';
// tests/fuel-trend-dashboard.test.js — cakupan modules/vehicle/
// fuel-trend-dashboard.js (TASK-156, Fuel Trend Dashboard). FuelTrendDashboard
// hanya presenter (baca FuelInsightEngine.getSummary() + FuelCostAnalytics/
// FuelPredictionEngine/FuelMaintenanceEngine apa adanya, susun 1 kartu trend
// + switcher kendaraan + CTA FuelModal/FuelBarCorrection) — render() butuh
// document.getElementById, jadi dites lewat fake DOM minimal (bukan jsdom),
// pola sama persis tests/fuel-dashboard.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(ids) {
  const els = {};
  ids.forEach((id) => { els[id] = { innerHTML: '', style: {}, textContent: '' }; });
  return {
    doc: { getElementById: (id) => els[id] || null },
    els,
  };
}

function makeCtx({ document, FuelInsightEngine, FuelCostAnalytics, FuelPredictionEngine, FuelMaintenanceEngine, curVehicleId, escapeHtml, D } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-trend-dashboard.js'],
    {
      document,
      FuelInsightEngine,
      FuelCostAnalytics,
      FuelPredictionEngine,
      FuelMaintenanceEngine,
      curVehicleId,
      escapeHtml: escapeHtml || ((s) => String(s)),
      D,
    },
    ['FuelTrendDashboard'],
  );
}

const SUMMARY_BASE = {
  ok: true,
  healthScore: 82,
  efficiencyScore: 90,
  monthlyCost: 150000,
  remainingDistance: 40,
  maintenanceRisk: 'rendah',
  confidenceScore: 100,
  fuel: { currentBar: 5, maxBar: 8, remainingLiter: 3.2, fuelPercent: 62, reserve: false, reserveLiter: 1 },
  highestInsight: { id: 'next-refuel', priority: 'MEDIUM', title: 'Perkiraan waktu isi BBM berikutnya', description: 'Estimasi 5 hari lagi.' },
};

const COST_ANALYTICS_OK = {
  monthlyCost: () => ({ ok: true, month: '2026-07', totalLiter: 20, totalCost: 200000, averagePrice: 10000 }),
  projectedMonthlyCost: () => ({ ok: true, estimatedCost: 220000, estimatedLiter: 22, confidenceScore: 100 }),
  yearlyCost: () => ({ ok: true, year: '2026', totalLiter: 140, totalCost: 1400000, averagePrice: 10000 }),
  projectedYearlyCost: () => ({ ok: true, estimatedCost: 2640000, estimatedLiter: 264, confidenceScore: 100 }),
  averageFuelPrice: () => ({ ok: true, averagePrice: 10200, totalLiter: 300, transactionCount: 30 }),
  refillFrequency: () => ({ ok: true, refillCount: 10, averageIntervalDays: 6.5 }),
};

const PREDICTION_ENGINE_OK = {
  predictRemainingDistance: () => ({ ok: true, remainingKm: 45.4, currentFuelLiter: 3.2, kmPerLiter: 25, confidenceScore: 100 }),
  predictNextRefuel: () => ({ ok: true, estimatedDate: '2026-07-30', estimatedRemainingDays: 5, estimatedRemainingKm: 40 }),
  predictMonthlyFuelUsage: () => ({ ok: true, estimatedLiter: 22, estimatedCost: 220000 }),
};

const MAINTENANCE_ENGINE_OK = {
  fuelEfficiencyHealth: () => ({ ok: true, vehicleId: 'v1', kmPerLiter: 25, rpPerKm: 400, degradationDetected: false, dropPct: null, thresholdPct: null, status: 'baik' }),
  maintenanceRisk: () => ({ ok: true, vehicleId: 'v1', riskLevel: 'rendah', overdueCount: 0, overdueLewatCount: 0, degradationDetected: false }),
  maintenanceRecommendation: () => ({ ok: true, vehicleId: 'v1', recommendations: ['Tidak ada indikasi masalah perawatan yang memengaruhi efisiensi BBM saat ini.'], hasMaintenanceImpact: false, degradationDetected: false }),
};

function fullDeps() {
  return {
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE }) },
    FuelCostAnalytics: { ...COST_ANALYTICS_OK },
    FuelPredictionEngine: { ...PREDICTION_ENGINE_OK },
    FuelMaintenanceEngine: { ...MAINTENANCE_ENGINE_OK },
  };
}

// --- Dashboard renders / smoke -----------------------------------------------

test('render() — smoke: kendaraan valid, wrap tampil & body terisi', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const ctx = makeCtx({ document: doc, ...fullDeps(), curVehicleId: 'v1', D });
  ctx.FuelTrendDashboard.render();
  assert.equal(els.fuelTrendWrap.style.display, '');
  assert.match(els.fuelTrendBody.innerHTML, /Fuel Trend Dashboard/);
  assert.match(els.fuelTrendBody.innerHTML, /Vario/);
});

// --- No vehicle ----------------------------------------------------------------

test('render() — 0 kendaraan sama sekali -> wrap disembunyikan', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [] };
  const ctx = makeCtx({ document: doc, FuelInsightEngine: { getSummary: () => ({ ok: false }) }, curVehicleId: null, D });
  ctx.FuelTrendDashboard.render();
  assert.equal(els.fuelTrendWrap.style.display, 'none');
});

test('render() — D/D.vehicles tidak ada -> diperlakukan seperti 0 kendaraan (tidak throw)', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const ctx = makeCtx({ document: doc, FuelInsightEngine: { getSummary: () => ({ ok: false }) }, curVehicleId: null, D: undefined });
  assert.doesNotThrow(() => ctx.FuelTrendDashboard.render());
  assert.equal(els.fuelTrendWrap.style.display, 'none');
});

test('render() — FuelInsightEngine belum dimuat -> wrap disembunyikan', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({ document: doc, FuelInsightEngine: undefined, curVehicleId: 'v1', D });
  ctx.FuelTrendDashboard.render();
  assert.equal(els.fuelTrendWrap.style.display, 'none');
});

test('render() — getSummary() {ok:false} utk kendaraan yang ada -> wrap disembunyikan (tidak throw)', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ok: false, reason: 'Kendaraan tidak ditemukan' }) },
    curVehicleId: 'v1',
    D,
  });
  assert.doesNotThrow(() => ctx.FuelTrendDashboard.render());
  assert.equal(els.fuelTrendWrap.style.display, 'none');
});

test('render() — getSummary() throw -> wrap disembunyikan (tidak throw ke pemanggil)', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => { throw new Error('boom'); } },
    curVehicleId: 'v1',
    D,
  });
  assert.doesNotThrow(() => ctx.FuelTrendDashboard.render());
  assert.equal(els.fuelTrendWrap.style.display, 'none');
});

// --- Single vehicle --------------------------------------------------------------

test('render() — 1 kendaraan -> switcher chip TIDAK ditampilkan', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const ctx = makeCtx({ document: doc, ...fullDeps(), curVehicleId: 'v1', D });
  ctx.FuelTrendDashboard.render();
  assert.doesNotMatch(els.fuelTrendBody.innerHTML, /data-action="FuelTrendDashboard\.switchVehicle"/);
});

// --- Multiple vehicles -------------------------------------------------------------

test('render() — >1 kendaraan -> switcher chip ditampilkan utk tiap kendaraan, aktif ditandai', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }, { id: 'v2', name: 'Beat', emoji: '🏍️' }] };
  const ctx = makeCtx({ document: doc, ...fullDeps(), curVehicleId: 'v1', D });
  ctx.FuelTrendDashboard.render();
  const html = els.fuelTrendBody.innerHTML;
  assert.match(html, /data-action="FuelTrendDashboard\.switchVehicle" data-args="\[.*v1.*\]"/);
  assert.match(html, /data-action="FuelTrendDashboard\.switchVehicle" data-args="\[.*v2.*\]"/);
  assert.match(html, /chip-btn active/);
});

test('switchVehicle(vehicleId) — delegasi penuh ke render(), 0 logic baru', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }, { id: 'v2', name: 'Beat' }] };
  const ctx = makeCtx({
    document: doc,
    ...fullDeps(),
    FuelInsightEngine: { getSummary: (vid) => ({ ...SUMMARY_BASE, healthScore: vid === 'v2' ? 55 : 82 }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelTrendDashboard.render('v1');
  assert.match(els.fuelTrendBody.innerHTML, /Vario/);
  ctx.FuelTrendDashboard.switchVehicle('v2');
  assert.match(els.fuelTrendBody.innerHTML, /Beat/);
});

// --- Invalid vehicle ---------------------------------------------------------------

test('render(vehicleId) — vehicleId tidak ada di D.vehicles -> fallback ke kendaraan pertama (tidak disembunyikan)', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }] };
  const ctx = makeCtx({
    document: doc,
    ...fullDeps(),
    FuelInsightEngine: { getSummary: (vid) => (vid === 'v1' ? { ...SUMMARY_BASE } : { ok: false }) },
    curVehicleId: 'v-ghost',
    D,
  });
  ctx.FuelTrendDashboard.render('v-ghost-yang-sudah-dihapus');
  assert.equal(els.fuelTrendWrap.style.display, '');
  assert.match(els.fuelTrendBody.innerHTML, /Vario/);
});

// --- Biaya & frekuensi BBM (FuelCostAnalytics) --------------------------------------

test('render() — biaya aktual & proyeksi bulan/tahun tampil dari FuelCostAnalytics apa adanya', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({ document: doc, ...fullDeps(), curVehicleId: 'v1', D });
  ctx.FuelTrendDashboard.render();
  const html = els.fuelTrendBody.innerHTML;
  assert.match(html, /Rp200\.000/);
  assert.match(html, /Rp220\.000/);
  assert.match(html, /Rp1\.400\.000/);
  assert.match(html, /Rp2\.640\.000/);
  assert.match(html, /Rp10\.200\/L/);
  assert.match(html, /10x, rata-rata 6\.5 hari/);
});

test('render() — FuelCostAnalytics belum dimuat -> section biaya tampil placeholder "-", section lain tetap render', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE }) },
    FuelCostAnalytics: undefined,
    FuelPredictionEngine: { ...PREDICTION_ENGINE_OK },
    FuelMaintenanceEngine: { ...MAINTENANCE_ENGINE_OK },
    curVehicleId: 'v1',
    D,
  });
  assert.doesNotThrow(() => ctx.FuelTrendDashboard.render());
  const html = els.fuelTrendBody.innerHTML;
  assert.match(html, /Bulan Ini \(Aktual\)<\/span><span class="u-fw700">-/);
  assert.match(html, /Estimasi Jarak Tersisa/); // section prediksi tetap tampil
});

test('render() — FuelCostAnalytics.monthlyCost() {ok:false} (belum ada transaksi bulan ini) -> "-", proyeksi tetap tampil', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    ...fullDeps(),
    FuelCostAnalytics: { ...COST_ANALYTICS_OK, monthlyCost: () => ({ ok: false, reason: 'Belum ada transaksi BBM bulan ini' }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelTrendDashboard.render();
  const html = els.fuelTrendBody.innerHTML;
  assert.match(html, /Bulan Ini \(Aktual\)<\/span><span class="u-fw700">-/);
  assert.match(html, /Rp220\.000/); // proyeksi bulan ini tetap tampil
});

// --- Prediksi (FuelPredictionEngine) ------------------------------------------------

test('render() — remaining distance/next refuel/monthly usage tampil dari FuelPredictionEngine apa adanya', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({ document: doc, ...fullDeps(), curVehicleId: 'v1', D });
  ctx.FuelTrendDashboard.render();
  const html = els.fuelTrendBody.innerHTML;
  assert.match(html, /45 km/);
  assert.match(html, /2026-07-30 \(5 hari lagi\)/);
  assert.match(html, /22 L \(Rp220\.000\)/);
});

test('render() — FuelPredictionEngine belum dimuat -> section prediksi placeholder "-", section lain tetap render', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE }) },
    FuelCostAnalytics: { ...COST_ANALYTICS_OK },
    FuelPredictionEngine: undefined,
    FuelMaintenanceEngine: { ...MAINTENANCE_ENGINE_OK },
    curVehicleId: 'v1',
    D,
  });
  assert.doesNotThrow(() => ctx.FuelTrendDashboard.render());
  const html = els.fuelTrendBody.innerHTML;
  assert.match(html, /Estimasi Jarak Tersisa<\/span><span class="u-fw700">-/);
  assert.match(html, /Rp200\.000/); // section biaya tetap tampil
});

// --- Efisiensi & Perawatan (FuelMaintenanceEngine) ----------------------------------

test('render() — status efisiensi baik & risiko rendah tampil dari FuelMaintenanceEngine apa adanya', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({ document: doc, ...fullDeps(), curVehicleId: 'v1', D });
  ctx.FuelTrendDashboard.render();
  const html = els.fuelTrendBody.innerHTML;
  assert.match(html, /Status Efisiensi<\/span><span class="u-fw700">Baik/);
  assert.match(html, /Risiko Perawatan<\/span><span class="u-fw700">rendah/);
  assert.match(html, /Tidak ada indikasi masalah perawatan/);
});

test('render() — degradasi terdeteksi -> status efisiensi tampil dropPct, risiko tinggi + rekomendasi', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    ...fullDeps(),
    FuelMaintenanceEngine: {
      fuelEfficiencyHealth: () => ({ ok: true, vehicleId: 'v1', kmPerLiter: 18, rpPerKm: 550, degradationDetected: true, dropPct: 22, thresholdPct: 15, status: 'menurun' }),
      maintenanceRisk: () => ({ ok: true, vehicleId: 'v1', riskLevel: 'tinggi', overdueCount: 2, overdueLewatCount: 2, degradationDetected: true }),
      maintenanceRecommendation: () => ({ ok: true, vehicleId: 'v1', recommendations: ['Cek/servis "Oli Mesin" — sudah lewat 300 km dari jadwal, berpotensi memengaruhi konsumsi BBM.'], hasMaintenanceImpact: true, degradationDetected: true }),
    },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelTrendDashboard.render();
  const html = els.fuelTrendBody.innerHTML;
  assert.match(html, /Menurun \(-22%\)/);
  assert.match(html, /Risiko Perawatan<\/span><span class="u-fw700">tinggi/);
  assert.match(html, /Cek\/servis "Oli Mesin"/);
});

test('render() — FuelMaintenanceEngine belum dimuat -> section efisiensi & perawatan placeholder "-", section lain tetap render', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE }) },
    FuelCostAnalytics: { ...COST_ANALYTICS_OK },
    FuelPredictionEngine: { ...PREDICTION_ENGINE_OK },
    FuelMaintenanceEngine: undefined,
    curVehicleId: 'v1',
    D,
  });
  assert.doesNotThrow(() => ctx.FuelTrendDashboard.render());
  const html = els.fuelTrendBody.innerHTML;
  assert.match(html, /Status Efisiensi<\/span><span class="u-fw700">-/);
  assert.match(html, /Rp200\.000/); // section biaya tetap tampil
});

// --- Highest insight (FuelInsightEngine) --------------------------------------------

test('render() — highestInsight CRITICAL -> tampil dgn warna merah', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    ...fullDeps(),
    FuelInsightEngine: {
      getSummary: () => ({
        ...SUMMARY_BASE,
        highestInsight: { id: 'reserve-fuel', priority: 'CRITICAL', title: 'BBM sudah masuk cadangan (reserve)', description: 'Segera isi BBM.' },
      }),
    },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelTrendDashboard.render();
  const html = els.fuelTrendBody.innerHTML;
  assert.match(html, /class="u-fs12 red"/);
  assert.match(html, /BBM sudah masuk cadangan \(reserve\)/);
});

test('render() — highestInsight null -> section insight dilewati (tidak error)', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({
    document: doc,
    ...fullDeps(),
    FuelInsightEngine: { getSummary: () => ({ ...SUMMARY_BASE, highestInsight: null }) },
    curVehicleId: 'v1',
    D,
  });
  assert.doesNotThrow(() => ctx.FuelTrendDashboard.render());
  assert.doesNotMatch(els.fuelTrendBody.innerHTML, /Insight Prioritas Tertinggi/);
});

// --- CTA reuse (FuelModal/FuelBarCorrection) ----------------------------------------

test('render() — tombol CTA reuse FuelModal.open()/FuelBarCorrection.open() (0 mekanisme baru)', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  const ctx = makeCtx({ document: doc, ...fullDeps(), curVehicleId: 'v1', D });
  ctx.FuelTrendDashboard.render();
  const html = els.fuelTrendBody.innerHTML;
  assert.match(html, /data-action="FuelModal\.open" data-args="\[.*v1.*\]"/);
  assert.match(html, /data-action="FuelBarCorrection\.open" data-args="\[.*v1.*\]"/);
});

// --- Refresh setelah transaksi/koreksi -----------------------------------------------

test('render() dipanggil ulang (pola refresh renderCnTab()/FuelBarCorrection.save()) — hasil selalu konsisten dgn data terbaru', () => {
  const { doc, els } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }] };
  let monthlyCostVal = 150000;
  const ctx = makeCtx({
    document: doc,
    ...fullDeps(),
    FuelCostAnalytics: { ...COST_ANALYTICS_OK, monthlyCost: () => ({ ok: true, month: '2026-07', totalLiter: 15, totalCost: monthlyCostVal, averagePrice: 10000 }) },
    curVehicleId: 'v1',
    D,
  });
  ctx.FuelTrendDashboard.render();
  assert.match(els.fuelTrendBody.innerHTML, /Rp150\.000/);
  monthlyCostVal = 300000;
  ctx.FuelTrendDashboard.render('v1');
  assert.match(els.fuelTrendBody.innerHTML, /Rp300\.000/);
});

// --- Read-only guarantee ---------------------------------------------------------------

test('render() — D tidak diubah sama sekali (read-only, presenter murni)', () => {
  const { doc } = makeFakeDoc(['fuelTrendWrap', 'fuelTrendBody']);
  const D = { vehicles: [{ id: 'v1', name: 'Vario', emoji: '🏍️' }, { id: 'v2', name: 'Beat' }], bbmLogs: [{ id: 'b1' }], servisLogs: [{ id: 's1' }] };
  const before = JSON.parse(JSON.stringify(D));
  const ctx = makeCtx({ document: doc, ...fullDeps(), curVehicleId: 'v1', D });
  ctx.FuelTrendDashboard.render();
  ctx.FuelTrendDashboard.switchVehicle('v2');
  assert.deepEqual(D, before);
});
