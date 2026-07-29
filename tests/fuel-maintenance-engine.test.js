'use strict';
// tests/fuel-maintenance-engine.test.js — cakupan modules/vehicle/
// fuel-maintenance-engine.js (TASK-148, Fuel Maintenance Intelligence
// Engine). Semua dependency (FuelCostAnalytics/fuelEfficiency()/
// predictService()/_vehicleFuelEfficiencyDropCheck()/findVehicleSpec())
// di-mock lewat extraGlobals — test ini fokus ke logic korelasi/
// rekomendasi/risiko di engine ini sendiri, bukan ikut nge-test ulang
// formula km/L/Rp-per-km/interval servis/deteksi drop di dependency-nya
// (masing-masing sudah ada test sendiri: fuel-cost-analytics.test.js,
// dst).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, mocks = {}) {
  return loadSource(
    ['modules/vehicle/fuel-maintenance-engine.js'],
    {
      D,
      FuelCostAnalytics: mocks.FuelCostAnalytics,
      fuelEfficiency: mocks.fuelEfficiency,
      predictService: mocks.predictService,
      _vehicleFuelEfficiencyDropCheck: mocks._vehicleFuelEfficiencyDropCheck,
      findVehicleSpec: mocks.findVehicleSpec,
    },
    ['FuelMaintenanceEngine'],
  );
}

const VEH = { id: 'v1', name: 'Vario 125' };

const COST_OK = () => ({ ok: true, costPerKm: 250, kmPerLiter: 40, averageFuelPrice: 10000 });

const SVC_OK = (items) => () => ({ ok: true, vehicleId: 'v1', curKm: 5000, kmPerDay: 10, items });

const ITEM = (categoryName, status, sisaKm) => ({ categoryId: 'c_' + categoryName, categoryName, lastKm: 1000, intervalKm: 4000, overridden: false, sisaKm, estDateISO: null, status });

// --- maintenanceImpact() -------------------------------------------------

test('maintenanceImpact() — deteksi item overdue relevan BBM (oli/saringan udara/busi/CVT) via keyword match', () => {
  const items = [
    ITEM('Oli Mesin', 'lewat', -200),
    ITEM('Saringan Udara', 'segera', 300),
    ITEM('Busi', 'aman', 3000),
    ITEM('Ban Belakang', 'lewat', -50), // tidak relevan BBM, tidak masuk overdueItems
  ];
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: SVC_OK(items),
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceImpact('v1');
  assert.equal(res.ok, true);
  assert.equal(res.kmPerLiter, 40);
  assert.equal(res.costPerKm, 250);
  assert.equal(res.hasMaintenanceImpact, true);
  assert.equal(res.overdueItems.length, 2); // Oli Mesin (lewat) + Saringan Udara (segera)
  assert.ok(res.overdueItems.some((it) => it.part === 'oil' && it.categoryName === 'Oli Mesin'));
  assert.ok(res.overdueItems.some((it) => it.part === 'airFilter'));
  // "Ban Belakang" lewat tapi tidak relevan BBM -> tidak masuk overdueItems,
  // tapi TETAP dihitung di serviceIntervalOverdueCount (sinyal umum).
  assert.equal(res.serviceIntervalOverdueCount, 2); // Oli Mesin + Ban Belakang (keduanya 'lewat')
});

test('maintenanceImpact() — hasMaintenanceImpact:false kalau semua item aman', () => {
  const items = [ITEM('Oli Mesin', 'aman', 3000), ITEM('Busi', 'aman', 3000)];
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { FuelCostAnalytics: { costPerKm: COST_OK }, predictService: SVC_OK(items) });
  const res = ctx.FuelMaintenanceEngine.maintenanceImpact('v1');
  assert.equal(res.ok, true);
  assert.equal(res.hasMaintenanceImpact, false);
  assert.equal(res.overdueItems.length, 0);
  assert.equal(res.serviceIntervalOverdueCount, 0);
});

