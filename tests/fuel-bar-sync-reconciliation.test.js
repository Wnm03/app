'use strict';
// SESI FUEL-BAR-SYNC — tes jalur produksi untuk rekonsiliasi baseline BBM.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadSource } = require('./helpers/loadSource');

function setup({ km = 1000, efficiency = 40, logs = [], fuelState, manualFuelCorrection } = {}) {
  let currentKm = km;
  let currentEfficiency = efficiency;
  const vehicle = {
    id: 'v1', name: 'Motor',
    fuelTankProfile: { tankCapacityLiter: 5.5, fuelBarCount: 8, reserveLiter: 0.5, tankShape: 'linear' },
    ...(fuelState ? { fuelState } : {}),
    ...(manualFuelCorrection ? { manualFuelCorrection } : {}),
  };
  const D = { vehicles: [vehicle], bbmLogs: logs.slice(), transactions: [], accounts: [] };
  const ctx = loadSource([
    'modules/vehicle/fuel-storage.js',
    'modules/vehicle/fuel-tank-profile.js',
    'modules/vehicle/fuel-gauge-engine.js',
    'modules/vehicle/fuel-state-estimator.js',
    'modules/finance/tx-bbm.js',
  ], {
    D,
    uid: (() => { let n = 0; return () => `bbm-${++n}`; })(),
    getVehicleKm: () => currentKm,
    fuelEfficiency: () => currentEfficiency ? ({ ok: true, kmPerLiter: currentEfficiency }) : ({ ok: false, estimationLimited: true }),
  }, ['FuelStateEstimator', 'recordBbmLog', 'reconcileFuelStateFromLogs']);
  ctx.D = D;
  return { ctx, D, vehicle, setKm: n => { currentKm = n; }, setEfficiency: n => { currentEfficiency = n; } };
}
function add(ctx, values) {
  const opts = { vehicleId: 'v1', date: '2026-10-01', km: 1000, liter: 1, cost: 15000, fullTank: false, ...values };
  const wantedId = opts.id; delete opts.id;
  const result = ctx.recordBbmLog(opts);
  if (wantedId && result && result.bbmId) { const log = ctx.D.bbmLogs.find(x => x.id === result.bbmId); if (log) log.id = wantedId; }
  return result;
}

test('alur normal full → full → parsial → KM bertambah memakai estimator produksi', () => {
  const x = setup({ km: 1000 });
  add(x.ctx, { date: '2026-01-01', km: 1000, liter: 5.5, fullTank: true });
  x.setKm(1160);
  add(x.ctx, { date: '2026-02-01', km: 1160, liter: 5.5, fullTank: true });
  x.setKm(1240);
  add(x.ctx, { date: '2026-03-01', km: 1240, liter: 1.5, fullTank: false });
  let est = x.ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.liter, 5);
  x.setKm(1320);
  est = x.ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.liter, 3);
});

test('B1 backdate full memakai KM log, bukan odometer saat input', () => {
  const x = setup({ km: 1400, logs: [
    { id: 'f1', vehicleId: 'v1', date: '2026-01-01', km: 1000, liter: 5.5, fullTank: true },
    { id: 'f2', vehicleId: 'v1', date: '2026-02-01', km: 1160, liter: 5.5, fullTank: true },
  ] });
  add(x.ctx, { date: '2026-03-01', km: 1240, liter: 5.5, fullTank: true });
  assert.equal(x.vehicle.fuelState.referenceKm, 1240);
  assert.equal(x.ctx.FuelStateEstimator.estimateCurrentLiter('v1').liter, 1.5);
});

test('B2 estimationLimited tidak memajukan baseline; parsial dihitung saat km/L tersedia', () => {
  const x = setup({ km: 1000, efficiency: 0 });
  add(x.ctx, { date: '2026-01-01', km: 1000, liter: 5.5, fullTank: true });
  x.setKm(1120);
  add(x.ctx, { date: '2026-02-01', km: 1120, liter: 1, fullTank: false });
  assert.equal(x.vehicle.fuelState.referenceKm, 1000);
  assert.equal(x.ctx.FuelStateEstimator.estimateCurrentLiter('v1').estimationLimited, true);
  x.setEfficiency(40);
  assert.equal(x.ctx.FuelStateEstimator.estimateCurrentLiter('v1').liter, 3.5);
});

