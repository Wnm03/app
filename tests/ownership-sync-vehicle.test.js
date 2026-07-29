'use strict';
// tests/ownership-sync-vehicle.test.js — cakupan Sesi 196 (Ownership Sync
// Vehicle/Car Notes/Fuel/Servis/Reminder/Dashboard/Report/AI). Reuse
// OwnershipEngine (Sesi 191) mengikuti pola PERSIS sesi sebelumnya (S192
// akun/keuangan, S193 asset/investasi, S194 shop, S195 dana kelolaan).
//
// Target: isVehicleOwnershipSelf() (helper baru, modules/vehicle/vehicle-core.js,
// reuse OwnershipEngine), VehicleIntelligence.fleetSummary() (Dashboard/AI),
// VehicleReminder._vehicles() dipakai serviceReminders()/taxReminders()/
// fuelReminders() (Reminder), VehicleTrendAPI._costLogs() dipakai
// monthlyCostTrend() (Fuel/Servis cost trend) — SEMUA cuma nambah 1 filter
// ownership di atas logic lama, 0 rumus diubah.
//
// RULE yang dites di sini:
//   - SELF (eksplisit atau default/tanpa field ownership) -> dihitung normal.
//   - INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY -> DIKECUALIKAN dari agregat
//     lintas-kendaraan (fleetSummary/reminder fleet-wide/cost trend
//     fleet-wide), TAPI TIDAK dari akses per-kendaraan langsung (vehicleId
//     eksplisit) & TIDAK dihapus dari D.vehicles/D.bbmLogs/D.servisLogs
//     (histori tetap tersimpan & tetap tampil apa adanya kalau kendaraan
//     itu diakses langsung, mis. Car Notes tab kendaraan terpilih).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    vehicles: [
      { id: 'v1', name: 'Vario 125' }, // tanpa ownership -> default SELF
      { id: 'v2', name: 'Beat Street', ownership: 'SELF' },
      { id: 'v3', name: 'Mobil Investor', ownership: 'INVESTOR' },
      { id: 'v4', name: 'Motor Titipan', ownership: 'customer' }, // lowercase, harus dinormalisasi
      { id: 'v5', name: 'Mobil Keluarga', ownership: 'FAMILY' },
    ],
    bbmLogs: [],
    servisLogs: [],
    kmLogs: [],
  };
}

// ------ isVehicleOwnershipSelf() (modules/vehicle/vehicle-core.js) ------

function makeCoreCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js'],
    { D },
    ['OwnershipEngine', 'isVehicleOwnershipSelf'],
  );
}

test('isVehicleOwnershipSelf() — kendaraan tanpa field ownership -> true (default SELF)', () => {
  const D = makeD();
  const ctx = makeCoreCtx(D);
  assert.equal(ctx.isVehicleOwnershipSelf('v1'), true);
});

test('isVehicleOwnershipSelf() — ownership eksplisit SELF -> true', () => {
  const D = makeD();
  const ctx = makeCoreCtx(D);
  assert.equal(ctx.isVehicleOwnershipSelf('v2'), true);
});

test('isVehicleOwnershipSelf() — INVESTOR/CUSTOMER(lowercase)/FAMILY -> false', () => {
  const D = makeD();
  const ctx = makeCoreCtx(D);
  assert.equal(ctx.isVehicleOwnershipSelf('v3'), false);
  assert.equal(ctx.isVehicleOwnershipSelf('v4'), false);
  assert.equal(ctx.isVehicleOwnershipSelf('v5'), false);
});

test('isVehicleOwnershipSelf() — vehicleId tidak ditemukan -> true (tidak exclude apa pun)', () => {
  const D = makeD();
  const ctx = makeCoreCtx(D);
  assert.equal(ctx.isVehicleOwnershipSelf('tidak-ada'), true);
});

test('isVehicleOwnershipSelf() — kalau OwnershipEngine tidak dimuat, fallback true (regresi lama tetap jalan)', () => {
  const D = makeD();
  const ctx = loadSource(['modules/vehicle/vehicle-core.js'], { D }, ['isVehicleOwnershipSelf']);
  assert.equal(ctx.isVehicleOwnershipSelf('v3'), true, 'tanpa engine, dianggap SELF (tidak exclude apa pun)');
});

// ------ Dashboard/AI: VehicleIntelligence.fleetSummary() ------

function makeIntelCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js', 'modules/vehicle/vehicle-intelligence.js'],
    { D },
    ['OwnershipEngine', 'isVehicleOwnershipSelf', 'VehicleIntelligence'],
  );
}

