'use strict';
// tests/fuel-insight-engine.test.js — cakupan modules/vehicle/
// fuel-insight-engine.js (TASK-149, Fuel Insight Engine). Semua
// dependency (FuelGaugeEngine/FuelPredictionEngine/FuelCostAnalytics/
// FuelMaintenanceEngine) di-mock lewat extraGlobals — test ini fokus ke
// logic penyusunan insight/ringkasan/urutan prioritas di engine ini
// sendiri, bukan ikut nge-test ulang formula km/L/Rp-per-km/interval
// servis/degradasi/proyeksi di dependency-nya (masing-masing sudah ada
// test sendiri: fuel-cost-analytics.test.js, fuel-prediction-engine.test.js,
// fuel-maintenance-engine.test.js, dst).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, mocks = {}) {
  return loadSource(
    ['modules/vehicle/fuel-insight-engine.js'],
    {
      D,
      FuelGaugeEngine: mocks.FuelGaugeEngine,
      FuelPredictionEngine: mocks.FuelPredictionEngine,
      FuelCostAnalytics: mocks.FuelCostAnalytics,
      FuelMaintenanceEngine: mocks.FuelMaintenanceEngine,
      FuelTankProfile: mocks.FuelTankProfile,
    },
    ['FuelInsightEngine'],
  );
}

const VEH = { id: 'v1', name: 'Vario 125' };
const VEH_WITH_FUEL_STATE = { id: 'v1', name: 'Vario 125', fuelState: { currentFuelLiter: 2, confidenceScore: 80 } };

const NOT_OK = { ok: false, reason: 'Data belum cukup' };

// --- getInsights() ----------------------------------------------------

test('getInsights() — {ok:false} kalau kendaraan tidak ditemukan (invalid vehicle)', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {});
  const res = ctx.FuelInsightEngine.getInsights('v9-tidak-ada');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Kendaraan tidak ditemukan');
});

test('getInsights() — {ok:true, insights:[]} kalau semua dependency belum dimuat / data kosong (empty history)', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {});
  const res = ctx.FuelInsightEngine.getInsights('v1');
  assert.equal(res.ok, true);
  assert.equal(res.insights.length, 0);
});

test('getInsights() — {ok:true, insights:[]} kalau engine dimuat tapi semua method balikin {ok:false} (missing profile / data belum cukup)', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelCostAnalytics: {
      costPerKm: () => NOT_OK,
      monthlyCost: () => NOT_OK,
      projectedMonthlyCost: () => NOT_OK,
    },
    FuelMaintenanceEngine: {
      fuelEfficiencyHealth: () => NOT_OK,
      maintenanceRisk: () => NOT_OK,
      maintenanceRecommendation: () => NOT_OK,
    },
    FuelGaugeEngine: { getReserveStatus: () => NOT_OK },
    FuelPredictionEngine: {
      predictNextRefuel: () => NOT_OK,
      predictMonthlyFuelUsage: () => NOT_OK,
      predictYearlyFuelUsage: () => NOT_OK,
      predictRemainingDistance: () => NOT_OK,
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  assert.equal(res.ok, true);
  assert.equal(res.insights.length, 0);
});