test('B3 parsial di KM baseline dan dua parsial KM sama masing-masing dihitung sekali', () => {
  const manual = { currentFuelLiter: 2, currentFuelBar: 3, referenceKm: 1000, correctedAt: '2026-01-01T00:00:00.000Z', estimatedSource: 'manual-bar-correction', confidenceScore: 100, appliedBbmIds: [] };
  const x = setup({ km: 1000, fuelState: manual, manualFuelCorrection: manual });
  add(x.ctx, { id: 'p1', date: '2026-01-02', km: 1000, liter: 1.5 });
  add(x.ctx, { id: 'p2', date: '2026-01-03', km: 1000, liter: 0.5 });
  const est = x.ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.liter, 4);
  assert.equal(est.partialFillsCounted, 2);
  assert.equal(x.ctx.FuelStateEstimator.estimateCurrentLiter('v1').liter, 4);
});

test('B4 edit parsial dan ubah full menjadi parsial membangun ulang hasil dari log', () => {
  const x = setup({ km: 1200 });
  add(x.ctx, { id: 'f1', date: '2026-01-01', km: 1000, liter: 5.5, fullTank: true });
  add(x.ctx, { id: 'p1', date: '2026-02-01', km: 1100, liter: 3, fullTank: false });
  assert.equal(x.ctx.FuelStateEstimator.estimateCurrentLiter('v1').liter, 3.5);
  x.ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-02-01', km: 1100, liter: 1, cost: 15000, fullTank: false, existingBbmId: 'p1' });
  assert.equal(x.ctx.FuelStateEstimator.estimateCurrentLiter('v1').liter, 1.5);
  x.ctx.recordBbmLog({ vehicleId: 'v1', date: '2026-01-01', km: 1000, liter: 5.5, cost: 82500, fullTank: false, existingBbmId: 'f1' });
  assert.equal(x.vehicle.fuelState, undefined);
});

test('B4 BBM.del memicu rekonsiliasi dan mempertahankan koreksi manual', async () => {
  const manual = { currentFuelLiter: 2, currentFuelBar: 3, referenceKm: 1000, correctedAt: '2026-01-01T00:00:00.000Z', estimatedSource: 'manual-bar-correction', confidenceScore: 100, appliedBbmIds: [] };
  const x = setup({ km: 1000, fuelState: manual, manualFuelCorrection: manual, logs: [{ id: 'p1', vehicleId: 'v1', date: '2026-01-02', km: 1000, liter: 1, fullTank: false }] });
  const car = loadSource(['modules/vehicle/fuel-storage.js','modules/vehicle/fuel-tank-profile.js','modules/vehicle/fuel-gauge-engine.js','modules/vehicle/fuel-state-estimator.js','modules/finance/tx-bbm.js','car-notes.js'], {
    D: x.D, getVehicleKm: () => 1000, fuelEfficiency: () => ({ok:true,kmPerLiter:40}), uid: () => 'new-id', askConfirm: async () => true, FinanceTxSOT: { removeById() {} },
    save() {}, renderCnTab() {}, renderDashboard() {}, renderKeuangan() {}, toast() {},
    closeModal() {},
  });
  await car.BBM.del('p1');
  assert.equal(x.D.bbmLogs.length, 0);
  assert.equal(x.vehicle.fuelState.currentFuelLiter, 2);
  assert.equal(x.vehicle.manualFuelCorrection.currentFuelLiter, 2);
});