test('VehicleIntelligence.fleetSummary() — HANYA kendaraan ownership SELF masuk hitungan armada', () => {
  const D = makeD();
  const ctx = makeIntelCtx(D);
  const fleet = ctx.VehicleIntelligence.fleetSummary();
  assert.equal(fleet.totalVehicles, 2, 'v1 (default SELF) + v2 (SELF eksplisit) saja, v3/v4/v5 dikecualikan');
  const names = Array.from(fleet.vehicles.map((v) => v.name)).sort();
  assert.deepEqual(names, ['Beat Street', 'Vario 125']);
});

test('VehicleIntelligence.vehicleOverview(vehicleId) — kendaraan non-SELF TETAP bisa diakses langsung by id', () => {
  const D = makeD();
  const ctx = makeIntelCtx(D);
  const ov = ctx.VehicleIntelligence.vehicleOverview('v3');
  assert.equal(ov.ok, true, 'akses langsung by id (mis. Car Notes tab kendaraan terpilih) TIDAK terpengaruh exclude fleet-wide');
  assert.equal(ov.name, 'Mobil Investor');
});

test('VehicleIntelligence.fleetSummary() — kalau isVehicleOwnershipSelf belum ada, fallback hitung semua kendaraan (regresi lama tetap jalan)', () => {
  const D = makeD();
  const ctx = loadSource(['modules/vehicle/vehicle-intelligence.js'], { D }, ['VehicleIntelligence']);
  const fleet = ctx.VehicleIntelligence.fleetSummary();
  assert.equal(fleet.totalVehicles, 5);
});

// ------ Reminder: VehicleReminder._vehicles() dipakai taxReminders()/serviceReminders()/fuelReminders() ------

function makeReminderCtx(D, extra) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js', 'modules/vehicle/vehicle-reminder.js'],
    Object.assign({ D }, extra),
    ['OwnershipEngine', 'isVehicleOwnershipSelf', 'VehicleReminder'],
  );
}

test('VehicleReminder.taxReminders() fleet-wide — kendaraan non-SELF dikecualikan', () => {
  const D = makeD();
  const today = new Date();
  const lewat = new Date(today.getTime() - 5 * 86400000).toISOString().split('T')[0];
  D.vehicles.forEach((v) => { v.stnkTahunan = lewat; });
  const VEHTAX_ITEMS = { stnkTahunan: { label: '📄 STNK Tahunan', tglKey: 'stnkTahunan' } };
  const daysUntilDate = (s) => Math.ceil((new Date(s) - new Date(new Date().toDateString())) / 86400000);
  const dateStatusBadge = (s) => (daysUntilDate(s) < 0 ? { col: 'red', label: 'Lewat' } : { col: 'orange', label: 'Segera' });
  const ctx = makeReminderCtx(D, { VEHTAX_ITEMS, daysUntilDate, dateStatusBadge });
  const out = ctx.VehicleReminder.taxReminders();
  const vehicleIds = Array.from(out.map((r) => r.vehicleId)).sort();
  assert.deepEqual(vehicleIds, ['v1', 'v2'], 'hanya v1/v2 (SELF) yang jadi reminder pajak fleet-wide, v3/v4/v5 dikecualikan');
});

test('VehicleReminder.taxReminders(vehicleId) — kendaraan non-SELF TETAP kena reminder kalau diminta langsung by id', () => {
  const D = makeD();
  const today = new Date();
  const lewat = new Date(today.getTime() - 5 * 86400000).toISOString().split('T')[0];
  D.vehicles.forEach((v) => { v.stnkTahunan = lewat; });
  const VEHTAX_ITEMS = { stnkTahunan: { label: '📄 STNK Tahunan', tglKey: 'stnkTahunan' } };
  const daysUntilDate = (s) => Math.ceil((new Date(s) - new Date(new Date().toDateString())) / 86400000);
  const dateStatusBadge = (s) => (daysUntilDate(s) < 0 ? { col: 'red', label: 'Lewat' } : { col: 'orange', label: 'Segera' });
  const ctx = makeReminderCtx(D, { VEHTAX_ITEMS, daysUntilDate, dateStatusBadge });
  const out = ctx.VehicleReminder.taxReminders('v3');
  assert.equal(out.length, 1, 'diminta langsung by id (vehicleId eksplisit) tetap dapat reminder, tidak ikut exclude fleet-wide');
  assert.equal(out[0].vehicleId, 'v3');
});