test('maintenanceImpact() — tirePressureRef dari findVehicleSpec() (referensi statis, bukan histori)', () => {
  const D = { vehicles: [VEH] };
  const ban = { depan: { ukuran: '80/90-14', tekanan: '29 psi' }, belakang: { ukuran: '90/90-14', tekanan: '33 psi' } };
  const ctx = makeCtx(D, {
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: SVC_OK([]),
    findVehicleSpec: (name) => (name === 'Vario 125' ? { ban } : null),
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceImpact('v1');
  assert.equal(res.ok, true);
  assert.deepEqual(res.tirePressureRef, ban);
});

test('maintenanceImpact() — tirePressureRef null kalau findVehicleSpec() tidak dimuat/tidak match', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { FuelCostAnalytics: { costPerKm: COST_OK }, predictService: SVC_OK([]) });
  const res = ctx.FuelMaintenanceEngine.maintenanceImpact('v1');
  assert.equal(res.ok, true);
  assert.equal(res.tirePressureRef, null);
});

test('maintenanceImpact() — {ok:false} kalau kendaraan tidak ditemukan', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, { FuelCostAnalytics: { costPerKm: COST_OK }, predictService: SVC_OK([]) });
  const res = ctx.FuelMaintenanceEngine.maintenanceImpact('v9-tidak-ada');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Kendaraan tidak ditemukan');
});

test('maintenanceImpact() — {ok:false} kalau FuelCostAnalytics belum dimuat', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, { predictService: SVC_OK([]) });
  const res = ctx.FuelMaintenanceEngine.maintenanceImpact('v1');
  assert.equal(res.ok, false);
  assert.ok(res.reason);
});

test('maintenanceImpact() — {ok:false} diteruskan dari costPerKm() kalau data BBM kurang', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelCostAnalytics: { costPerKm: () => ({ ok: false, reason: 'Data BBM kurang' }) },
    predictService: SVC_OK([]),
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceImpact('v1');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Data BBM kurang');
});

test('maintenanceImpact() — {ok:false} kalau predictService() belum dimuat', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, { FuelCostAnalytics: { costPerKm: COST_OK } });
  const res = ctx.FuelMaintenanceEngine.maintenanceImpact('v1');
  assert.equal(res.ok, false);
  assert.ok(res.reason);
});

test('maintenanceImpact() — {ok:false} kalau belum ada kategori sparepart terdaftar (predictService gagal)', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: () => ({ ok: false, reason: 'Belum ada kategori sparepart terdaftar' }),
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceImpact('v1');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Belum ada kategori sparepart terdaftar');
});

// --- fuelEfficiencyHealth() -----------------------------------------------

test('fuelEfficiencyHealth() — degradationDetected:true kalau _vehicleFuelEfficiencyDropCheck() menandai vehicle ini', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 30, rpPerKm: 300 }),
    _vehicleFuelEfficiencyDropCheck: () => ({
      trigger: true,
      thresholdPct: 20,
      drops: [{ vehicleId: 'v1', vehicleName: 'Vario 125', dropPct: 35, last: 26, avgPrev: 40 }],
    }),
  });
  const res = ctx.FuelMaintenanceEngine.fuelEfficiencyHealth('v1');
  assert.equal(res.ok, true);
  assert.equal(res.degradationDetected, true);
  assert.equal(res.dropPct, 35);
  assert.equal(res.thresholdPct, 20);
  assert.equal(res.status, 'menurun');
});

test('fuelEfficiencyHealth() — status "baik" kalau kendaraan ini tidak ada di daftar drops', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, rpPerKm: 250 }),
    _vehicleFuelEfficiencyDropCheck: () => ({ trigger: false, thresholdPct: 20, drops: [] }),
  });
  const res = ctx.FuelMaintenanceEngine.fuelEfficiencyHealth('v1');
  assert.equal(res.ok, true);
  assert.equal(res.degradationDetected, false);
  assert.equal(res.dropPct, null);
  assert.equal(res.status, 'baik');
});

test('fuelEfficiencyHealth() — degradationDetected:false (bukan gagal) kalau _vehicleFuelEfficiencyDropCheck() belum dimuat', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, rpPerKm: 250 }) });
  const res = ctx.FuelMaintenanceEngine.fuelEfficiencyHealth('v1');
  assert.equal(res.ok, true);
  assert.equal(res.degradationDetected, false);
  assert.equal(res.status, 'baik');
});

test('fuelEfficiencyHealth() — {ok:false} kalau fuelEfficiency() gagal', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, { fuelEfficiency: () => ({ ok: false, reason: 'Data BBM kurang' }) });
  const res = ctx.FuelMaintenanceEngine.fuelEfficiencyHealth('v1');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Data BBM kurang');
});