test('getInsights() — menyusun insight "Fuel Consumption" dari FuelCostAnalytics.costPerKm()', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelCostAnalytics: {
      costPerKm: () => ({ ok: true, costPerKm: 250, kmPerLiter: 40, averageFuelPrice: 10000 }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  assert.equal(res.ok, true);
  const insight = res.insights.find((i) => i.type === 'Fuel Consumption');
  assert.ok(insight);
  assert.equal(insight.priority, 'INFO');
  assert.equal(insight.source, 'FuelCostAnalytics.costPerKm');
  assert.match(insight.description, /40\.0 km\/liter/);
});

test('getInsights() — insight "Monthly Cost" pakai histori aktual kalau tersedia', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelCostAnalytics: {
      monthlyCost: () => ({ ok: true, month: '2026-07', totalLiter: 20, totalCost: 200000, averagePrice: 10000 }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const insight = res.insights.find((i) => i.type === 'Monthly Cost');
  assert.ok(insight);
  assert.equal(insight.source, 'FuelCostAnalytics.monthlyCost');
  assert.match(insight.title, /Biaya BBM bulan ini/);
});

test('getInsights() — insight "Monthly Cost" fallback ke proyeksi kalau belum ada transaksi bulan ini', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelCostAnalytics: {
      monthlyCost: () => NOT_OK,
      projectedMonthlyCost: () => ({ ok: true, estimatedCost: 150000, estimatedLiter: 15, confidenceScore: 70 }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const insight = res.insights.find((i) => i.type === 'Monthly Cost');
  assert.ok(insight);
  assert.equal(insight.source, 'FuelCostAnalytics.projectedMonthlyCost');
  assert.equal(insight.confidence, 70);
});

test('getInsights() — insight "Fuel Efficiency" priority CRITICAL kalau dropPct >= 30', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelMaintenanceEngine: {
      fuelEfficiencyHealth: () => ({ ok: true, kmPerLiter: 28, dropPct: 35, thresholdPct: 20, degradationDetected: true, status: 'menurun' }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const insight = res.insights.find((i) => i.type === 'Fuel Efficiency');
  assert.ok(insight);
  assert.equal(insight.priority, 'CRITICAL');
});

test('getInsights() — insight "Fuel Efficiency" priority HIGH kalau dropPct < 30', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelMaintenanceEngine: {
      fuelEfficiencyHealth: () => ({ ok: true, kmPerLiter: 30, dropPct: 22, thresholdPct: 20, degradationDetected: true, status: 'menurun' }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const insight = res.insights.find((i) => i.type === 'Fuel Efficiency');
  assert.equal(insight.priority, 'HIGH');
});

test('getInsights() — insight "Fuel Efficiency" priority INFO kalau tidak ada degradasi', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelMaintenanceEngine: {
      fuelEfficiencyHealth: () => ({ ok: true, kmPerLiter: 40, dropPct: null, thresholdPct: null, degradationDetected: false, status: 'baik' }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const insight = res.insights.find((i) => i.type === 'Fuel Efficiency');
  assert.equal(insight.priority, 'INFO');
  assert.match(insight.title, /stabil/);
});

test('getInsights() — insight "Maintenance" mapping riskLevel -> priority (tinggi->CRITICAL)', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelMaintenanceEngine: {
      maintenanceRisk: () => ({ ok: true, riskLevel: 'tinggi', overdueCount: 2, overdueLewatCount: 1, degradationDetected: true }),
      maintenanceRecommendation: () => ({ ok: true, recommendations: ['Cek oli mesin.'] }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const insight = res.insights.find((i) => i.type === 'Maintenance');
  assert.ok(insight);
  assert.equal(insight.priority, 'CRITICAL');
  assert.match(insight.recommendation, /Cek oli mesin/);
});

test('getInsights() — insight "Maintenance" riskLevel sedang -> MEDIUM, rendah -> LOW', () => {
  const ctxSedang = makeCtx({ vehicles: [VEH] }, {
    FuelMaintenanceEngine: {
      maintenanceRisk: () => ({ ok: true, riskLevel: 'sedang', overdueCount: 1, overdueLewatCount: 0, degradationDetected: false }),
      maintenanceRecommendation: () => ({ ok: true, recommendations: [] }),
    },
  });
  const insightSedang = ctxSedang.FuelInsightEngine.getInsights('v1').insights.find((i) => i.type === 'Maintenance');
  assert.equal(insightSedang.priority, 'MEDIUM');
  assert.match(insightSedang.recommendation, /Tidak ada rekomendasi/);

  const ctxRendah = makeCtx({ vehicles: [VEH] }, {
    FuelMaintenanceEngine: {
      maintenanceRisk: () => ({ ok: true, riskLevel: 'rendah', overdueCount: 0, overdueLewatCount: 0, degradationDetected: false }),
      maintenanceRecommendation: () => ({ ok: true, recommendations: [] }),
    },
  });
  const insightRendah = ctxRendah.FuelInsightEngine.getInsights('v1').insights.find((i) => i.type === 'Maintenance');
  assert.equal(insightRendah.priority, 'LOW');
});

test('getInsights() — insight "Reserve Fuel" CRITICAL kalau inReserve:true', () => {
  const ctx = makeCtx({ vehicles: [VEH_WITH_FUEL_STATE] }, {
    FuelGaugeEngine: {
      getReserveStatus: (vehicleId, liter) => ({ ok: true, vehicleId, inReserve: true, reserveLiter: 2, literAboveReserve: 0, clamped: false }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const insight = res.insights.find((i) => i.type === 'Reserve Fuel');
  assert.ok(insight);
  assert.equal(insight.priority, 'CRITICAL');
});

test('getInsights() — insight "Reserve Fuel" tidak dibuat kalau fuelState.currentFuelLiter belum ada', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelGaugeEngine: { getReserveStatus: () => ({ ok: true, inReserve: true, reserveLiter: 2, literAboveReserve: 0 }) },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  assert.equal(res.insights.find((i) => i.type === 'Reserve Fuel'), undefined);
});

test('getInsights() — insight "Next Refuel" priority berdasarkan estimatedRemainingDays', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelPredictionEngine: {
      predictNextRefuel: () => ({ ok: true, estimatedDate: '2026-07-23', estimatedRemainingDays: 1, estimatedRemainingKm: 10 }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const insight = res.insights.find((i) => i.type === 'Next Refuel');
  assert.ok(insight);
  assert.equal(insight.priority, 'CRITICAL');
});

test('getInsights() — insight "Prediction" dari predictMonthlyFuelUsage()/predictYearlyFuelUsage()', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelPredictionEngine: {
      predictMonthlyFuelUsage: () => ({ ok: true, estimatedLiter: 15, estimatedCost: 150000 }),
      predictYearlyFuelUsage: () => ({ ok: true, estimatedLiter: 180, estimatedCost: 1800000 }),
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const insight = res.insights.find((i) => i.type === 'Prediction');
  assert.ok(insight);
  assert.equal(insight.priority, 'INFO');
  assert.match(insight.description, /setahun/);
});

test('getInsights() — priority ordering: CRITICAL sebelum HIGH sebelum MEDIUM sebelum LOW sebelum INFO', () => {
  const ctx = makeCtx({ vehicles: [VEH_WITH_FUEL_STATE] }, {
    FuelCostAnalytics: {
      costPerKm: () => ({ ok: true, costPerKm: 250, kmPerLiter: 40, averageFuelPrice: 10000 }), // INFO
    },
    FuelMaintenanceEngine: {
      fuelEfficiencyHealth: () => ({ ok: true, kmPerLiter: 28, dropPct: 35, thresholdPct: 20, degradationDetected: true, status: 'menurun' }), // CRITICAL
      maintenanceRisk: () => ({ ok: true, riskLevel: 'sedang', overdueCount: 1, overdueLewatCount: 0, degradationDetected: false }), // MEDIUM
      maintenanceRecommendation: () => ({ ok: true, recommendations: [] }),
    },
    FuelGaugeEngine: {
      getReserveStatus: () => ({ ok: true, inReserve: false, reserveLiter: 2, literAboveReserve: 5 }), // INFO
    },
    FuelPredictionEngine: {
      predictNextRefuel: () => ({ ok: true, estimatedDate: '2026-07-30', estimatedRemainingDays: 5, estimatedRemainingKm: 50 }), // MEDIUM
    },
  });
  const res = ctx.FuelInsightEngine.getInsights('v1');
  const priorities = res.insights.map((i) => i.priority);
  for (let i = 1; i < priorities.length; i++) {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    assert.ok(order[priorities[i - 1]] <= order[priorities[i]], 'urutan prioritas harus menaik: ' + priorities.join(','));
  }
  assert.equal(priorities[0], 'CRITICAL');
});

// --- getSummary() -------------------------------------------------------

test('getSummary() — {ok:false} kalau kendaraan tidak ditemukan (invalid vehicle)', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {});
  const res = ctx.FuelInsightEngine.getSummary('v9-tidak-ada');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Kendaraan tidak ditemukan');
});

test('getSummary() — semua field null kalau semua dependency belum dimuat (empty history)', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {});
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.equal(res.ok, true);
  assert.equal(res.healthScore, null);
  assert.equal(res.efficiencyScore, null);
  assert.equal(res.monthlyCost, null);
  assert.equal(res.remainingDistance, null);
  assert.equal(res.maintenanceRisk, null);
  assert.equal(res.confidenceScore, null);
});

test('getSummary() — semua field null kalau kendaraan valid tapi profil/data belum cukup (missing profile)', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelMaintenanceEngine: { fuelEfficiencyHealth: () => NOT_OK, maintenanceRisk: () => NOT_OK },
    FuelCostAnalytics: { monthlyCost: () => NOT_OK, projectedMonthlyCost: () => NOT_OK },
    FuelPredictionEngine: { predictRemainingDistance: () => NOT_OK },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.equal(res.ok, true);
  assert.equal(res.healthScore, null);
  assert.equal(res.monthlyCost, null);
  assert.equal(res.remainingDistance, null);
});

test('getSummary() — efficiencyScore 100 kalau tidak ada degradasi, healthScore gabungan dgn maintenanceRisk', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelMaintenanceEngine: {
      fuelEfficiencyHealth: () => ({ ok: true, kmPerLiter: 40, dropPct: null, thresholdPct: null, degradationDetected: false, status: 'baik' }),
      maintenanceRisk: () => ({ ok: true, riskLevel: 'rendah', overdueCount: 0, overdueLewatCount: 0, degradationDetected: false }),
    },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.equal(res.efficiencyScore, 100);
  assert.equal(res.maintenanceRisk, 'rendah');
  assert.equal(res.healthScore, 100); // (100 + 100) / 2
});

test('getSummary() — efficiencyScore turun sesuai dropPct kalau ada degradasi', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelMaintenanceEngine: {
      fuelEfficiencyHealth: () => ({ ok: true, kmPerLiter: 28, dropPct: 35, thresholdPct: 20, degradationDetected: true, status: 'menurun' }),
      maintenanceRisk: () => ({ ok: true, riskLevel: 'tinggi', overdueCount: 1, overdueLewatCount: 1, degradationDetected: true }),
    },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.equal(res.efficiencyScore, 65); // 100 - 35
  assert.equal(res.maintenanceRisk, 'tinggi');
  assert.equal(res.healthScore, Math.round((65 + 40) / 2)); // 53
});

test('getSummary() — monthlyCost dari histori aktual kalau tersedia', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelCostAnalytics: {
      monthlyCost: () => ({ ok: true, month: '2026-07', totalLiter: 20, totalCost: 200000, averagePrice: 10000 }),
    },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.equal(res.monthlyCost, 200000);
  assert.equal(res.confidenceScore, null);
});

test('getSummary() — monthlyCost fallback ke proyeksi + confidenceScore ikut proyeksi kalau belum ada transaksi bulan ini', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelCostAnalytics: {
      monthlyCost: () => NOT_OK,
      projectedMonthlyCost: () => ({ ok: true, estimatedCost: 150000, estimatedLiter: 15, confidenceScore: 60 }),
    },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.equal(res.monthlyCost, 150000);
  assert.equal(res.confidenceScore, 60);
});

test('getSummary() — remainingDistance dari FuelPredictionEngine.predictRemainingDistance()', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelPredictionEngine: {
      predictRemainingDistance: () => ({ ok: true, remainingKm: 320, currentFuelLiter: 8, kmPerLiter: 40, confidenceScore: 90 }),
    },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.equal(res.remainingDistance, 320);
  assert.equal(res.confidenceScore, 90);
});

test('getSummary() — confidenceScore tidak ditimpa proyeksi kalau sudah terisi dari remainingDistance', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelCostAnalytics: {
      monthlyCost: () => NOT_OK,
      projectedMonthlyCost: () => ({ ok: true, estimatedCost: 150000, estimatedLiter: 15, confidenceScore: 60 }),
    },
    FuelPredictionEngine: {
      predictRemainingDistance: () => ({ ok: true, remainingKm: 320, currentFuelLiter: 8, kmPerLiter: 40, confidenceScore: 90 }),
    },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  // confidenceScore diisi dari projectedMonthlyCost() duluan (60), predictRemainingDistance()
  // TIDAK menimpanya krn sudah tidak null.
  assert.equal(res.confidenceScore, 60);
});