test('VehicleReminder._vehicles() — kalau isVehicleOwnershipSelf belum ada, fallback hitung semua kendaraan (regresi lama tetap jalan)', () => {
  const D = makeD();
  const today = new Date();
  const lewat = new Date(today.getTime() - 5 * 86400000).toISOString().split('T')[0];
  D.vehicles.forEach((v) => { v.stnkTahunan = lewat; });
  const VEHTAX_ITEMS = { stnkTahunan: { label: '📄 STNK Tahunan', tglKey: 'stnkTahunan' } };
  const daysUntilDate = (s) => Math.ceil((new Date(s) - new Date(new Date().toDateString())) / 86400000);
  const dateStatusBadge = (s) => (daysUntilDate(s) < 0 ? { col: 'red', label: 'Lewat' } : { col: 'orange', label: 'Segera' });
  const ctx = loadSource(
    ['modules/vehicle/vehicle-reminder.js'],
    { D, VEHTAX_ITEMS, daysUntilDate, dateStatusBadge },
    ['VehicleReminder'],
  );
  const out = ctx.VehicleReminder.taxReminders();
  assert.equal(out.length, 5, 'tanpa isVehicleOwnershipSelf, semua 5 kendaraan tetap kehitung (0 regresi)');
});

// ------ Fuel/Servis cost trend: VehicleTrendAPI._costLogs() dipakai monthlyCostTrend() ------

function makeTrendCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js', 'modules/vehicle/vehicle-trend-api.js'],
    { D, MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] },
    ['OwnershipEngine', 'isVehicleOwnershipSelf', 'VehicleTrendAPI'],
  );
}

test('VehicleTrendAPI.monthlyCostTrend() fleet-wide — biaya kendaraan non-SELF dikecualikan dari total', () => {
  const D = makeD();
  const today = new Date().toISOString().split('T')[0];
  D.bbmLogs = [
    { vehicleId: 'v1', cost: 50000, date: today }, // SELF -> masuk
    { vehicleId: 'v3', cost: 999999, date: today }, // INVESTOR -> harus dikecualikan
  ];
  D.servisLogs = [
    { vehicleId: 'v2', cost: 100000, date: today }, // SELF -> masuk
    { vehicleId: 'v5', cost: 888888, date: today }, // FAMILY -> harus dikecualikan
  ];
  const ctx = makeTrendCtx(D);
  const trend = ctx.VehicleTrendAPI.monthlyCostTrend({ type: 'all', months: 1 });
  assert.equal(trend.total, 150000, 'HANYA total BBM v1 (50rb) + servis v2 (100rb), noise v3/v5 dikecualikan');
});

test('VehicleTrendAPI.monthlyCostTrend(vehicleId) — kendaraan non-SELF TETAP dihitung penuh kalau diminta langsung by id', () => {
  const D = makeD();
  const today = new Date().toISOString().split('T')[0];
  D.bbmLogs = [{ vehicleId: 'v3', cost: 999999, date: today }];
  const ctx = makeTrendCtx(D);
  const trend = ctx.VehicleTrendAPI.monthlyCostTrend({ vehicleId: 'v3', type: 'fuel', months: 1 });
  assert.equal(trend.total, 999999, 'akses langsung by id (mis. tab Fuel kendaraan itu) TIDAK terpengaruh exclude fleet-wide');
});

test('VehicleTrendAPI._costLogs() — kalau isVehicleOwnershipSelf belum ada, fallback hitung semua log (regresi lama tetap jalan)', () => {
  const D = makeD();
  const today = new Date().toISOString().split('T')[0];
  D.bbmLogs = [
    { vehicleId: 'v1', cost: 50000, date: today },
    { vehicleId: 'v3', cost: 999999, date: today },
  ];
  const ctx = loadSource(
    ['modules/vehicle/vehicle-trend-api.js'],
    { D, MONTHS: [] },
    ['VehicleTrendAPI'],
  );
  const trend = ctx.VehicleTrendAPI.monthlyCostTrend({ type: 'fuel', months: 1 });
  assert.equal(trend.total, 1049999, 'tanpa isVehicleOwnershipSelf, semua log tetap kehitung (0 regresi)');
});

// D.vehicles/D.bbmLogs/D.servisLogs — tidak dihapus/dimutasi

test('D.vehicles/D.bbmLogs/D.servisLogs — tidak dihapus/dimutasi oleh filter ownership manapun di atas', () => {
  const D = makeD();
  const today = new Date().toISOString().split('T')[0];
  D.bbmLogs = [{ vehicleId: 'v3', cost: 999999, date: today }];
  D.servisLogs = [{ vehicleId: 'v5', cost: 888888, date: today }];
  const ctx = makeTrendCtx(D);
  ctx.VehicleTrendAPI.monthlyCostTrend({ type: 'all', months: 1 });
  assert.equal(D.vehicles.length, 5, 'semua 5 kendaraan (termasuk non-SELF) tetap tersimpan di D.vehicles');
  assert.equal(D.bbmLogs.length, 1);
  assert.equal(D.servisLogs.length, 1);
});