test('fuelEfficiencyHealth() — {ok:false} kalau kendaraan tidak ditemukan', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, { fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, rpPerKm: 250 }) });
  const res = ctx.FuelMaintenanceEngine.fuelEfficiencyHealth('v9-tidak-ada');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Kendaraan tidak ditemukan');
});

// --- maintenanceRecommendation() ------------------------------------------

test('maintenanceRecommendation() — 1 baris rekomendasi per item overdue relevan BBM', () => {
  const items = [ITEM('Oli Mesin', 'lewat', -200), ITEM('Busi', 'segera', 500)];
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: SVC_OK(items),
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, rpPerKm: 250 }),
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceRecommendation('v1');
  assert.equal(res.ok, true);
  assert.equal(res.hasMaintenanceImpact, true);
  assert.equal(res.recommendations.length, 2);
  assert.match(res.recommendations[0], /Oli Mesin/);
  assert.match(res.recommendations[0], /lewat 200 km/);
});

test('maintenanceRecommendation() — saran tekanan ban kalau efisiensi turun TANPA item servis overdue relevan', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: SVC_OK([ITEM('Oli Mesin', 'aman', 3000)]),
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 30, rpPerKm: 300 }),
    _vehicleFuelEfficiencyDropCheck: () => ({
      trigger: true,
      thresholdPct: 20,
      drops: [{ vehicleId: 'v1', vehicleName: 'Vario 125', dropPct: 30, last: 28, avgPrev: 40 }],
    }),
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceRecommendation('v1');
  assert.equal(res.ok, true);
  assert.equal(res.hasMaintenanceImpact, false);
  assert.equal(res.degradationDetected, true);
  assert.equal(res.recommendations.length, 1);
  assert.match(res.recommendations[0], /tekanan ban/);
});

test('maintenanceRecommendation() — pesan "tidak ada indikasi" kalau semuanya aman & tidak ada degradasi', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: SVC_OK([ITEM('Oli Mesin', 'aman', 3000)]),
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, rpPerKm: 250 }),
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceRecommendation('v1');
  assert.equal(res.ok, true);
  assert.equal(res.recommendations.length, 1);
  assert.match(res.recommendations[0], /Tidak ada indikasi/);
});

test('maintenanceRecommendation() — {ok:false} diteruskan dari maintenanceImpact()', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {});
  const res = ctx.FuelMaintenanceEngine.maintenanceRecommendation('v9-tidak-ada');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Kendaraan tidak ditemukan');
});

// --- maintenanceRisk() -----------------------------------------------------

test('maintenanceRisk() — "tinggi" kalau ada item lewat relevan BBM DAN efisiensi turun', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: SVC_OK([ITEM('Oli Mesin', 'lewat', -200)]),
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 30, rpPerKm: 300 }),
    _vehicleFuelEfficiencyDropCheck: () => ({
      trigger: true,
      thresholdPct: 20,
      drops: [{ vehicleId: 'v1', vehicleName: 'Vario 125', dropPct: 30, last: 28, avgPrev: 40 }],
    }),
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceRisk('v1');
  assert.equal(res.ok, true);
  assert.equal(res.riskLevel, 'tinggi');
  assert.equal(res.overdueLewatCount, 1);
  assert.equal(res.degradationDetected, true);
});

test('maintenanceRisk() — "sedang" kalau HANYA salah satu sinyal (overdue ATAU degradasi)', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: SVC_OK([ITEM('Oli Mesin', 'lewat', -200)]),
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, rpPerKm: 250 }),
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceRisk('v1');
  assert.equal(res.ok, true);
  assert.equal(res.riskLevel, 'sedang');
});

test('maintenanceRisk() — "rendah" kalau tidak ada overdue relevan & tidak ada degradasi', () => {
  const D = { vehicles: [VEH] };
  const ctx = makeCtx(D, {
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: SVC_OK([ITEM('Oli Mesin', 'aman', 3000)]),
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, rpPerKm: 250 }),
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceRisk('v1');
  assert.equal(res.ok, true);
  assert.equal(res.riskLevel, 'rendah');
  assert.equal(res.overdueCount, 0);
  assert.equal(res.degradationDetected, false);
});

test('maintenanceRisk() — {ok:false} diteruskan dari maintenanceImpact()', () => {
  const ctx = makeCtx({ vehicles: [VEH] }, {});
  const res = ctx.FuelMaintenanceEngine.maintenanceRisk('v9-tidak-ada');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Kendaraan tidak ditemukan');
});