test('B4 cascade hapus transaksi BBM menghapus log dan merekonsiliasi baseline', () => {
  const x = setup({ km: 1200, logs: [
    { id: 'f1', vehicleId: 'v1', date: '2026-01-01', km: 1000, liter: 5.5, fullTank: true },
    { id: 'f2', vehicleId: 'v1', date: '2026-02-01', km: 1100, liter: 5.5, fullTank: true },
  ] });
  x.ctx.reconcileFuelStateFromLogs('v1');
  const cascade = loadSource([
    'modules/vehicle/fuel-storage.js','modules/vehicle/fuel-tank-profile.js','modules/vehicle/fuel-gauge-engine.js',
    'modules/vehicle/fuel-state-estimator.js','modules/finance/tx-bbm.js','modules/finance/tx-list-cashflow.js',
  ], { D: x.D, getVehicleKm: () => 1200, fuelEfficiency: () => ({ok:true,kmPerLiter:40}), toast() {}, renderStockList() {} }, ['runTxDeleteCascades','FuelStateEstimator']);
  cascade.runTxDeleteCascades({ id: 'tx2', bbmLinkId: 'f2' });
  assert.equal(x.D.bbmLogs.some(b => b.id === 'f2'), false);
  assert.equal(x.vehicle.fuelState.referenceKm, 1000);
  assert.equal(cascade.FuelStateEstimator.estimateCurrentLiter('v1').liter, 0.5);
});


test('koreksi manual legacy dipertahankan saat full baru menimpa baseline lalu log full dihapus', () => {
  const legacy = { currentFuelLiter: 2, currentFuelBar: 3, referenceKm: 900, correctedAt: '2026-01-01T00:00:00.000Z', estimatedSource: 'manual-bar-correction', confidenceScore: 100 };
  const x = setup({ km: 1100, fuelState: legacy });
  add(x.ctx, { date: '2026-02-01', km: 1000, liter: 5.5, fullTank: true });
  assert.equal(x.vehicle.fuelState.estimatedSource, 'auto-bbm-log-full');
  assert.equal(x.vehicle.manualFuelCorrection.currentFuelLiter, 2);
  x.D.bbmLogs = [];
  x.ctx.reconcileFuelStateFromLogs('v1');
  assert.equal(x.vehicle.fuelState.currentFuelLiter, 2);
  assert.equal(x.vehicle.fuelState.estimatedSource, 'manual-bar-correction');
});

test('regresi fuelState lama tanpa referenceKm tetap dibaca sebagai estimasi terbatas', () => {
  const x = setup({ km: 1300, fuelState: { currentFuelLiter: 2.25, estimatedSource: 'manual-bar-correction' } });
  const est = x.ctx.FuelStateEstimator.estimateCurrentLiter('v1');
  assert.equal(est.ok, true);
  assert.equal(est.liter, 2.25);
  assert.equal(est.estimationLimited, true);
});

test('B5 CSV importer tidak menganggap semua baris sebagai isi penuh', () => {
  const src = fs.readFileSync('modules/shared/backup-restore.js', 'utf8');
  assert.match(src, /const idxFullTank=header\.findIndex/);
  assert.match(src, /const fullTankCsv=idxFullTank>=0/);
  assert.match(src, /fullTank:fullTankCsv/);
  assert.match(src, /importedBbmVehicleIds\.forEach\(id=>reconcileFuelStateFromLogs\(id\)\)/);
});

test('regresi: fuelState lama tanpa field baru tetap bisa diestimasi; manual tidak dihapus', () => {
  const legacy = { currentFuelLiter: 3, referenceKm: 1000, estimatedSource: 'manual-bar-correction', confidenceScore: 100 };
  const x = setup({ km: 1040, fuelState: legacy });
  assert.equal(x.ctx.FuelStateEstimator.estimateCurrentLiter('v1').liter, 2);
  add(x.ctx, { date: '2026-01-02', km: 1040, liter: 1 });
  assert.equal(x.vehicle.manualFuelCorrection.currentFuelLiter, 3);
  assert.equal(x.vehicle.fuelState.estimatedSource, 'manual-bar-correction');
});