// --- TASK-150A: getSummary() field `fuel` (Expand Summary API) ---------

test('getSummary() — fuel:null kalau belum ada fuelState.currentFuelLiter tersimpan sama sekali', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelGaugeEngine: {
      calculateFuelBar: () => ({ ok: true, vehicleId: 'v1', bar: 4, clamped: false }),
      calculateFuelPercent: () => ({ ok: true, vehicleId: 'v1', percent: 50, clamped: false }),
      getReserveStatus: () => ({ ok: true, vehicleId: 'v1', inReserve: false, reserveLiter: 2, literAboveReserve: 2 }),
    },
    FuelTankProfile: { get: () => ({ fuelBarCount: 8 }) },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.equal(res.ok, true);
  assert.equal(res.fuel, null);
});

test('getSummary() — fuel.currentBar/fuel.fuelPercent dari FuelGaugeEngine.calculateFuelBar()/calculateFuelPercent()', () => {
  const ctx = makeCtx({ vehicles: [VEH_WITH_FUEL_STATE] }, {
    FuelGaugeEngine: {
      calculateFuelBar: () => ({ ok: true, vehicleId: 'v1', bar: 3.5, clamped: false }),
      calculateFuelPercent: () => ({ ok: true, vehicleId: 'v1', percent: 44, clamped: false }),
      getReserveStatus: () => ({ ok: true, vehicleId: 'v1', inReserve: false, reserveLiter: 1, literAboveReserve: 1 }),
    },
    FuelTankProfile: { get: () => ({ fuelBarCount: 8 }) },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.ok(res.fuel);
  assert.equal(res.fuel.currentBar, 3.5);
  assert.equal(res.fuel.fuelPercent, 44);
});

test('getSummary() — fuel.remainingLiter dibaca apa adanya dari fuelState.currentFuelLiter', () => {
  const ctx = makeCtx({ vehicles: [VEH_WITH_FUEL_STATE] }, {
    FuelGaugeEngine: {
      calculateFuelBar: () => ({ ok: true, vehicleId: 'v1', bar: 3.5, clamped: false }),
      calculateFuelPercent: () => ({ ok: true, vehicleId: 'v1', percent: 44, clamped: false }),
      getReserveStatus: () => ({ ok: true, vehicleId: 'v1', inReserve: false, reserveLiter: 1, literAboveReserve: 1 }),
    },
    FuelTankProfile: { get: () => ({ fuelBarCount: 8 }) },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  // VEH_WITH_FUEL_STATE.fuelState.currentFuelLiter === 2
  assert.equal(res.fuel.remainingLiter, 2);
});

test('getSummary() — fuel.reserve/fuel.reserveLiter dari FuelGaugeEngine.getReserveStatus()', () => {
  const ctx = makeCtx({ vehicles: [VEH_WITH_FUEL_STATE] }, {
    FuelGaugeEngine: {
      calculateFuelBar: () => ({ ok: true, vehicleId: 'v1', bar: 1, clamped: false }),
      calculateFuelPercent: () => ({ ok: true, vehicleId: 'v1', percent: 12, clamped: false }),
      getReserveStatus: () => ({ ok: true, vehicleId: 'v1', inReserve: true, reserveLiter: 2, literAboveReserve: 0 }),
    },
    FuelTankProfile: { get: () => ({ fuelBarCount: 8 }) },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.equal(res.fuel.reserve, true);
  assert.equal(res.fuel.reserveLiter, 2);
});

test('getSummary() — fuel.maxBar dari FuelTankProfile.get().fuelBarCount (dibaca apa adanya)', () => {
  const ctx = makeCtx({ vehicles: [VEH_WITH_FUEL_STATE] }, {
    FuelGaugeEngine: {
      calculateFuelBar: () => ({ ok: true, vehicleId: 'v1', bar: 3, clamped: false }),
      calculateFuelPercent: () => ({ ok: true, vehicleId: 'v1', percent: 40, clamped: false }),
      getReserveStatus: () => ({ ok: true, vehicleId: 'v1', inReserve: false, reserveLiter: 1, literAboveReserve: 1 }),
    },
    FuelTankProfile: { get: () => ({ fuelBarCount: 6 }) },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.equal(res.fuel.maxBar, 6);
});

test('getSummary() — fuel object tetap ada (field sebagian null) kalau FuelGaugeEngine/FuelTankProfile belum dimuat tapi liter sudah tersimpan', () => {
  const ctx = makeCtx({ vehicles: [VEH_WITH_FUEL_STATE] }, {});
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.ok(res.fuel);
  assert.equal(res.fuel.remainingLiter, 2);
  assert.equal(res.fuel.currentBar, null);
  assert.equal(res.fuel.fuelPercent, null);
  assert.equal(res.fuel.reserve, null);
  assert.equal(res.fuel.reserveLiter, null);
  assert.equal(res.fuel.maxBar, null);
});

// --- TASK-150A: getSummary() field `highestInsight` ---------------------

test('getSummary() — highestInsight null kalau tidak ada insight sama sekali (empty history)', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {});
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.equal(res.highestInsight, null);
});

test('getSummary() — highestInsight sama persis dgn getInsights().insights[0] (sudah diurutkan prioritas)', () => {
  const ctx = makeCtx({ vehicles: [VEH_WITH_FUEL_STATE] }, {
    FuelCostAnalytics: {
      costPerKm: () => ({ ok: true, costPerKm: 250, kmPerLiter: 40, averageFuelPrice: 10000 }), // INFO
    },
    FuelMaintenanceEngine: {
      fuelEfficiencyHealth: () => ({ ok: true, kmPerLiter: 28, dropPct: 35, thresholdPct: 20, degradationDetected: true, status: 'menurun' }), // CRITICAL
      maintenanceRisk: () => ({ ok: true, riskLevel: 'sedang', overdueCount: 1, overdueLewatCount: 0, degradationDetected: false }), // MEDIUM
      maintenanceRecommendation: () => ({ ok: true, recommendations: [] }),
    },
    FuelGaugeEngine: {
      getReserveStatus: () => ({ ok: true, inReserve: false, reserveLiter: 2, literAboveReserve: 5 }), // INFO
    },
  });
  const insightsRes = ctx.FuelInsightEngine.getInsights('v1');
  const res = ctx.FuelInsightEngine.getSummary('v1');
  assert.ok(res.highestInsight);
  assert.deepEqual(res.highestInsight, insightsRes.insights[0]);
  assert.equal(res.highestInsight.priority, 'CRITICAL');
});

// --- TASK-150A: Backward compatibility -----------------------------------

test('getSummary() — backward compatible: seluruh field lama tetap ada & tidak berubah nama/nilai', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelMaintenanceEngine: {
      fuelEfficiencyHealth: () => ({ ok: true, kmPerLiter: 40, dropPct: null, thresholdPct: null, degradationDetected: false, status: 'baik' }),
      maintenanceRisk: () => ({ ok: true, riskLevel: 'rendah', overdueCount: 0, overdueLewatCount: 0, degradationDetected: false }),
    },
  });
  const res = ctx.FuelInsightEngine.getSummary('v1');
  // Field lama TASK-149 harus tetap persis sama (nama & nilai) walau
  // TASK-150A menambah field baru — caller lama yang cuma baca field ini
  // tidak boleh terpengaruh sama sekali.
  assert.equal(res.ok, true);
  assert.equal(res.efficiencyScore, 100);
  assert.equal(res.maintenanceRisk, 'rendah');
  assert.equal(res.healthScore, 100);
  assert.equal(res.monthlyCost, null);
  assert.equal(res.remainingDistance, null);
  assert.equal(res.confidenceScore, null);
  // Field baru TASK-150A hadir sbg TAMBAHAN, bukan pengganti.
  assert.ok('fuel' in res);
  assert.ok('highestInsight' in res);
});

test('getSummary() — invalid vehicle tetap {ok:false} sama persis (tidak terpengaruh field baru)', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {});
  const res = ctx.FuelInsightEngine.getSummary('v9-tidak-ada');
  // Bandingkan per-field (bukan deepEqual whole-object) krn res berasal
  // dari realm vm terpisah — object literal pembanding di sini beda
  // prototype walau isinya identik (bukan bug kode, murni batasan harness).
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Kendaraan tidak ditemukan');
  assert.equal(Object.keys(res).length, 2);
});
