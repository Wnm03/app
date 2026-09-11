'use strict';
// tests/findvehiclespec-modelid-followup-renderb-tirepressure.test.js
// Follow-up Sesi A2 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7, dicatat
// di SESSION-NOTE-sesi-a2-torsi-spec-modelid-resolve-v1648.md sbg "SENGAJA
// TIDAK disentuh" karena modules-render-b.js belum ter-upload saat itu).
// Sesi ini menyambungkan 2 titik baca findVehicleSpec() yang tersisa,
// begitu full checkout tersedia:
//   1. renderVehicleSpecCard() — modules/shared/modules-render-b.js (kartu
//      Spesifikasi Kendaraan)
//   2. _tirePressureRef() — modules/vehicle/fuel-maintenance-engine.js
//      (ditemukan lewat audit ulang titik panggil findVehicleSpec() di full
//      checkout; TIDAK disebut di session note A2 sebelumnya karena file
//      ini juga belum ter-upload saat itu)
// Keduanya dipastikan LIVE di bundle (terdaftar di scripts/build.js FILES),
// beda dgn modules/modules-render.js & modules/shop/modules-render.js
// (top-level/duplikat, TIDAK terdaftar di FILES -- orphan, sengaja
// diabaikan, pola sama seperti temuan modules/modals.js orphan di S1608).
//
// Pola: modelId diteruskan APA ADANYA (opsional) ke findVehicleSpec(),
// persis findTorsiDb()/findVehicleSpec() di sparepart-servis-b.js (Sesi
// A2) -- 0 perubahan perilaku utk pemanggil yang belum kirim modelId.

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const RENDER_B_FILE = path.join(__dirname, '..', 'modules', 'shared', 'modules-render-b.js');
const FUEL_ENGINE_FILE = 'modules/vehicle/fuel-maintenance-engine.js';

// --- Gate statis: renderVehicleSpecCard() wajib kirim veh.modelId --------

test('modules-render-b.js: renderVehicleSpecCard() memanggil findVehicleSpec(veh.name, veh.modelId) -- bukan 1-arg lagi', () => {
  const src = fs.readFileSync(RENDER_B_FILE, 'utf8');
  assert.match(
    src,
    /const spec=veh\?findVehicleSpec\(veh\.name,veh\.modelId\):null;/,
    'panggilan findVehicleSpec() di renderVehicleSpecCard() harus menyertakan veh.modelId (follow-up Sesi A2)',
  );
  // Pastikan tidak ada sisa pola lama (1-arg) di file yang sama.
  assert.doesNotMatch(
    src,
    /findVehicleSpec\(veh\.name\)(?!,)/,
    'tidak boleh ada lagi findVehicleSpec(veh.name) 1-arg tersisa di modules-render-b.js',
  );
});

// --- Functional: _tirePressureRef() meneruskan modelId -------------------

function makeEngineCtx(D, mocks = {}) {
  return loadSource(
    [FUEL_ENGINE_FILE],
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

const COST_OK = () => ({ ok: true, costPerKm: 250, kmPerLiter: 40, averageFuelPrice: 10000 });
const SVC_OK = (items) => () => ({ ok: true, vehicleId: 'v1', curKm: 5000, kmPerDay: 10, items });

test('fuel-maintenance-engine.js: _tirePressureRef() (via maintenanceImpact) meneruskan veh.modelId ke findVehicleSpec()', () => {
  const VEH = { id: 'v1', name: 'Vario 125 KZR', modelId: 'vario-125' };
  const D = { vehicles: [VEH] };
  const ban = { depan: { ukuran: '80/90-14', tekanan: '29 psi' }, belakang: { ukuran: '90/90-14', tekanan: '33 psi' } };
  const calls = [];
  const ctx = makeEngineCtx(D, {
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: SVC_OK([]),
    findVehicleSpec: (name, modelId) => {
      calls.push([name, modelId]);
      return name === 'Vario 125 KZR' ? { ban } : null;
    },
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceImpact('v1');
  assert.equal(res.ok, true);
  assert.deepEqual(res.tirePressureRef, ban);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ['Vario 125 KZR', 'vario-125'], 'modelId kendaraan harus ikut diteruskan ke findVehicleSpec()');
});

test('fuel-maintenance-engine.js: _tirePressureRef() tetap jalan (modelId undefined) utk kendaraan tanpa modelId -- 0 regresi', () => {
  const VEH = { id: 'v1', name: 'Vario 125' }; // tanpa field modelId, spt sebelum Sesi A1
  const D = { vehicles: [VEH] };
  const ban = { depan: { ukuran: 'x', tekanan: 'y' }, belakang: { ukuran: 'x', tekanan: 'y' } };
  const calls = [];
  const ctx = makeEngineCtx(D, {
    FuelCostAnalytics: { costPerKm: COST_OK },
    predictService: SVC_OK([]),
    findVehicleSpec: (name, modelId) => {
      calls.push([name, modelId]);
      return name === 'Vario 125' ? { ban } : null;
    },
  });
  const res = ctx.FuelMaintenanceEngine.maintenanceImpact('v1');
  assert.equal(res.ok, true);
  assert.deepEqual(res.tirePressureRef, ban);
  assert.deepEqual(calls[0], ['Vario 125', undefined]);
});

// --- Gate statis: pastikan orphan (bukan live di FILES) tidak ikut disentuh, dan tidak dianggap gap ---

test('modules/modules-render.js & modules/shop/modules-render.js: dikonfirmasi ORPHAN (tidak terdaftar di scripts/build.js FILES) -- bukan gap aktif', () => {
  const buildSrc = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build.js'), 'utf8');
  assert.doesNotMatch(buildSrc, /'modules\/modules-render\.js'/, 'modules/modules-render.js (top-level) tidak boleh terdaftar di FILES -- kalau ini gagal, file tsb sudah jadi live dan findVehicleSpec(veh.name) di dalamnya JADI gap aktif, perlu disambung modelId juga');
  assert.doesNotMatch(buildSrc, /'modules\/shop\/modules-render\.js'/, 'modules/shop/modules-render.js tidak boleh terdaftar di FILES -- kalau ini gagal, file tsb sudah jadi live dan findVehicleSpec(veh.name) di dalamnya JADI gap aktif, perlu disambung modelId juga');
});
